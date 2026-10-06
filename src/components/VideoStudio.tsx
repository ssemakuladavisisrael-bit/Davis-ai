import React, { useEffect, useRef, useState } from 'react';
import { 
  Film, 
  Sparkles, 
  Play, 
  Square, 
  Download, 
  Wand2, 
  Clock3, 
  Users, 
  X, 
  Loader2, 
  Volume2, 
  Layers, 
  Video, 
  CheckCircle2, 
  RotateCcw,
  Sliders,
  Palette,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export type Scene = {
  title: string;
  narration: string;
  visual: string;
  seconds: number;
  audioBase64?: string;
};

export type VideoPlan = {
  title: string;
  hook: string;
  scenes: Scene[];
  closing: string;
};

interface VideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
}

const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck', desc: 'Friendly, warm & natural' },
  { id: 'Charon', name: 'Charon', desc: 'Deep, calm & authoritative' },
  { id: 'Kore', name: 'Kore', desc: 'Crisp, articulate & expressive' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Energetic, confident & bold' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Smooth & professional' },
];

export function VideoStudio({ isOpen, onClose, initialTopic = '' }: VideoStudioProps) {
  const [activeTab, setActiveTab] = useState<'narrated' | 'veo'>('narrated');
  
  // Narrated Studio State
  const [topic, setTopic] = useState(initialTopic);
  const [audience, setAudience] = useState('General audience & learners');
  const [duration, setDuration] = useState('60');
  const [style, setStyle] = useState('Educational and engaging');
  const [voiceName, setVoiceName] = useState('Puck');
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatusText, setRenderStatusText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Veo State
  const [veoPrompt, setVeoPrompt] = useState('');
  const [veoResolution, setVeoResolution] = useState<'720p' | '1080p'>('720p');
  const [veoAspectRatio, setVeoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [veoStatus, setVeoStatus] = useState<'idle' | 'starting' | 'polling' | 'downloading' | 'completed' | 'error'>('idle');
  const [veoOperationName, setVeoOperationName] = useState<string | null>(null);
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [veoError, setVeoError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRenderingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (initialTopic && initialTopic !== topic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (veoVideoUrl) URL.revokeObjectURL(veoVideoUrl);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [videoUrl, veoVideoUrl]);

  if (!isOpen) return null;

  // Generate AI Storyboard Plan
  const handleGeneratePlan = async () => {
    if (!topic.trim() || isPlanning) return;
    setIsPlanning(true);
    setError('');
    setVideoUrl(null);

    try {
      const response = await fetch('/api/video/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          audience,
          duration: Number(duration),
          style,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate storyboard plan.');
      }
      setPlan(data);
    } catch (err: any) {
      setError(err?.message || 'Could not generate the video storyboard.');
    } finally {
      setIsPlanning(false);
    }
  };

  // Pre-generate Voiceover for scenes
  const fetchSceneAudio = async (text: string, voice: string): Promise<ArrayBuffer | null> => {
    try {
      const res = await fetch('/api/video/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: voice }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audioBase64) return null;

      // Decode Base64 to ArrayBuffer
      const binaryString = atob(data.audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch {
      return null;
    }
  };

  // Draw scene canvas graphics with animated gradients, motion, text, and wave
  const drawSceneFrame = (
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    index: number,
    total: number,
    timeFraction: number,
    videoTitle: string,
    isClosing = false
  ) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Background gradient with gentle animated sweep
    const shift = Math.sin(timeFraction * Math.PI) * 40;
    const gradient = ctx.createLinearGradient(0, -shift, w, h + shift);
    
    if (isClosing) {
      gradient.addColorStop(0, '#0b1329');
      gradient.addColorStop(1, '#1e1b4b');
    } else {
      const palette = [
        ['#0f172a', '#1e1b4b', '#312e81'], // Indigo Night
        ['#091e3a', '#064e3b', '#047857'], // Emerald Deep
        ['#18181b', '#3b0764', '#581c87'], // Royal Violet
        ['#0f172a', '#1e3a8a', '#1d4ed8'], // Ocean Blue
        ['#1e293b', '#701a75', '#86198f'], // Magenta Glow
      ][index % 5];
      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(0.5, palette[1]);
      gradient.addColorStop(1, palette[2]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Decorative geometric rings with zoom motion (Ken Burns effect)
    const scaleFactor = 1 + timeFraction * 0.08;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-w / 2, -h / 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w - 140, 160, 260, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(180, h - 80, 200, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Subtle particle stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let p = 0; p < 18; p++) {
      const px = ((p * 73 + index * 45) % w);
      const py = ((p * 47 + index * 83) % h);
      ctx.beginPath();
      ctx.arc(px, py, (p % 3) + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top Brand Badge
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px system-ui, sans-serif';
    ctx.fillText('DAVIS AI', 64, 60);

    ctx.fillStyle = '#818cf8';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('VIDEO STUDIO', 180, 58);

    if (!isClosing) {
      // Scene indicator pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.roundRect(64, 88, 140, 28, 14);
      ctx.fill();

      ctx.fillStyle = '#a5b4fc';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`SCENE ${index + 1} OF ${total}`, 80, 106);

      // Scene Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 40px system-ui, sans-serif';
      wrapCanvasText(ctx, scene.title, 64, 170, w - 128, 50, 2);

      // Visual Direction Cue box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.roundRect(64, 280, w - 128, 140, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('VISUAL ON SCREEN', 88, 312);

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '400 22px system-ui, sans-serif';
      wrapCanvasText(ctx, scene.visual, 88, 350, w - 176, 32, 2);

      // Live Narration Subtitle Box (bottom)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.beginPath();
      ctx.roundRect(64, 460, w - 128, 170, 16);
      ctx.fill();

      ctx.fillStyle = '#818cf8';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('NARRATION', 88, 492);

      ctx.fillStyle = '#ffffff';
      ctx.font = '500 24px system-ui, sans-serif';
      wrapCanvasText(ctx, `"${scene.narration}"`, 88, 532, w - 176, 34, 3);
    } else {
      // Closing Frame
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 52px system-ui, sans-serif';
      ctx.fillText('Thanks for Watching!', 64, 220);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '400 28px system-ui, sans-serif';
      wrapCanvasText(ctx, scene.narration, 64, 300, w - 128, 40, 3);

      ctx.fillStyle = '#818cf8';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.fillText('Generated by Davis AI · Powered by Google Gemini', 64, 460);
    }

    // Audio Waveform Visualization Simulation (bottom bar)
    const waveY = h - 38;
    ctx.fillStyle = 'rgba(129, 140, 248, 0.6)';
    const barCount = 36;
    for (let b = 0; b < barCount; b++) {
      const barHeight = Math.abs(Math.sin((b * 0.4) + (timeFraction * 12))) * 18 + 4;
      const bx = 64 + b * 10;
      ctx.fillRect(bx, waveY - barHeight / 2, 4, barHeight);
    }

    // Video Title watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillText(videoTitle.slice(0, 48), 64 + barCount * 10 + 20, waveY + 5);

    // Progress bar across the very bottom
    const progressTotal = isClosing ? 1 : (index + timeFraction) / total;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, h - 6, w, 6);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(0, h - 6, w * progressTotal, 6);
  };

  const wrapCanvasText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 4
  ) => {
    const words = text.split(/\s+/);
    let line = '';
    let currentY = y;
    let linesDrawn = 0;

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
        linesDrawn++;
        if (linesDrawn >= maxLines - 1) {
          // Truncate remaining
          line = `${line}...`;
          break;
        }
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
  };

  // Full Multimedia Video Renderer with Web Audio Voiceover Mixing
  const handleRenderVideo = async () => {
    if (!plan || isRendering) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    stopRenderingRef.current = false;
    setIsRendering(true);
    setRenderProgress(0);
    setError('');

    // Initialize Web Audio Context
    let audioCtx: AudioContext;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext not supported, recording video only:', e);
    }

    const audioDest = audioCtx! ? audioCtx.createMediaStreamDestination() : null;

    // Synthesize Voiceover audio clips for scenes
    setRenderStatusText('Synthesizing AI voiceover narration for all scenes...');
    const audioBuffers: Array<AudioBuffer | null> = [];

    for (let s = 0; s < plan.scenes.length; s++) {
      if (stopRenderingRef.current) break;
      setRenderStatusText(`Synthesizing voiceover: Scene ${s + 1} of ${plan.scenes.length}...`);
      const scene = plan.scenes[s];
      const audioData = await fetchSceneAudio(scene.narration, voiceName);
      
      if (audioData && audioCtx!) {
        try {
          const decoded = await audioCtx.decodeAudioData(audioData);
          audioBuffers.push(decoded);
        } catch {
          audioBuffers.push(null);
        }
      } else {
        audioBuffers.push(null);
      }
      setRenderProgress(Math.round(((s + 1) / (plan.scenes.length + 1)) * 30));
    }

    // Synthesize closing narration
    const closingAudioData = await fetchSceneAudio(plan.closing, voiceName);
    let closingBuffer: AudioBuffer | null = null;
    if (closingAudioData && audioCtx!) {
      try {
        closingBuffer = await audioCtx.decodeAudioData(closingAudioData);
      } catch {}
    }

    if (stopRenderingRef.current) {
      setIsRendering(false);
      return;
    }

    setRenderStatusText('Composing video frames and synchronizing audio track...');

    // Combine Canvas Stream with Audio Stream
    const canvasStream = canvas.captureStream(30);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioDest.stream.getAudioTracks());
    }

    const combinedStream = new MediaStream(combinedTracks);

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType: mime });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();

    const ctx = canvas.getContext('2d')!;

    // Play and render each scene
    const totalScenes = plan.scenes.length;

    for (let i = 0; i < totalScenes; i++) {
      if (stopRenderingRef.current) break;
      const scene = plan.scenes[i];
      const audioBuffer = audioBuffers[i];
      
      // Determine duration of scene: match audio duration or plan seconds
      const sceneDurationSec = audioBuffer ? Math.max(audioBuffer.duration + 0.6, 3.5) : scene.seconds;
      setRenderStatusText(`Rendering Scene ${i + 1} / ${totalScenes}: "${scene.title}"...`);

      // Play audio through audio destination
      if (audioBuffer && audioCtx! && audioDest) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioDest);
        source.connect(audioCtx.destination);
        source.start();
      }

      // Render frames smoothly for scene duration
      const startTime = performance.now();
      const totalMs = sceneDurationSec * 1000;

      while (performance.now() - startTime < totalMs) {
        if (stopRenderingRef.current) break;
        const elapsed = performance.now() - startTime;
        const fraction = Math.min(1, elapsed / totalMs);

        drawSceneFrame(ctx, scene, i, totalScenes, fraction, plan.title);
        await new Promise((r) => requestAnimationFrame(r));
      }

      setRenderProgress(30 + Math.round(((i + 1) / totalScenes) * 60));
    }

    // Render closing scene
    if (!stopRenderingRef.current) {
      setRenderStatusText('Finalizing video outro & closing statement...');
      const closingDurationSec = closingBuffer ? Math.max(closingBuffer.duration + 0.6, 3.0) : 3.5;

      if (closingBuffer && audioCtx! && audioDest) {
        const source = audioCtx.createBufferSource();
        source.buffer = closingBuffer;
        source.connect(audioDest);
        source.connect(audioCtx.destination);
        source.start();
      }

      const closeSceneObj: Scene = {
        title: 'Thank You',
        narration: plan.closing,
        visual: 'Davis AI Closing Outro',
        seconds: closingDurationSec,
      };

      const closeStart = performance.now();
      const closeMs = closingDurationSec * 1000;
      while (performance.now() - closeStart < closeMs) {
        if (stopRenderingRef.current) break;
        const fraction = Math.min(1, (performance.now() - closeStart) / closeMs);
        drawSceneFrame(ctx, closeSceneObj, totalScenes, totalScenes, fraction, plan.title, true);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    recorder.stop();
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const finalBlob = new Blob(chunks, { type: mime });
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(finalBlob));
    setIsRendering(false);
    setRenderProgress(100);
    setRenderStatusText('Video rendering complete!');
  };

  const handleStopRendering = () => {
    stopRenderingRef.current = true;
    setIsRendering(false);
  };

  // Google Veo Video Generation Handlers
  const handleStartVeo = async () => {
    if (!veoPrompt.trim() || veoStatus === 'starting' || veoStatus === 'polling') return;
    setVeoStatus('starting');
    setVeoError('');
    setVeoVideoUrl(null);

    try {
      const res = await fetch('/api/video/veo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: veoPrompt.trim(),
          resolution: veoResolution,
          aspectRatio: veoAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start Veo video generation.');
      }

      setVeoOperationName(data.operationName);
      setVeoStatus('polling');
      pollVeoOperation(data.operationName);
    } catch (err: any) {
      setVeoStatus('error');
      setVeoError(err?.message || 'Could not start Google Veo video generation.');
    }
  };

  const pollVeoOperation = async (operationName: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    const check = async () => {
      attempts++;
      try {
        const res = await fetch('/api/video/veo/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });

        const data = await res.json();
        if (data.done) {
          if (data.error) {
            setVeoStatus('error');
            setVeoError(data.error?.message || 'Veo video generation failed.');
          } else {
            // Completed, download
            downloadVeoVideo(operationName);
          }
          return;
        }

        if (attempts >= maxAttempts) {
          setVeoStatus('error');
          setVeoError('Operation timed out. Please try again.');
          return;
        }

        setTimeout(check, 5000);
      } catch (err: any) {
        setVeoStatus('error');
        setVeoError(err?.message || 'Failed checking operation status.');
      }
    };

    setTimeout(check, 3000);
  };

  const downloadVeoVideo = async (operationName: string) => {
    setVeoStatus('downloading');
    try {
      const res = await fetch('/api/video/veo/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

      if (!res.ok) throw new Error('Failed to retrieve completed video.');
      const blob = await res.blob();
      setVeoVideoUrl(URL.createObjectURL(blob));
      setVeoStatus('completed');
    } catch (err: any) {
      setVeoStatus('error');
      setVeoError(err?.message || 'Failed to download generated Veo video.');
    }
  };

  // Sample prompt chips
  const sampleTopics = [
    'How Photosynthesis Powers Life on Earth',
    '3 Steps to Master Clean Code & Refactoring',
    'Why Black Holes Bend Space and Time',
    '5 Essential Prompting Strategies for AI',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div 
        className="w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">Davis AI Video Studio</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Multimedia Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">Create AI-directed videos with synchronized voiceover narration.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('narrated')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'narrated'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Narrated Producer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('veo')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'veo'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-indigo-500" />
                <span>Google Veo AI</span>
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: NARRATED VIDEO PRODUCER */}
        {activeTab === 'narrated' && (
          <div className="grid lg:grid-cols-[380px_1fr] gap-0 flex-1">
            {/* Left Controls Bar */}
            <section className="p-5 border-b lg:border-b-0 lg:border-r border-slate-200 space-y-4 bg-white">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Video Topic or Concept
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Explain how transformers and attention mechanisms work in artificial intelligence..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {sampleTopics.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(item)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors cursor-pointer border border-slate-200/60"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                    <Clock3 className="h-3.5 w-3.5 text-indigo-500" /> Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800"
                  >
                                        <option value="60">60 seconds (5 scenes)</option>
                    <option value="90">90 seconds (6 scenes)</option>
                    <option value="120">2 minutes (8 scenes)</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                    <Palette className="h-3.5 w-3.5 text-indigo-500" /> Visual Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800"
                  >
                    <option>Educational & Engaging</option>
                    <option>Cinematic & Dramatic</option>
                    <option>Tech & Futuristic</option>
                    <option>Minimal & Direct</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-500" /> AI Voiceover Narrator
                </label>
                <select
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium"
                >
                  {VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1">
                  <Users className="h-3.5 w-3.5 text-indigo-500" /> Target Audience
                </label>
                <input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Students, founders, developers..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
                />
              </div>

              <button
                onClick={handleGeneratePlan}
                disabled={!topic.trim() || isPlanning}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                {isPlanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Directing Storyboard...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    <span>Generate Storyboard</span>
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {error}
                </div>
              )}
            </section>

            {/* Right Workspace / Player */}
            <section className="p-6 bg-slate-50 flex flex-col justify-between">
              {!plan ? (
                <div className="min-h-[460px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Film className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Start by Generating a Storyboard</h3>
                  <p className="max-w-md text-xs text-slate-500 leading-relaxed">
                    Davis AI will compose a title, hook, scene breakdowns, visual camera directions, and speaking narration scripts. You can then render it directly into a high-definition video with synchronized speech.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Title & Hook Header Card */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                        AI Directed Storyboard
                      </span>
                      <span className="text-xs text-slate-500">
                        {plan.scenes.length} Scenes · Voice: {voiceName}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">{plan.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong className="text-slate-800">Hook:</strong> "{plan.hook}"
                    </p>
                  </div>

                  {/* Hidden Offscreen Canvas for Rendering */}
                  <canvas ref={canvasRef} width={1280} height={720} className="hidden" />

                  {/* Render Action Bar */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {!isRendering ? (
                        <button
                          onClick={handleRenderVideo}
                          className="w-full sm:flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                        >
                          <Play className="h-4 w-4 text-emerald-400 fill-emerald-400" />
                          <span>Render Narrated Video (HD 16:9)</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRendering}
                          className="w-full sm:flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                        >
                          <Square className="h-4 w-4 fill-white" />
                          <span>Stop Rendering</span>
                        </button>
                      )}

                      {videoUrl && (
                        <a
                          href={videoUrl}
                          download={`${plan.title.replace(/\s+/g, '-').toLowerCase() || 'davis-ai-video'}.webm`}
                          className="w-full sm:w-auto px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Video</span>
                        </a>
                      )}
                    </div>

                    {/* Progress Bar & Status Text */}
                    {isRendering && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span className="font-medium flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                            {renderStatusText}
                          </span>
                          <span className="font-bold text-indigo-600">{renderProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 transition-all duration-300"
                            style={{ width: `${renderProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Finished Video Player */}
                  {videoUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-lg">
                      <video
                        controls
                        autoPlay
                        src={videoUrl}
                        className="w-full aspect-video object-contain bg-black"
                      />
                    </div>
                  )}

                  {/* Scene-by-Scene Review */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Storyboard Scenes
                    </div>
                    {plan.scenes.map((scene, i) => (
                      <div key={i} className="rounded-xl bg-white border border-slate-200 p-4 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-600">
                            SCENE {i + 1}
                          </span>
                          <span className="text-xs text-slate-400">~{scene.seconds}s</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{scene.title}</h4>
                        <p className="text-xs text-slate-600">
                          <strong className="text-slate-700">Visual Direction:</strong> {scene.visual}
                        </p>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          "{scene.narration}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: GOOGLE VEO AI GENERATOR */}
        {activeTab === 'veo' && (
          <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white space-y-2 shadow-lg">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Google Veo AI Video Generation</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Veo is Google's flagship generative video model capable of creating photorealistic and cinematic AI video clips from natural language text prompts.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Cinematic Video Prompt
                </label>
                <textarea
                  value={veoPrompt}
                  onChange={(e) => setVeoPrompt(e.target.value)}
                  placeholder="e.g. A neon hologram of a robot driving a sports car through a rainy cyberpunk street at top speed, photorealistic, 4k..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Aspect Ratio</label>
                  <select
                    value={veoAspectRatio}
                    onChange={(e) => setVeoAspectRatio(e.target.value as '16:9' | '9:16')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white text-slate-800"
                  >
                    <option value="16:9">16:9 Landscape (YouTube, Desktop)</option>
                    <option value="9:16">9:16 Portrait (Shorts, TikTok)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Resolution</label>
                  <select
                    value={veoResolution}
                    onChange={(e) => setVeoResolution(e.target.value as '720p' | '1080p')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-white text-slate-800"
                  >
                    <option value="720p">720p (Faster generation)</option>
                    <option value="1080p">1080p Full HD</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleStartVeo}
                disabled={!veoPrompt.trim() || veoStatus === 'starting' || veoStatus === 'polling'}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {veoStatus === 'starting' || veoStatus === 'polling' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Video with Google Veo...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Video with Veo</span>
                  </>
                )}
              </button>

              {veoStatus === 'polling' && (
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Veo model is rendering your video...
                  </div>
                  <p className="text-slate-600">
                    Video generation typically takes 1 to 3 minutes. Please keep this window open while the operation completes.
                  </p>
                </div>
              )}

              {veoError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="font-semibold">Veo Generation Notice</div>
                  <p>{veoError}</p>
                  <p className="text-[11px] text-rose-600">
                    Tip: You can use the <strong>Narrated Producer</strong> tab at any time for instant storyboards with speech narration.
                  </p>
                </div>
              )}

              {veoVideoUrl && (
                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-lg">
                    <video
                      controls
                      autoPlay
                      src={veoVideoUrl}
                      className="w-full aspect-video object-contain"
                    />
                  </div>
                  <a
                    href={veoVideoUrl}
                    download="veo-ai-video.mp4"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Veo MP4 Video
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
