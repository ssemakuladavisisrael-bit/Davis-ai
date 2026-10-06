import React, { useState } from 'react';
import { Sparkles, Loader2, Download, AlertCircle, Play } from 'lucide-react';

type Props = {
  prompt: string;
};

export function RealisticVideoButton({ prompt }: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (busy || !prompt.trim()) return;
    setBusy(true);
    setError('');
    setUrl(null);

    try {
      const response = await fetch('/api/video/realistic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio: '16:9', resolution: '720p' }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || contentType.includes('application/json')) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Video generation failed.');
      }

      const blob = await response.blob();
      if (blob.size < 100) {
        throw new Error('Received an empty video file.');
      }

      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message || 'Video generation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Realistic AI Video Generator
        </span>
        <span className="text-[11px] text-slate-500">Google Veo 3.1</span>
      </div>

      <button
        onClick={generate}
        disabled={busy || !prompt.trim()}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {busy ? 'Generating video with Veo… (may take 1-2 min)' : 'Generate Realistic AI Video'}
      </button>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="space-y-1">
            <div className="font-semibold">Notice</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {url && (
        <div className="space-y-2 pt-2">
          <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-200">
            <video
              controls
              playsInline
              preload="auto"
              src={url}
              className="w-full h-full object-contain"
            />
          </div>
          <a
            href={url}
            download="davis-ai-realistic.mp4"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Download MP4
          </a>
        </div>
      )}
    </div>
  );
}
