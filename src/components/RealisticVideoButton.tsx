import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

type Props = {
  prompt: string;
};

export function RealisticVideoButton({ prompt }: Props) {
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/video/realistic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio: '16:9', resolution: '720p' }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Video generation failed.');
      }
      const blob = await response.blob();
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
    } catch (e: any) {
      setError(e?.message || 'Video generation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button onClick={generate} disabled={busy} className="rounded-xl bg-indigo-600 text-white px-4 py-3 font-semibold disabled:opacity-50">
        {busy ? <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> : <Sparkles className="inline h-4 w-4 mr-2" />}
        {busy ? 'Generating realistic video…' : 'Generate realistic AI video'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {url && <video controls src={url} className="w-full rounded-2xl bg-black" />}
      {url && <a href={url} download="davis-ai-realistic.mp4" className="inline-block rounded-xl bg-slate-900 text-white px-4 py-2">Download MP4</a>}
    </div>
  );
}
