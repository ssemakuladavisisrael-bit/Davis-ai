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

// Health and configuration check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: 'gemini-3.8-flash',
    appName: 'Davis AI',
  });
});

// Helper to extract a friendly error message from Gemini API errors
function formatGeminiError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  let msg = error.message || String(error);

  try {
    // If msg is JSON or contains JSON error object, extract message
    if (typeof msg === 'string' && (msg.includes('{"error"') || msg.startsWith('{'))) {
      const parsed = JSON.parse(msg);
      if (parsed.error?.message) {
        msg = parsed.error.message;
        // Check for double encoded JSON
        if (typeof msg === 'string' && msg.includes('{"error"')) {
          const inner = JSON.parse(msg);
          if (inner.error?.message) msg = inner.error.message;
        }
      }
    }
  } catch {}

  if (typeof msg === 'string') {
    if (msg.includes('503') || msg.toLowerCase().includes('high demand') || msg.toLowerCase().includes('unavailable')) {
      return 'Davis AI is currently experiencing high demand. Please click "Try again" in a moment.';
    }
    if (msg.toLowerCase().includes('api_key') || msg.toLowerCase().includes('api key')) {
      return 'Invalid or missing Gemini API key. Please check your key in the AI Studio Secrets panel.';
    }
  }

  return typeof msg === 'string' ? msg : 'Failed to communicate with Davis AI.';
}

// Streaming chat endpoint
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    res.status(400).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your environment variables or Secrets panel.',
    });
    return;
  }

  const { messages, systemInstruction, temperature } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required and cannot be empty.' });
    return;
  }

  // Format messages into Gemini contents format
  const formattedContents = messages
    .filter((m: { role: string; content: string }) => m && typeof m.content === 'string' && m.content.trim() !== '')
    .map((m: { role: string; content: string }) => {
      const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: m.content }],
      };
    });

  if (formattedContents.length === 0) {
    res.status(400).json({ error: 'No valid message text found in payload.' });
    return;
  }

  // Ensure first message is from user (Gemini requirement for conversations)
  if (formattedContents[0].role !== 'user') {
    formattedContents.shift();
  }

  if (formattedContents.length === 0) {
    res.status(400).json({ error: 'Conversation must start with a user message.' });
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

  const generateWithRetry = async (attemptsLeft = 2): Promise<void> => {
    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      if (attemptsLeft > 1) {
        // Wait 800ms before retrying transient spike
        await new Promise((r) => setTimeout(r, 800));
        return generateWithRetry(attemptsLeft - 1);
      }
      console.error('Error generating content from Gemini API:', error);
      const friendlyMessage = formatGeminiError(error);
      res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
      res.end();
    }
  };

  await generateWithRetry();
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

  const { messages, systemInstruction, temperature } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required.' });
    return;
  }

  const formattedContents = messages
    .filter((m: { role: string; content: string }) => m && typeof m.content === 'string' && m.content.trim() !== '')
    .map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  if (formattedContents.length > 0 && formattedContents[0].role !== 'user') {
    formattedContents.shift();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      },
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Sync generation error:', error);
    res.status(500).json({ error: error?.message || 'Generation error' });
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
    const cleaned = raw.replace(/^\\`\\`\\`json\\s*/i, '').replace(/\\s*\\`\\`\\`$/i, '');
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
