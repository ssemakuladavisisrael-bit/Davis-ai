import React, { useEffect, useRef, useState } from 'react';
import { Film, Sparkles, Play, Square, Download, Wand2, Clock3, Users, X, Loader2 } from 'lucide-react';

type Scene = {
  title: string;
  narration: string;
  visual: string;
  seconds: number;
};

type VideoPlan = {
  title: string;
  hook: string;
  scenes: Scene[];
  closing: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function VideoStudio({ isOpen, onClose }: Props) {
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Teachers and educators');
  const [duration, setDuration] = useState('90');
  const [style, setStyle] = useState('Educational and engaging');
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  if (!isOpen) return null;

  const generatePlan = async () => {
    if (!topic.trim() || busy) return;
    setBusy(true);
    setError('');
    setVideoUrl(null);
    try {
      const response = await fetch('/api/video/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), audience, duration: Number(duration), style }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create the video plan.');
      setPlan(data);
    } catch (e: any) {
      setError(e?.message || 'Could not create the video plan.');
    } finally {
      setBusy(false);
    }
  };

  const drawScene = (ctx: CanvasRenderingContext2D, scene: Scene, index: number, total: number, title: string) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#111827');
    gradient.addColorStop(1, index % 2 ? '#3730a3' : '#0f766e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.arc(w - 100, 90, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText('DAVIS AI', 55, 65);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText(`Scene ${index + 1} / ${total}`, 55, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 42px system-ui, sans-serif';
    wrapText(ctx, scene.title, 55, 190, w - 110, 50);

    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = '400 25px system-ui, sans-serif';
    wrapText(ctx, scene.visual, 55, 330, w - 110, 36);

    ctx.fillStyle = 'rgba(255,255,255,0.70)';
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.fillText(title.slice(0, 55), 55, h - 45);
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(/\s+/);
    let line = '';
    let currentY = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
  };

  const createVideo = async () => {
    if (!plan || recording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    stopRef.current = false;
    setRecording(true);
    setError('');
    recorder.start();

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      recorder.stop();
      setRecording(false);
      return;
    }

    for (let i = 0; i < plan.scenes.length; i++) {
      if (stopRef.current) break;
      const scene = plan.scenes[i];
      drawScene(ctx, scene, i, plan.scenes.length, plan.title);
      await new Promise((resolve) => setTimeout(resolve, Math.max(1500, scene.seconds * 1000)));
    }

    if (!stopRef.current) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 46px system-ui, sans-serif';
      ctx.fillText('Thanks for watching', 55, 210);
      ctx.font = '400 27px system-ui, sans-serif';
      wrapText(ctx, plan.closing, 55, 280, canvas.width - 110, 40);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    recorder.stop();
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const blob = new Blob(chunks, { type: mime });
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(blob));
    setRecording(false);
  };

  const stopVideo = () => {
    stopRef.current = true;
  };

  const reset = () => {
    setPlan(null);
    setVideoUrl(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Davis AI Video Studio</h2>
              <p className="text-xs text-slate-500">Turn an idea into a storyboard and a downloadable video.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[360px_1fr] gap-0">
          <section className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200">
            <label className="block text-xs font-semibold text-slate-600 mb-2">What should the video be about?</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: Introduce AI and basic prompting skills to early childhood teachers."
              className="w-full min-h-32 rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-4 mb-2"><Users className="h-4 w-4" /> Audience</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-4 mb-2"><Clock3 className="h-4 w-4" /> Duration</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option value="60">60 seconds</option>
              <option value="90">90 seconds</option>
              <option value="120">120 seconds</option>
              <option value="180">3 minutes</option>
            </select>

            <label className="block text-xs font-semibold text-slate-600 mt-4 mb-2">Style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
              <option>Educational and engaging</option>
              <option>Professional presentation</option>
              <option>Social media explainer</option>
              <option>Storytelling</option>
            </select>

            <button
              onClick={generatePlan}
              disabled={!topic.trim() || busy}
              className="mt-5 w-full rounded-2xl bg-indigo-600 text-white py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {busy ? 'Building storyboard…' : 'Generate storyboard'}
            </button>

            {plan && !busy && (
              <button onClick={reset} className="mt-2 w-full rounded-2xl border border-slate-200 py-3 text-sm font-medium">
                Start another video
              </button>
            )}

            {error && <p className="mt-3 rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700">{error}</p>}
          </section>

          <section className="p-5 bg-slate-50">
            {!plan ? (
              <div className="min-h-[480px] flex flex-col items-center justify-center text-center">
                <Wand2 className="h-12 w-12 text-indigo-500 mb-4" />
                <h3 className="font-bold text-slate-900 text-lg">Build the video from one prompt</h3>
                <p className="max-w-md text-sm text-slate-500 mt-2">Davis AI will create a title, hook, scenes, narration ideas and visual directions. Then you can render the storyboard into a video.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Video plan</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{plan.title}</h3>
                  <p className="text-sm text-slate-600 mt-2"><strong>Hook:</strong> {plan.hook}</p>
                </div>

                <div className="space-y-3">
                  {plan.scenes.map((scene, i) => (
                    <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-indigo-600">SCENE {i + 1}</span>
                          <h4 className="font-semibold text-slate-900 mt-1">{scene.title}</h4>
                        </div>
                        <span className="text-xs text-slate-500">{scene.seconds}s</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2"><strong>Visual:</strong> {scene.visual}</p>
                      <p className="text-sm text-slate-600 mt-1"><strong>Narration:</strong> {scene.narration}</p>
                    </div>
                  ))}
                </div>

                <canvas ref={canvasRef} width={1280} height={720} className="hidden" />

                <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
                  {!recording ? (
                    <button onClick={createVideo} className="flex-1 rounded-xl bg-slate-900 text-white py-3 font-semibold flex items-center justify-center gap-2">
                      <Play className="h-4 w-4" /> Render video
                    </button>
                  ) : (
                    <button onClick={stopVideo} className="flex-1 rounded-xl bg-red-600 text-white py-3 font-semibold flex items-center justify-center gap-2">
                      <Square className="h-4 w-4" /> Stop rendering
                    </button>
                  )}

                  {videoUrl && (
                    <a href={videoUrl} download="davis-ai-video.webm" className="flex-1 rounded-xl border border-slate-200 bg-white text-slate-800 py-3 font-semibold flex items-center justify-center gap-2">
                      <Download className="h-4 w-4" /> Download video
                    </a>
                  )}
                </div>

                {videoUrl && (
                  <video controls src={videoUrl} className="w-full rounded-2xl bg-black border border-slate-200" />
                )}

                <p className="text-xs text-slate-500">
                  This first video engine renders a clean 16:9 storyboard video directly in the browser. We can add AI images, voice-over and a dedicated video API next without exposing your Gemini key.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
