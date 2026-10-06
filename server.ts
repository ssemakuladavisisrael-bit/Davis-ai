import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '10mb' }));

const DEFAULT_SYSTEM_INSTRUCTION = `You are Davis AI, a versatile, highly intelligent, friendly, and honest conversational assistant.
Your goal is to assist users across a broad spectrum of tasks:
- Learning & Academics: Break down complex concepts with clear explanations, structured points, and relatable analogies.
- Writing & Communication: Draft emails, essays, stories, reports, and polish tone and grammar.
- Programming & Engineering: Provide clean, bug-free, well-commented code snippets with concise architectural explanations, debugging tips, and best practices.
- Brainstorming & Problem Solving: Generate creative, diverse, and practical ideas.
- Everyday Questions: Offer sensible, thoughtful, and pragmatic guidance.

Guidelines:
1. Always format responses using clean, structured Markdown (headers, bullet lists, numbered steps, bold highlights, blockquotes, and code blocks with explicit language tags).
2. Be honest, objective, and transparent. If you don't know an answer or if something is uncertain or speculative, state it candidly.
3. Keep your tone encouraging, professional, and friendly.
4. If asked about your identity, state that you are Davis AI, powered by Google Gemini.`;

const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Instant response speed (~0.8s), highly reliable for everyday chats and coding.',
    isFast: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Deep reasoning model for complex STEM, math, and advanced logic.',
    isFast: false,
  },
];

// Helper to extract a friendly error message from Gemini API errors
function formatGeminiError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  let msg = error.message || String(error);

  try {
    if (typeof msg === 'string' && (msg.includes('{"error"') || msg.startsWith('{'))) {
      const parsed = JSON.parse(msg);
      if (parsed.error?.message) {
        msg = parsed.error.message;
        if (typeof msg === 'string' && msg.includes('{"error"')) {
          const inner = JSON.parse(msg);
          if (inner.error?.message) msg = inner.error.message;
        }
      }
    }
  } catch {}

  if (typeof msg === 'string') {
    if (msg.includes('503') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable')) {
      return 'Davis AI is currently experiencing high demand. Automatic failover active.';
    }
    if (msg.toLowerCase().includes('api_key') || msg.toLowerCase().includes('api key')) {
      return 'Invalid or missing Gemini API key. Please check your key in the AI Studio Secrets panel.';
    }
  }

  return typeof msg === 'string' ? msg : 'Failed to communicate with Davis AI.';
}

// Format and sanitize messages for Gemini API
function formatContentsForGemini(rawMessages: Array<{ role: string; content: string }>) {
  const sanitized: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  for (const m of rawMessages) {
    if (!m || typeof m.content !== 'string' || !m.content.trim()) continue;
    const role: 'user' | 'model' = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';

    // If consecutive messages have the same role, combine their text
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1].parts[0].text += `\n\n${m.content.trim()}`;
    } else {
      sanitized.push({
        role,
        parts: [{ text: m.content.trim() }],
      });
    }
  }

  // Ensure conversation starts with a user message
  while (sanitized.length > 0 && sanitized[0].role !== 'user') {
    sanitized.shift();
  }

  return sanitized;
}

// Health and configuration check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.1-flash-lite',
    appName: 'Davis AI',
    availableModels: AVAILABLE_MODELS,
  });
});

