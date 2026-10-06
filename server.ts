import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';

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
- Video & Multimedia Creation: When the user asks to create or script a video, provide a captivating title, opening hook, and structured scenes with [Visual Direction] and spoken [Narration]. Remind them that they can render and download the actual video with AI voiceover using the "Create Video" Studio button!
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

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'You are Davis AI Video Director. Return strict JSON only without markdown code fences.',
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });
    } catch (primaryErr) {
      console.warn('Video plan primary model failed, falling back to gemini-flash-latest:', primaryErr);
      response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'You are Davis AI Video Director. Return strict JSON only without markdown code fences.',
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      });
    }

    const raw = (response.text || '').trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const plan = JSON.parse(cleaned);

    if (!plan.title || !Array.isArray(plan.scenes) || plan.scenes.length === 0) {
      throw new Error('The AI returned an incomplete storyboard.');
    }

    res.json(plan);
  } catch (error: any) {
    console.error('Video planning error:', error);
    res.status(500).json({ error: formatGeminiError(error) });
  }
});

// AI Video Narration (TTS) endpoint
app.post('/api/video/tts', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { text, voiceName } = req.body || {};
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text is required for TTS synthesis.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ role: 'user', parts: [{ text: text.slice(0, 600) }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio data received from Gemini TTS.');
    }

    res.json({ audioBase64: base64Audio, mimeType: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'audio/wav' });
  } catch (err: any) {
    console.error('Video TTS error:', err);
    res.status(500).json({ error: err?.message || 'Failed to synthesize narration audio.' });
  }
});

// Google Veo AI Video generation (Start operation)
app.post('/api/video/veo', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { prompt, resolution, aspectRatio } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt is required for Veo generation.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution === '1080p' ? '1080p' : '720p',
        aspectRatio: aspectRatio === '9:16' ? '9:16' : '16:9',
      },
    });

    res.json({ operationName: operation.name });
  } catch (err: any) {
    console.error('Veo video generation error:', err);
    res.status(500).json({ error: err?.message || 'Failed to start Veo video generation.' });
  }
});

// Google Veo AI Video generation (Poll status)
app.post('/api/video/veo/status', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { operationName } = req.body || {};
  if (!operationName) {
    res.status(400).json({ error: 'operationName is required.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: Boolean(updated.done), error: updated.error });
  } catch (err: any) {
    console.error('Veo video status error:', err);
    res.status(500).json({ error: err?.message || 'Failed to check Veo operation status.' });
  }
});

// Google Veo AI Video generation (Download video)
app.post('/api/video/veo/download', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const { operationName } = req.body || {};
  if (!operationName) {
    res.status(400).json({ error: 'operationName is required.' });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      res.status(404).json({ error: 'Video URI not found or video generation incomplete.' });
      return;
    }

    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });
    res.setHeader('Content-Type', 'video/mp4');
    const arrayBuffer = await videoRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    console.error('Veo video download error:', err);
    res.status(500).json({ error: err?.message || 'Failed to download Veo video.' });
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
