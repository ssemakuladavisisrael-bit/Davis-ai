import { Router } from 'express';

export const pixverseRouter = Router();

const PIXVERSE_API = 'https://app-api.pixverse.ai/openapi/v2';

function pixverseError(payload: any, fallback: string) {
  return payload?.ErrMsg || payload?.error?.message || fallback;
}

// Generates one real video clip using PixVerse. The API key remains server-side.
pixverseRouter.post('/pixverse', async (req, res) => {
  const apiKey = process.env.PIXVERSE_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error: 'PixVerse is not connected yet. Add PIXVERSE_API_KEY in Render → Environment, then redeploy.',
      code: 'PIXVERSE_API_KEY_MISSING',
    });
    return;
  }

  const { prompt, resolution, aspectRatio, duration } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'A video prompt is required.' });
    return;
  }

  const traceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `davis-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const quality = resolution === '360p' || resolution === '540p' ? resolution : '720p';
  const seconds = Math.min(8, Math.max(5, Number(duration) || 5));
  const ratio = aspectRatio === '9:16' ? '9:16' : '16:9';

  try {
    const createResponse = await fetch(`${PIXVERSE_API}/video/text/generate`, {
      method: 'POST',
      headers: {
        'API-KEY': apiKey,
        'Ai-trace-id': traceId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aspect_ratio: ratio,
        duration: seconds,
        model: 'v6',
        prompt: prompt.trim().slice(0, 4000),
        quality,
        seed: 0,
      }),
    });

    const created: any = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || created?.ErrCode !== 0 || !created?.Resp?.video_id) {
      const message = pixverseError(created, `PixVerse rejected the video request (HTTP ${createResponse.status}).`);
      const status = /credit|balance|subscription|plan|payment/i.test(message) ? 402 : 502;
      res.status(status).json({ error: message, code: 'PIXVERSE_CREATE_FAILED' });
      return;
    }

    const videoId = created.Resp.video_id;
    // Poll the documented asynchronous status endpoint for up to three minutes.
    for (let attempt = 0; attempt < 36; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const statusResponse = await fetch(`${PIXVERSE_API}/video/result/${encodeURIComponent(String(videoId))}`, {
        headers: { 'API-KEY': apiKey, 'Ai-trace-id': traceId },
      });
      const statusData: any = await statusResponse.json().catch(() => ({}));
      if (!statusResponse.ok || statusData?.ErrCode !== 0) {
        throw new Error(pixverseError(statusData, `Could not check PixVerse job status (HTTP ${statusResponse.status}).`));
      }

      const result = statusData?.Resp;
      if (result?.status === 1 && result?.url) {
        const videoResponse = await fetch(result.url);
        if (!videoResponse.ok) throw new Error('PixVerse finished the video, but its download URL could not be fetched.');
        const bytes = Buffer.from(await videoResponse.arrayBuffer());
        if (!bytes.length) throw new Error('PixVerse returned an empty video file.');
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', String(bytes.length));
        res.setHeader('Cache-Control', 'no-store');
        res.send(bytes);
        return;
      }
      if (result?.status === 7) throw new Error('PixVerse rejected this prompt during content moderation. Please change the prompt and try again.');
      if (result?.status === 8) throw new Error('PixVerse could not generate this clip. Please try a different prompt.');
    }

    res.status(504).json({ error: 'PixVerse is still generating this clip after three minutes. Try again shortly.', code: 'PIXVERSE_TIMEOUT' });
  } catch (error: any) {
    console.error('PixVerse generation error:', error);
    if (!res.headersSent) res.status(502).json({ error: error?.message || 'PixVerse video generation failed.' });
  }
});