// Streaming chat endpoint
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your environment variables or Secrets panel.',
    });
    return;
  }

  const { messages, systemInstruction, temperature, model: requestedModel } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required and cannot be empty.' });
    return;
  }

  const formattedContents = formatContentsForGemini(messages);

  if (formattedContents.length === 0) {
    res.status(400).json({ error: 'Conversation must contain at least one valid user message.' });
    return;
  }

  // Set SSE headers for real-time streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Prefer gemini-3.1-flash-lite for blazing fast speed, or requested model with auto-fallback
  const primaryModel = requestedModel === 'gemini-3.8-flash' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
  const fallbackModel = primaryModel === 'gemini-3.8-flash' ? 'gemini-3.1-flash-lite' : 'gemini-flash-latest';

  let streamedAnyChunk = false;

  const tryStream = async (modelToUse: string): Promise<boolean> => {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: modelToUse,
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          streamedAnyChunk = true;
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return true;
    } catch (err: any) {
      console.warn(`Model ${modelToUse} failed:`, err?.message || err);
      // If we already sent chunks, we cannot silently switch models
      if (streamedAnyChunk) {
        const errorMsg = formatGeminiError(err);
        res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        res.end();
        return true;
      }
      return false;
    }
  };

  try {
    // Attempt 1 with primary model
    const success = await tryStream(primaryModel);
    if (success) return;

    // Attempt 2 with fallback model
    console.log(`Failing over to resilient model ${fallbackModel}...`);
    const fallbackSuccess = await tryStream(fallbackModel);
    if (fallbackSuccess) return;

    // If both failed before streaming any chunk
    res.write(`data: ${JSON.stringify({ error: 'Davis AI is temporarily experiencing high demand across model clusters. Please try again in a moment.' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Unhandled chat stream error:', error);
    const friendlyMessage = formatGeminiError(error);
    res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
    res.end();
  }
});

// Non-streaming chat fallback
app.post('/api/chat/sync', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your environment variables or Secrets panel.',
    });
    return;
  }

  const { messages, systemInstruction, temperature, model: requestedModel } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required.' });
    return;
  }

  const formattedContents = formatContentsForGemini(messages);

  if (formattedContents.length === 0) {
    res.status(400).json({ error: 'No valid user messages found.' });
    return;
  }

  const primaryModel = requestedModel === 'gemini-3.8-flash' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
  const fallbackModel = 'gemini-3.1-flash-lite';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        },
      });
    } catch (primaryErr) {
      console.warn(`Sync primary model ${primaryModel} failed, trying ${fallbackModel}...`);
      response = await ai.models.generateContent({
        model: fallbackModel,
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        },
      });
    }

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Sync generation error:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// AI video planning endpoint. It creates a structured storyboard; the browser renderer turns it into a video.
app.post('/api/video/plan', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { topic, audience, duration, style } = req.body || {};
  if (!topic || typeof topic !== 'string') {
    res.status(400).json({ error: 'A video topic is required.' });
    return;
  }

  const requestedDuration = Math.min(180, Math.max(60, Number(duration) || 90));
  const sceneCount = requestedDuration <= 90 ? 6 : 8;

  const prompt = `Create a concise educational video storyboard.
Topic: ${topic}
Audience: ${audience || 'general audience'}
Target duration: ${requestedDuration} seconds
Style: ${style || 'Educational and engaging'}

Return ONLY valid JSON with this exact shape:
{
  "title": "short video title",
  "hook": "one-sentence opening hook",
  "scenes": [
    {
      "title": "scene title",
      "narration": "short spoken narration",
      "visual": "short description of what should appear on screen",
      "seconds": 10
    }
  ],
  "closing": "short closing message"
}

Use exactly ${sceneCount} scenes. Their seconds values should add up to approximately ${requestedDuration - 3} seconds. Keep narration natural and short enough to fit each scene. Make the visual descriptions clear enough for a future AI image/video generator. Do not use markdown fences.`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: 'You are Davis AI Video Director. Return strict JSON only.',
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const raw = (response.text || '').trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const plan = JSON.parse(cleaned);

    if (!plan.title || !Array.isArray(plan.scenes) || plan.scenes.length === 0) {
      throw new Error('The AI returned an incomplete storyboard.');
    }

    res.json(plan);
  } catch (error: any) {
    console.error('Video planning error:', error);
    res.status(500).json({ error: error?.message || 'Could not create the video storyboard.' });
  }
});


/**
 * Generate a photorealistic AI video clip with Google's Veo 3.1.
 * Veo returns an asynchronous operation, so the server polls it and keeps
 * the Gemini API key private. The client receives the finished MP4 as base64.
 */
app.post('/api/video/realistic', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { prompt, aspectRatio, resolution } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'A realistic video prompt is required.' });
    return;
  }

  const safePrompt = prompt.trim().slice(0, 7000);
  const safeAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
  const safeResolution = resolution === '1080p' ? '1080p' : '720p';

  try {
    const startResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: safePrompt }],
          parameters: {
            aspectRatio: safeAspectRatio,
            resolution: safeResolution,
            numberOfVideos: 1,
          },
        }),
      },
    );

    const startData = await startResponse.json();
    if (!startResponse.ok || !startData.name) {
      throw new Error(startData?.error?.message || 'Veo could not start video generation.');
    }

    const operationName = startData.name;
    let operationData: any = null;

    // Veo generation is asynchronous. Poll for up to 5 minutes.
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const statusResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
        { headers: { 'x-goog-api-key': apiKey } },
      );

      operationData = await statusResponse.json();

      if (operationData?.done) break;
    }

    if (!operationData?.done) {
      res.status(202).json({
        status: 'processing',
        message: 'The realistic video is still being generated. Please try again shortly.',
        operationName,
      });
      return;
    }

    if (operationData.error) {
      throw new Error(operationData.error.message || 'Veo video generation failed.');
    }

    const generated =
      operationData?.response?.generateVideoResponse?.generatedSamples?.[0]?.video ||
      operationData?.response?.generatedVideos?.[0]?.video;

    if (!generated?.uri) {
      throw new Error('Veo completed without returning a video file.');
    }

    const videoResponse = await fetch(generated.uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoResponse.ok) {
      throw new Error('The generated video could not be downloaded from Veo.');
    }

    const buffer = Buffer.from(await videoResponse.arrayBuffer());

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Content-Disposition', 'inline; filename="davis-ai-realistic.mp4"');
    res.send(buffer);
  } catch (error: any) {
    console.error('Realistic video generation error:', error);
    res.status(500).json({
      error: error?.message || 'Could not generate the realistic AI video.',
    });
  }
});


/**
 * Generate a longer realistic video by using Veo's native video-extension
 * capability. Veo generates an initial clip, then extends that Veo clip in
 * roughly 7-second increments until the requested duration is reached.
 */
app.post('/api/video/long', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { prompt, duration, aspectRatio, resolution } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'A video prompt is required.' });
    return;
  }

  const target = Math.min(120, Math.max(8, Number(duration) || 60));
  const ratio = aspectRatio === '9:16' ? '9:16' : '16:9';
  const quality = resolution === '1080p' ? '1080p' : '720p';

  const startJob = async (videoBase64?: string) => {
    const body = videoBase64
      ? {
          instances: [{ prompt: prompt.slice(0, 7000), video: { inlineData: { mimeType: 'video/mp4', data: videoBase64 } } }],
          parameters: { resolution: '720p', numberOfVideos: 1 },
        }
      : {
          instances: [{ prompt: prompt.slice(0, 7000) }],
          parameters: { aspectRatio: ratio, resolution: quality, numberOfVideos: 1 },
        };

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.name) throw new Error(data?.error?.message || 'Veo could not start the video job.');
    return data.name;
  };

  const waitForJob = async (name: string) => {
    for (let attempt = 0; attempt < 36; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/' + name, { headers: { 'x-goog-api-key': apiKey } });
      const data = await response.json();
      if (data.done) {
        if (data.error) throw new Error(data.error.message || 'Veo video generation failed.');
        const video = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video || data?.response?.generatedVideos?.[0]?.video;
        if (!video?.uri) throw new Error('Veo completed without a video URI.');
        const fileResponse = await fetch(video.uri, { headers: { 'x-goog-api-key': apiKey } });
        if (!fileResponse.ok) throw new Error('Generated video could not be downloaded.');
        return Buffer.from(await fileResponse.arrayBuffer());
      }
    }
    throw new Error('Video generation timed out. Please try again.');
  };

  try {
    let current = await waitForJob(await startJob());
    let seconds = 8;

    // Veo extension adds about 7 seconds per operation and supports up to 20 extensions.
    while (seconds < target) {
      current = await waitForJob(await startJob(current.toString('base64')));
      seconds += 7;
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', current.length.toString());
    res.setHeader('Content-Disposition', 'inline; filename="davis-ai-realistic-long.mp4"');
    res.send(current);
  } catch (error: any) {
    console.error('Long realistic video generation error:', error);
    res.status(500).json({ error: error?.message || 'Could not generate the longer realistic video.' });
  }
});

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Davis AI server listening on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
