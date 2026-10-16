import React, { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/api';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { Sparkles, Loader2, Download, AlertCircle, Play, Film, CheckCircle2 } from 'lucide-react';

type Props = { prompt: string };

const shotsFor = (story: string) => [
  {
    label: 'Scene 1 of 3 · Establish the story',
    prompt: `Create a realistic live-action cinematic opening shot for this story: ${story}. Establish the location and show the main people/subject clearly. Natural human movement, realistic skin and anatomy, documentary cinematography, believable lighting, continuous real-world physics. Keep the same characters, clothing, location and visual style for the following scenes. This is actual moving footage, not a still image, slideshow, animation or CGI. Opening shot, 16:9 landscape, 720p.`,
  },
  {
    label: 'Scene 2 of 3 · Main action',
    prompt: `Continue the same story in realistic live-action footage: ${story}. Show the main action happening naturally, with clear body movement and meaningful interaction. Match the characters, clothing, environment, time of day and visual style from the opening scene. Use a medium moving camera shot and believable real-world physics. Actual moving footage, not a still image, slideshow, animation or CGI. 16:9 landscape, 720p.`,
  },
  {
    label: 'Scene 3 of 3 · Finish the story',
    prompt: `Create the final live-action scene for this same story: ${story}. Continue naturally from the action, show a satisfying visual conclusion, and preserve the same characters, clothing, location and lighting. Use a cinematic closing camera movement. Realistic people and physics; actual moving footage, not a still image, slideshow, animation or CGI. 16:9 landscape, 720p.`,
  },
];

export function RealisticVideoButton({ prompt }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const generate = async () => {
    if (busy || !prompt.trim()) return;
    setBusy(true);
    setError('');
    setDone(false);
    setProgress('Preparing three connected live-action scenes…');
    if (url) URL.revokeObjectURL(url);
    setUrl(null);

    try {
      const clips: Blob[] = [];
      const shots = shotsFor(prompt.trim());

      // Each shot is genuine generated video. We stop with a clear message if the provider quota is unavailable.
      for (let i = 0; i < shots.length; i++) {
        setProgress(`Generating scene ${i + 1} of ${shots.length}: ${shots[i].label.split(' · ')[1]}…`);
        const response = await fetch(apiUrl('/api/video/realistic'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: shots[i].prompt, aspectRatio: '16:9', resolution: '720p' }),
        });
        const type = response.headers.get('content-type') || '';
        if (!response.ok || type.includes('application/json')) {
          const data = await response.json().catch(() => ({}));
          throw new Error(`Scene ${i + 1} could not be generated: ${data.error || 'Video generation failed.'}`);
        }
        const clip = await response.blob();
        if (clip.size < 1000) throw new Error(`Scene ${i + 1} returned an empty video file.`);
        clips.push(clip);
      }

      setProgress('Joining the real video scenes into one complete MP4…');
      let ffmpeg = ffmpegRef.current;
      if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;
      }
      if (!ffmpeg.loaded) {
        const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }

      const files: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const name = `scene${i + 1}.mp4`;
        await ffmpeg.writeFile(name, new Uint8Array(await clips[i].arrayBuffer()));
        files.push(`file '${name}'`);
      }
      await ffmpeg.writeFile('scenes.txt', new TextEncoder().encode(files.join('\n')));
      let result = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'scenes.txt', '-c', 'copy', 'complete.mp4']);
      if (result !== 0) {
        setProgress('Finalizing and matching the scenes…');
        result = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'scenes.txt', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', 'complete.mp4']);
      }
      if (result !== 0) throw new Error('The scenes were generated, but this browser could not join them. Try a desktop Chrome browser with more available memory.');

      const output = await ffmpeg.readFile('complete.mp4');
      const videoBlob = new Blob([output as Uint8Array], { type: 'video/mp4' });
      if (videoBlob.size < 1000) throw new Error('The finished video file was empty.');
      setUrl(URL.createObjectURL(videoBlob));
      setDone(true);
      setProgress('Complete: three real AI-generated scenes joined into one video.');
    } catch (e: any) {
      setError(e?.message || 'Video generation failed.');
      setProgress('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Full Realistic AI Video
        </span>
        <span className="text-[11px] text-slate-500">3 live-action scenes</span>
      </div>
      <p className="text-xs text-slate-600">Generates three moving-video scenes, then joins them into one downloadable MP4. This uses Google Veo video quota; it cannot bypass exhausted API limits.</p>
      <button
        onClick={generate}
        disabled={busy || !prompt.trim()}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
        {busy ? 'Making your complete video…' : 'Generate Complete AI Video'}
      </button>
      {progress && (
        <div className="text-xs text-slate-600 flex items-start gap-2">
          {done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : busy ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : null}
          <span>{progress}</span>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div><div className="font-semibold">Generation stopped</div><div>{error}</div></div>
        </div>
      )}
      {url && (
        <div className="space-y-2 pt-2">
          <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-200">
            <video controls playsInline preload="auto" src={url} className="w-full h-full object-contain" />
          </div>
          <a href={url} download="davis-ai-complete-video.mp4" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 transition-colors cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Download Complete MP4
          </a>
        </div>
      )}
    </div>
  );
}
