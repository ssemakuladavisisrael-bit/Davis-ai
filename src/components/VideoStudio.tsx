import React, { useEffect, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { 
  Film, 
  Sparkles, 
  Play, 
  Pause,
  Square, 
  Download, 
  Wand2, 
  Clock3, 
  Users, 
  X, 
  Loader2, 
  Volume2, 
  Video, 
  SkipForward,
  SkipBack,
  RotateCcw,
  Palette,
  AlertCircle,
  CheckCircle2,
  Tv,
  VolumeX,
  Sliders
} from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { VideoStudioConfig } from '../types';

export type Scene = {
  title: string;
  narration: string;
  visual: string;
  seconds: number;
  audioBase64?: string;
  audioMimeType?: string;
};

export type VideoPlan = {
  title: string;
  hook: string;
  scenes: Scene[];
  closing: string;
  closingSeconds?: number;
  closingAudioBase64?: string;
  closingAudioMimeType?: string;
};

interface VideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  initialConfig?: VideoStudioConfig;
}

const VOICE_OPTIONS = [
  { id: 'Puck', name: 'Puck', desc: 'Friendly, warm & natural (US)' },
  { id: 'Charon', name: 'Charon', desc: 'Deep, calm & authoritative (UK)' },
  { id: 'Kore', name: 'Kore', desc: 'Crisp, articulate & expressive (AU)' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Energetic, confident & bold (CA)' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Smooth & professional (Intl)' },
];

export function VideoStudio({ isOpen, onClose, initialTopic = '', initialConfig }: VideoStudioProps) {
  const [activeTab, setActiveTab] = useState<'narrated' | 'veo'>('narrated');
  
  // Narrated Studio State
  const [topic, setTopic] = useState(initialTopic);
  const [audience, setAudience] = useState('General audience & learners');
  const [duration, setDuration] = useState('120');
  const [style, setStyle] = useState('Educational and engaging');
  const [voiceName, setVoiceName] = useState('Puck');
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [plan, setPlan] = useState<VideoPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [voiceoverReady, setVoiceoverReady] = useState(false);
  
  // Audio playback and preview element refs
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioElemRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayTriggeredRef = useRef(false);

  // Interactive Live Player State
  const [currentPreviewScene, setCurrentPreviewScene] = useState(0);
  const [isPlayingLive, setIsPlayingLive] = useState(false);

  // Video File Rendering State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatusText, setRenderStatusText] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFileType, setVideoFileType] = useState<'mp4' | 'webm'>('webm');
  const [isConvertingMp4, setIsConvertingMp4] = useState(false);
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
  const videoElemRef = useRef<HTMLVideoElement>(null);
  const stopRenderingRef = useRef(false);
  const stopLivePlayRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const ffmpegLoadedRef = useRef(false);

  useEffect(() => {
    if (initialTopic && initialTopic !== topic && !initialConfig?.topic) {
      setTopic(initialTopic);
    }
  }, [initialTopic, initialConfig?.topic]);

  useEffect(() => {
    if (!initialConfig) return;

    if (initialConfig.mode) setActiveTab(initialConfig.mode);
    if (initialConfig.topic) setTopic(initialConfig.topic);
    if (initialConfig.audience) setAudience(initialConfig.audience);

    if (initialConfig.duration) {
      const seconds = Number.parseInt(initialConfig.duration, 10);
      if ([60, 90, 120].includes(seconds)) setDuration(String(seconds));
    }

    if (initialConfig.style) {
      const styleValue = initialConfig.style.toLowerCase();
      if (styleValue.includes('cinematic')) setStyle('Cinematic & Dramatic');
      else if (styleValue.includes('tech') || styleValue.includes('futuristic')) setStyle('Tech & Futuristic');
      else if (styleValue.includes('minimal') || styleValue.includes('direct')) setStyle('Minimal & Direct');
      else setStyle('Educational & Engaging');
    }

    if (initialConfig.voiceName) setVoiceName(initialConfig.voiceName);
    if (initialConfig.veoPrompt) setVeoPrompt(initialConfig.veoPrompt);
    if (initialConfig.veoResolution) setVeoResolution(initialConfig.veoResolution);
    if (initialConfig.veoAspectRatio) setVeoAspectRatio(initialConfig.veoAspectRatio);

    setPlan(null);
    setVoiceoverReady(false);
    setVideoUrl(null);
    setError('');
    setVeoVideoUrl(null);
    setVeoError('');
    setVeoStatus('idle');
  }, [initialConfig]);

  useEffect(() => {
    return () => {
      stopLivePlayRef.current = true;
      stopRenderingRef.current = true;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (veoVideoUrl) URL.revokeObjectURL(veoVideoUrl);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [videoUrl, veoVideoUrl]);

  // Redraw canvas whenever currentPreviewScene changes or plan changes (when not actively rendering)
  useEffect(() => {
    if (!plan || !canvasRef.current || isRendering || isPlayingLive) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const isClosing = currentPreviewScene >= plan.scenes.length;
    const sceneToDraw = isClosing
      ? { title: 'Thank You', narration: plan.closing, visual: 'Outro', seconds: plan.closingSeconds ?? 4 }
      : plan.scenes[currentPreviewScene];
    drawSceneFrame(ctx, sceneToDraw, currentPreviewScene, plan.scenes.length, 0, plan.title, isClosing);
  }, [plan, currentPreviewScene, isRendering, isPlayingLive]);

  // Auto-play trigger when opened from chat
  useEffect(() => {
    if (initialConfig?.autoPlay && !autoPlayTriggeredRef.current && isOpen) {
      autoPlayTriggeredRef.current = true;
      if (!plan && topic.trim()) {
        handleGeneratePlan();
      }
    }
  }, [initialConfig?.autoPlay, isOpen, topic]);

  useEffect(() => {
    if (initialConfig?.autoPlay && plan && !isPlayingLive && !isRendering) {
      const timer = setTimeout(() => {
        handlePlayLivePresentation();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [plan, initialConfig?.autoPlay]);

  // Preview / sample voice narration
  const handlePreviewVoice = async (voiceToTest = voiceName) => {
    if (isPreviewingVoice) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setIsPreviewingVoice(false);
      return;
    }

    setIsPreviewingVoice(true);
    try {
      const sampleText = `Hello! I am ${voiceToTest}, your narrator for this video.`;
      const res = await fetch('/api/video/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText, voiceName: voiceToTest }),
      });
      if (!res.ok) throw new Error('TTS preview failed');
      const data = await res.json();
      if (!data.audioBase64) throw new Error('No audio returned');

      const audio = new Audio(`data:${data.mimeType || 'audio/mpeg'};base64,${data.audioBase64}`);
      audio.volume = voiceVolume;
      audio.playbackRate = voiceSpeed;
      previewAudioRef.current = audio;
      audio.onended = () => setIsPreviewingVoice(false);
      audio.onerror = () => setIsPreviewingVoice(false);
      await audio.play();
    } catch (e) {
      console.warn('Voice preview fallback to Web Speech:', e);
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(`Hello! I am ${voiceToTest}.`);
        utter.rate = voiceSpeed;
        utter.onend = () => setIsPreviewingVoice(false);
        utter.onerror = () => setIsPreviewingVoice(false);
        window.speechSynthesis.speak(utter);
      } else {
        setIsPreviewingVoice(false);
      }
    }
  };

  // Generate AI Storyboard Plan
  const handleGeneratePlan = async () => {
    if (!topic.trim() || isPlanning) return;
    setIsPlanning(true);
    setError('');
    setVideoUrl(null);
    setIsPlayingLive(false);
    stopLivePlayRef.current = true;

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
      setVoiceoverReady(false);
      setCurrentPreviewScene(0);

      // Eagerly pre-synthesize voiceover in parallel so playback is instant
      handleGenerateVoiceover(data).catch(() => {});
    } catch (err: any) {
      setError(err?.message || 'Could not generate the video storyboard.');
    } finally {
      setIsPlanning(false);
    }
  };

  // Pre-generate Voiceover for scenes via Gemini TTS / resilient speech
  const fetchSceneAudio = async (text: string, voice: string): Promise<{ buffer: ArrayBuffer; base64: string; mimeType: string } | null> => {
    try {
      const res = await fetch('/api/video/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: voice }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.audioBase64) return null;

      const binaryString = atob(data.audioBase64.trim().replace(/\s/g, ''));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return { buffer: bytes.buffer, base64: data.audioBase64, mimeType: data.mimeType || 'audio/mpeg' };
    } catch {
      return null;
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
    return btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64.trim().replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const handleGenerateVoiceover = async (customPlan?: VideoPlan, forceRegenerate = false) => {
    const targetPlan = customPlan || plan;
    if (!targetPlan || isGeneratingVoice) return;
    setIsGeneratingVoice(true);
    setError('');
    try {
      const updatedScenes: Scene[] = await Promise.all(
        targetPlan.scenes.map(async (scene) => {
          if (scene.audioBase64 && !forceRegenerate) return scene;
          const fetched = await fetchSceneAudio(scene.narration, voiceName);
          return fetched ? { ...scene, audioBase64: fetched.base64, audioMimeType: fetched.mimeType } : scene;
        })
      );

      let closingAudioBase64 = targetPlan.closingAudioBase64;
      let closingAudioMimeType = targetPlan.closingAudioMimeType;
      if (!closingAudioBase64 || forceRegenerate) {
        const closingFetched = await fetchSceneAudio(targetPlan.closing, voiceName);
        if (closingFetched) {
          closingAudioBase64 = closingFetched.base64;
          closingAudioMimeType = closingFetched.mimeType;
        }
      }
      
      const newPlan: VideoPlan = { 
        ...targetPlan, 
        scenes: updatedScenes,
        closingAudioBase64,
        closingAudioMimeType
      };
      setPlan(newPlan);
      setVoiceoverReady(true);
      return newPlan;
    } catch (err: any) {
      setVoiceoverReady(false);
      setError(err?.message || 'Could not generate the voiceover.');
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Draw scene canvas graphics
  const drawSceneFrame = (
    ctx: CanvasRenderingContext2D,
    scene: Scene,
    index: number,
    total: number,
    timeFraction: number,
    videoTitle: string,
    isClosing = false,
    talkLevel = 0
  ) => {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Force English video text to render normally left-to-right even if the app/browser inherits RTL.
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Background gradient with gentle animated sweep
    const shift = Math.sin(timeFraction * Math.PI) * 40;
    const gradient = ctx.createLinearGradient(0, -shift, w, h + shift);
    
    if (isClosing) {
      gradient.addColorStop(0, '#0b1329');
      gradient.addColorStop(1, '#1e1b4b');
    } else {
      const palette = [
        ['#fff7ed', '#ffedd5', '#fef3c7'],
        ['#ecfeff', '#cffafe', '#dbeafe'],
        ['#f0fdf4', '#dcfce7', '#d1fae5'],
        ['#fdf4ff', '#fae8ff', '#ede9fe'],
        ['#eff6ff', '#dbeafe', '#e0e7ff']
      ][index % 5];
      gradient.addColorStop(0, palette[0]);
      gradient.addColorStop(0.5, palette[1]);
      gradient.addColorStop(1, palette[2]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Decorative geometric rings with zoom motion
    const scaleFactor = 1 + timeFraction * 0.08;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.translate(-w / 2, -h / 2);

    ctx.strokeStyle = 'rgba(99, 102, 241, 0.10)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w - 140, 160, 260, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(180, h - 80, 200, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Subtle particle stars
    ctx.fillStyle = 'rgba(99, 102, 241, 0.16)';
    for (let p = 0; p < 18; p++) {
      const px = ((p * 73 + index * 45) % w);
      const py = ((p * 47 + index * 83) % h);
      ctx.beginPath();
      ctx.arc(px, py, (p % 3) + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top Brand Badge
    ctx.fillStyle = '#172033';
    ctx.font = '800 24px system-ui, sans-serif';
    ctx.fillText('DAVIS AI', 64, 60);

    ctx.fillStyle = '#6366f1';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('VIDEO STUDIO', 180, 58);

    if (!isClosing) {
      // Animated cartoon presenter
      drawExplainingCartoon(ctx, w - 350, 78, index, scene.title, timeFraction, talkLevel);

      // Scene indicator pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.beginPath();
      ctx.roundRect(64, 88, 140, 28, 14);
      ctx.fill();

      ctx.fillStyle = '#4f46e5';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText(`SCENE ${index + 1} OF ${total}`, 80, 106);

      // Scene Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 38px system-ui, sans-serif';
      wrapCanvasText(ctx, scene.title, 64, 165, w - 420, 48, 2);

      // Visual Direction Cue box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.roundRect(64, 265, w - 128, 145, 16);
      ctx.fill();

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ea580c';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('VISUAL ON SCREEN', 88, 296);

      ctx.fillStyle = '#334155';
      ctx.font = '400 22px system-ui, sans-serif';
      wrapCanvasText(ctx, scene.visual, 88, 335, w - 176, 32, 2);

      // Live Narration Subtitle Box (bottom)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.beginPath();
      ctx.roundRect(64, 440, w - 128, 190, 16);
      ctx.fill();

      ctx.fillStyle = '#4f46e5';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText('WHAT THE TEACHER SAYS', 88, 472);

      ctx.fillStyle = '#172033';
      ctx.font = '600 23px system-ui, sans-serif';
      wrapCanvasText(ctx, `"${scene.narration}"`, 88, 510, w - 176, 34, 3);
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
      const barHeight = Math.abs(Math.sin((b * 0.4) + (timeFraction * 14))) * 18 + 4;
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

  const drawExplainingCartoon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    sceneIndex: number,
    message: string,
    timeFraction = 0,
    talkLevel = 0
  ) => {
    ctx.save();
    // Keep the cartoon's English labels and speech bubble left-to-right.
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';

    const talk = Math.max(0.05, Math.min(1, talkLevel || Math.max(0, Math.sin(timeFraction * Math.PI * 22))));
    const bob = Math.sin(timeFraction * Math.PI * 4) * 3;
    const blink = Math.sin(timeFraction * Math.PI * 7 + sceneIndex) > 0.96;
    y += bob;

    const skin = sceneIndex % 2 === 0 ? '#8d5524' : '#f2c6a0';
    const shirt = ['#f472b6', '#38bdf8', '#34d399', '#f59e0b'][sceneIndex % 4];

    // Card background
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.roundRect(x, y, 310, 150, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(99,102,241,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Speech bubble
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, 195, 68, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 180, y + 78);
    ctx.lineTo(x + 195, y + 93);
    ctx.lineTo(x + 160, y + 78);
    ctx.fill();

    ctx.fillStyle = '#172033';
    ctx.font = '700 13px system-ui, sans-serif';
    wrapCanvasText(ctx, message, x + 22, y + 32, 170, 17, 3);

    // Body
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.roundRect(x + 230, y + 82, 50, 56, 16);
    ctx.fill();

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x + 255, y + 72, 25, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#3b2418';
    ctx.beginPath();
    ctx.arc(x + 255, y + 63, 24, Math.PI, Math.PI * 2);
    ctx.fill();

    // Eyes + blinking
    ctx.fillStyle = '#172033';
    if (blink) {
      ctx.strokeStyle = '#172033';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 243, y + 70); ctx.lineTo(x + 251, y + 70);
      ctx.moveTo(x + 259, y + 70); ctx.lineTo(x + 267, y + 70);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x + 247, y + 70, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 263, y + 70, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated mouth
    ctx.fillStyle = '#4a1717';
    ctx.beginPath();
    ctx.ellipse(x + 255, y + 79, 5, 2.5 + talk * 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (talk > 0.35) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + 255, y + 76.5, 3.5, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speaking arm movement
    ctx.strokeStyle = skin;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 234, y + 104);
    ctx.lineTo(x + 200, y + 74 + Math.sin(timeFraction * Math.PI * 8) * 5);
    ctx.stroke();

    // Star badge
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x + 220, y + 120, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#172033';
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillText('TEACH!', x + 14, y + 130);

    ctx.restore();
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
          line = `${line}...`;
          break;
        }
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, currentY);
  };


  // Estimate speech energy from the generated voiceover so mouth movement follows the narration.
  const getAudioTalkLevel = (buffer: AudioBuffer | null, elapsedSeconds: number) => {
    if (!buffer) return 0;
    const center = Math.max(0, Math.min(buffer.duration, elapsedSeconds));
    const radius = 0.035;
    const start = Math.max(0, Math.floor((center - radius) * buffer.sampleRate));
    const end = Math.min(buffer.length, Math.ceil((center + radius) * buffer.sampleRate));
    if (end <= start) return 0;
    const step = Math.max(1, Math.floor((end - start) / 180));
    let sum = 0;
    let count = 0;
    for (let i = start; i < end; i += step) {
      let sample = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) sample += Math.abs(buffer.getChannelData(ch)[i] || 0);
      sum += sample / buffer.numberOfChannels;
      count++;
    }
    return Math.min(1, Math.max(0.05, (sum / Math.max(1, count)) * 9));
  };

  // Instant Interactive Live Presentation Player (0 second waiting!)
  // Fit each narration clip to its assigned timeline slot so the complete presentation
  // remains exactly the requested duration (for the ECD coursework: exactly 120 seconds).
  const getFitPlaybackRate = (audioDuration: number, targetSeconds: number, userSpeed = 1) => {
    if (!audioDuration || !targetSeconds) return userSpeed;
    return Math.max(0.5, Math.min(2.5, (audioDuration * userSpeed) / targetSeconds));
  };

  const handlePlayLivePresentation = async () => {
    if (!plan || !canvasRef.current || isPlayingLive || isRendering) return;
    setIsPlayingLive(true);
    stopLivePlayRef.current = false;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
    } catch {}

    const totalScenes = plan.scenes.length;

    for (let i = currentPreviewScene; i < totalScenes; i++) {
      if (stopLivePlayRef.current) break;
      setCurrentPreviewScene(i);
      const scene = plan.scenes[i];

      // Fetch speech audio if available
      let audioData: ArrayBuffer | null = null;
      let audioBase64 = scene.audioBase64;
      if (audioBase64) {
        audioData = base64ToArrayBuffer(audioBase64);
      } else {
        const fetched = await fetchSceneAudio(scene.narration, voiceName);
        if (fetched) {
          audioData = fetched.buffer;
          audioBase64 = fetched.base64;
          scene.audioBase64 = fetched.base64;
          scene.audioMimeType = fetched.mimeType;
        }
      }

      let audioDuration = scene.seconds;
      let decoded: AudioBuffer | null = null;

      // 1. Play audible voiceover through HTML5 Audio element
      if (audioBase64 && !stopLivePlayRef.current) {
        try {
          if (activeAudioElemRef.current) {
            activeAudioElemRef.current.pause();
            activeAudioElemRef.current = null;
          }
          const audioElem = new Audio(`data:${scene.audioMimeType || 'audio/mpeg'};base64,${audioBase64}`);
          audioElem.volume = voiceVolume;
          audioElem.playbackRate = voiceSpeed;
          activeAudioElemRef.current = audioElem;
          audioElem.play().catch(() => {});
        } catch (e) {
          console.warn('Audio element playback caught:', e);
        }
      }

      // 2. Decode for mouth movement talk energy
      if (audioData && audioCtx && !stopLivePlayRef.current) {
        try {
          decoded = await audioCtx.decodeAudioData(audioData.slice(0));
          if (decoded && activeAudioElemRef.current) {
            activeAudioElemRef.current.playbackRate = getFitPlaybackRate(decoded.duration, scene.seconds, voiceSpeed);
          }
        } catch {}
      }

      // 3. Fallback to speech synthesis if no audio was generated
      if (!audioBase64 && !stopLivePlayRef.current && 'speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(scene.narration);
          utter.rate = voiceSpeed;
          window.speechSynthesis.speak(utter);
        } catch {}
      }

      // Smooth frame animation
      const startTime = performance.now();
      const totalMs = scene.seconds * 1000;

      while (performance.now() - startTime < totalMs) {
        if (stopLivePlayRef.current) break;
        const elapsed = performance.now() - startTime;
        const fraction = Math.min(1, elapsed / totalMs);
        drawSceneFrame(ctx, scene, i, totalScenes, fraction, plan.title, false, getAudioTalkLevel(decoded, (elapsed / 1000) * voiceSpeed));
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    // Play closing outro
    if (!stopLivePlayRef.current) {
      setCurrentPreviewScene(totalScenes);
      const closingDurationSec = plan.closingSeconds ?? 4;
      const closeSceneObj: Scene = {
        title: 'Thank You',
        narration: plan.closing,
        visual: 'Davis AI Closing Outro',
        seconds: closingDurationSec,
      };

      let closingAudioBase64 = plan.closingAudioBase64;
      let closingAudioData: ArrayBuffer | null = null;
      if (closingAudioBase64) {
        closingAudioData = base64ToArrayBuffer(closingAudioBase64);
      } else {
        const fetched = await fetchSceneAudio(plan.closing, voiceName);
        if (fetched) {
          closingAudioData = fetched.buffer;
          closingAudioBase64 = fetched.base64;
          plan.closingAudioBase64 = fetched.base64;
          plan.closingAudioMimeType = fetched.mimeType;
        }
      }

      if (closingAudioBase64 && !stopLivePlayRef.current) {
        try {
          if (activeAudioElemRef.current) {
            activeAudioElemRef.current.pause();
            activeAudioElemRef.current = null;
          }
          const audioElem = new Audio(`data:${plan.closingAudioMimeType || 'audio/mpeg'};base64,${closingAudioBase64}`);
          audioElem.volume = voiceVolume;
          audioElem.playbackRate = voiceSpeed;
          activeAudioElemRef.current = audioElem;
          audioElem.play().catch(() => {});
        } catch {}
      } else if (!stopLivePlayRef.current && 'speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(plan.closing);
          utter.rate = voiceSpeed;
          window.speechSynthesis.speak(utter);
        } catch {}
      }

      const closeStart = performance.now();
      const closeMs = closingDurationSec * 1000;
      while (performance.now() - closeStart < closeMs) {
        if (stopLivePlayRef.current) break;
        const fraction = Math.min(1, (performance.now() - closeStart) / closeMs);
        drawSceneFrame(ctx, closeSceneObj, totalScenes, totalScenes, fraction, plan.title, true, 0);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    setIsPlayingLive(false);
  };

  const handleStopLivePlay = () => {
    stopLivePlayRef.current = true;
    if (activeAudioElemRef.current) {
      activeAudioElemRef.current.pause();
      activeAudioElemRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setIsPlayingLive(false);
  };

  // Mobile browsers may not expose WebM duration metadata immediately.
  // Return null when metadata is unavailable instead of rejecting a valid recording.
  const getBlobDurationSeconds = async (blob: Blob): Promise<number | null> => {
    const url = URL.createObjectURL(blob);
    return await new Promise<number | null>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(value);
      };
      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (Number.isFinite(duration) && duration > 0) finish(duration);
        else {
          video.onloadeddata = () => {
            const d = video.duration;
            finish(Number.isFinite(d) && d > 0 ? d : null);
          };
        }
      };
      video.onerror = () => finish(null);
      video.src = url;
    });
  };

  // Full Video File Exporter: WebM export.
  const handleRenderVideo = async () => {
    if (!plan || !canvasRef.current || isRendering) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleStopLivePlay();
    stopRenderingRef.current = false;
    setIsRendering(true);
    setRenderProgress(0);
    setError('');

    let audioCtx: AudioContext | null = null;
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') await audioCtx.resume();
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }

    const audioDest = audioCtx ? audioCtx.createMediaStreamDestination() : null;

    // Helper to generate a fallback audio buffer with pleasant chime if synthesis failed
    const createFallbackBuffer = (c: AudioContext, sec: number): AudioBuffer => {
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) {
        const t = i / c.sampleRate;
        ch[i] = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-t * 1.5) * 0.08;
      }
      return buf;
    };

    // 1. Synthesize Audio Clips
    setRenderStatusText('Synthesizing speech voiceover for scenes...');
    const audioBuffers: Array<AudioBuffer> = [];

    for (let s = 0; s < plan.scenes.length; s++) {
      if (stopRenderingRef.current) break;
      setRenderStatusText(`Synthesizing voiceover: Scene ${s + 1} of ${plan.scenes.length}...`);
      const scene = plan.scenes[s];
      let audioData: ArrayBuffer | null = null;
      if (scene.audioBase64) {
        audioData = base64ToArrayBuffer(scene.audioBase64);
      } else {
        const fetched = await fetchSceneAudio(scene.narration, voiceName);
        if (fetched) {
          audioData = fetched.buffer;
          scene.audioBase64 = fetched.base64;
        }
      }
      
      let decodedBuffer: AudioBuffer | null = null;
      if (audioData && audioCtx) {
        try {
          decodedBuffer = await audioCtx.decodeAudioData(audioData.slice(0));
        } catch {
          decodedBuffer = null;
        }
      }

      if (audioCtx) {
        audioBuffers.push(decodedBuffer || createFallbackBuffer(audioCtx, scene.seconds));
      }
      setRenderProgress(Math.round(((s + 1) / (plan.scenes.length + 1)) * 30));
    }

    let closingAudioData: ArrayBuffer | null = null;
    if (plan.closingAudioBase64) {
      closingAudioData = base64ToArrayBuffer(plan.closingAudioBase64);
    } else {
      const fetched = await fetchSceneAudio(plan.closing, voiceName);
      if (fetched) {
        closingAudioData = fetched.buffer;
        plan.closingAudioBase64 = fetched.base64;
      }
    }

    let closingBuffer: AudioBuffer | null = null;
    if (closingAudioData && audioCtx) {
      try {
        closingBuffer = await audioCtx.decodeAudioData(closingAudioData.slice(0));
      } catch {}
    }
    if (audioCtx && !closingBuffer) {
      closingBuffer = createFallbackBuffer(audioCtx, plan.closingSeconds || 4);
    }

    if (stopRenderingRef.current) {
      setIsRendering(false);
      return;
    }

    // 2. Setup MediaRecorder with visible Canvas stream & Audio track
    setRenderStatusText('Recording synchronized video and audio stream...');
    const canvasStream = canvas.captureStream(30);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioDest.stream.getAudioTracks());
    }

    const combinedStream = new MediaStream(combinedTracks);

    // Prefer direct MP4 recording first. Fall back only when this browser does not support MP4.
    const candidates = [
      'video/mp4;codecs=avc1.424028,mp4a.40.2',
      'video/mp4',
      'video/mp4;codecs=avc1.64003E,mp4a.40.2',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];
    const supportedCandidates = candidates.filter((c) =>
      typeof MediaRecorder !== 'undefined' &&
      typeof MediaRecorder.isTypeSupported === 'function' &&
      MediaRecorder.isTypeSupported(c)
    );
    const mime = supportedCandidates[0] || 'video/webm';
    const isDirectMp4 = false;

    const recorder = new MediaRecorder(combinedStream, { mimeType: mime });
    const chunks: Blob[] = [];
    let recorderError: Error | null = null;

    recorder.onerror = (event: Event) => {
      const mediaError = (event as any)?.error;
      recorderError = new Error(mediaError?.message || 'The browser stopped recording unexpectedly.');
    };

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    // Draw frame 0 before starting recorder
    if (plan.scenes.length > 0) {
      drawSceneFrame(ctx, plan.scenes[0], 0, plan.scenes.length, 0, plan.title);
    }

    // Timeslice = 250ms flushes data chunks continuously to avoid empty buffers
    recorder.start(250);

    const totalScenes = plan.scenes.length;

    for (let i = 0; i < totalScenes; i++) {
      if (stopRenderingRef.current) break;
      setCurrentPreviewScene(i);
      const scene = plan.scenes[i];
      const audioBuffer = audioBuffers[i];
      
      const sceneDurationSec = scene.seconds;
      setRenderStatusText(`Recording Scene ${i + 1} / ${totalScenes}: "${scene.title}"...`);

      if (audioBuffer && audioCtx && audioDest) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = getFitPlaybackRate(audioBuffer.duration, sceneDurationSec, voiceSpeed);
        source.connect(audioDest);
        source.connect(audioCtx.destination);
        source.start();
      }

      const startTime = performance.now();
      const totalMs = sceneDurationSec * 1000;

      while (performance.now() - startTime < totalMs) {
        if (stopRenderingRef.current) break;
        const elapsed = performance.now() - startTime;
        const fraction = Math.min(1, elapsed / totalMs);
        drawSceneFrame(ctx, scene, i, totalScenes, fraction, plan.title, false, getAudioTalkLevel(audioBuffer, elapsed / 1000));
        await new Promise((r) => requestAnimationFrame(r));
      }

      setRenderProgress(30 + Math.round(((i + 1) / totalScenes) * 60));
    }

    // Closing scene
    if (!stopRenderingRef.current) {
      setRenderStatusText('Recording outro scene...');
      setCurrentPreviewScene(totalScenes);
      const closingDurationSec = plan.closingSeconds ?? 4;

      if (closingBuffer && audioCtx && audioDest) {
        const source = audioCtx.createBufferSource();
        source.buffer = closingBuffer;
        source.playbackRate.value = getFitPlaybackRate(closingBuffer.duration, closingDurationSec, voiceSpeed);
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
        drawSceneFrame(ctx, closeSceneObj, totalScenes, totalScenes, fraction, plan.title, true, 0);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    const recorderStopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
    });
    recorder.stop();
    await recorderStopped;

    combinedStream.getTracks().forEach((t) => t.stop());
    if (audioCtx && audioCtx.state !== 'closed') {
      await audioCtx.close().catch(() => {});
    }

    if (chunks.length === 0) {
      setIsRendering(false);
      throw new Error('No video data was recorded. Please try rendering again.');
    }
    if (recorderError) {
      setIsRendering(false);
      throw recorderError;
    }

    const recordedBlob = new Blob(chunks, { type: mime });
    const expectedDurationSec = plan.scenes.reduce((acc, s) => acc + s.seconds, 0) + (plan.closingSeconds ?? 4);
    const minimumAcceptableDurationSec = Math.max(5, expectedDurationSec * 0.90);

    setRenderStatusText('Checking recorded video…');
    const recordedDurationSec = await getBlobDurationSeconds(recordedBlob);
    if (recordedDurationSec !== null && recordedDurationSec < minimumAcceptableDurationSec) {
      setIsRendering(false);
      throw new Error(
        'Export stopped because the recording was only ' + recordedDurationSec.toFixed(1) +
        's; the video should be about ' + expectedDurationSec + 's. Keep this page open and the screen awake during export, then try again.'
      );
    }

    const finalBlob = recordedBlob;
    const finalType: 'mp4' | 'webm' = 'webm';

    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const newBlobUrl = URL.createObjectURL(finalBlob);
    setVideoFileType(finalType);
    setVideoUrl(newBlobUrl);
    setIsRendering(false);
    setRenderProgress(100);
    setRenderStatusText('2-minute WebM video generated successfully — ready to download.');
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
      if (!res.ok) throw new Error(data.error || 'Failed to start Veo video generation.');

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
    const maxAttempts = 60;

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

  const sampleTopics = [
    'How Photosynthesis Powers Life on Earth',
    '3 Steps to Master Clean Code & Refactoring',
    'Why Black Holes Bend Space and Time',
    '5 Essential Prompting Strategies for AI',
  ];

  // All Hooks are declared above this visibility guard so their order never changes between renders.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div 
        className="w-full max-w-6xl max-h-[96vh] overflow-y-auto rounded-3xl bg-white shadow-2xl flex flex-col border border-slate-200"
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
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">Create AI-directed videos with synchronized voiceover narration.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="flex flex-col flex-1">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              {[
                ['1', 'Set up', !plan],
                ['2', 'Storyboard', !!plan],
                ['3', 'Voiceover', voiceoverReady],
                ['4', 'Preview & export', !!videoUrl],
              ].map(([num, label, active]) => (
                <div key={String(num)} className="flex items-center gap-2">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center ${active ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-300 text-slate-500'}`}>{num}</span>
                  <span className={active ? 'text-indigo-700' : 'text-slate-500'}>{label}</span>
                  {num !== '4' && <span className="text-slate-300">→</span>}
                </div>
              ))}
              <div className="ml-auto px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                {duration === '120' ? '2:00 target' : `${duration}s target`}
              </div>
            </div>
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
                <div className="flex items-center gap-2">
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 p-2 text-xs bg-white text-slate-800 font-medium"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.desc}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handlePreviewVoice(voiceName)}
                    disabled={isPreviewingVoice}
                    className="shrink-0 px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200"
                    title="Listen to a sample of this voice"
                  >
                    {isPreviewingVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isPreviewingVoice ? 'Playing…' : 'Test Voice'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                      Pacing: {voiceSpeed}x
                    </label>
                    <div className="flex items-center gap-1">
                      {[0.85, 1.0, 1.15].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setVoiceSpeed(spd)}
                          className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                            voiceSpeed === spd ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                      Volume: {Math.round(voiceVolume * 100)}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={voiceVolume}
                      onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded appearance-none accent-indigo-600 cursor-pointer mt-1.5"
                    />
                  </div>
                </div>
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
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </section>

            {/* Right Workspace / Player */}
            <section className="p-6 bg-slate-50 flex flex-col justify-between">
              {!plan ? (
                <div className="min-h-[480px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Film className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Start by Generating a Storyboard</h3>
                  <p className="max-w-md text-xs text-slate-500 leading-relaxed">
                    Davis AI will write your title, hook, scenes, visual directions, and spoken narration. You can play it immediately with live speech or export a WebM video file!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
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

                  {/* VISIBLE Canvas Presentation Screen */}
                  <div className="rounded-2xl overflow-hidden border border-slate-300 bg-slate-950 shadow-md relative aspect-video flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={1280}
                      height={720}
                      className="w-full h-full object-contain"
                    />

                    {/* Overlay Player Controls */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-white text-xs">
                      <div className="flex items-center gap-2">
                        {!isPlayingLive ? (
                          <button
                            onClick={handlePlayLivePresentation}
                            disabled={isRendering}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Play Presentation</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleStopLivePlay}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 font-bold transition-all cursor-pointer shadow-sm"
                          >
                            <Pause className="w-3.5 h-3.5 fill-white" />
                            <span>Pause</span>
                          </button>
                        )}

                        <span className="text-slate-300 text-[11px] ml-1">
                          Slide {Math.min(currentPreviewScene + 1, plan.scenes.length)} of {plan.scenes.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            handleStopLivePlay();
                            setCurrentPreviewScene((prev) => Math.max(0, prev - 1));
                          }}
                          disabled={currentPreviewScene <= 0 || isRendering}
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          title="Previous slide"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            handleStopLivePlay();
                            setCurrentPreviewScene((prev) => Math.min(plan.scenes.length - 1, prev + 1));
                          }}
                          disabled={currentPreviewScene >= plan.scenes.length - 1 || isRendering}
                          className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                          title="Next slide"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Voiceover Generation */}
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5"><Volume2 className="h-4 w-4" /> Voiceover</div>
                        <p className="text-[11px] text-indigo-700 mt-0.5">{voiceoverReady ? "Ready — " + voiceName + " narration is attached to the video." : "Generate the spoken narration before exporting."}</p>
                      </div>
                      <button onClick={() => handleGenerateVoiceover(undefined, true)} disabled={isGeneratingVoice || isRendering || isPlayingLive} className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                        {isGeneratingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : voiceoverReady ? <CheckCircle2 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        <span>{isGeneratingVoice ? "Generating Voice…" : voiceoverReady ? "Regenerate Voice" : "Generate Voiceover"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Render & Export Actions */}
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      {!isRendering ? (
                        <button
                          onClick={async () => {
                            try {
                              await handleRenderVideo();
                            } catch (err: any) {
                              console.error('Video export failed:', err);
                              setIsRendering(false);
                              setIsConvertingMp4(false);
                              const message = err?.message || 'Video export failed. Please try again.';
                              setError(message);
                              setRenderStatusText(message);
                            }
                          }}
                          disabled={isPlayingLive || isGeneratingVoice || !voiceoverReady}
                          className="w-full sm:flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                        >
                          <Tv className="h-4 w-4 text-emerald-400" />
                          <span>{voiceoverReady ? 'Export Video File (WebM 16:9)' : 'Generate Voiceover First'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleStopRendering}
                          className="w-full sm:flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                        >
                          <Square className="h-4 w-4 fill-white" />
                          <span>Stop Recording</span>
                        </button>
                      )}

                      {videoUrl && (
                        <a
                          href={videoUrl}
                          download={`${plan.title.replace(/\s+/g, '-').toLowerCase() || 'davis-ai-video'}.${videoFileType}`}
                          className="w-full sm:w-auto px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Video File</span>
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

                  {/* Exported Video Player Section */}
                  {videoUrl && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-4 shadow-md space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Exported Video Ready for Playback & Download
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          WebM 16:9 with Voiceover Audio
                        </span>
                      </div>

                      <VideoPlayer
                        src={videoUrl}
                        title={plan.title}
                        duration={plan.scenes.reduce((acc, s) => acc + s.seconds, 0) + (plan.closingSeconds || 4)}
                        downloadFilename={`${plan.title.replace(/\s+/g, '-').toLowerCase() || 'davis-ai-video'}.${videoFileType}`}
                      />
                    </div>
                  )}

                  {/* Scene-by-Scene Review */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Storyboard Scenes ({plan.scenes.length})
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        Total: {Math.round(plan.scenes.reduce((acc, s) => acc + s.seconds, 0) + (plan.closingSeconds ?? 4))}s
                      </div>
                    </div>
                    {plan.scenes.map((scene, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          handleStopLivePlay();
                          setCurrentPreviewScene(i);
                        }}
                        className={`rounded-xl border p-4 transition-all cursor-pointer ${
                          currentPreviewScene === i
                            ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-600">
                            SCENE {i + 1}
                          </span>
                          <span className="text-xs text-slate-400">~{scene.seconds}s</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{scene.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          <strong className="text-slate-700">Visual Direction:</strong> {scene.visual}
                        </p>
                        <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic mt-2">
                          "{scene.narration}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
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
                Veo creates photorealistic and cinematic AI video clips from text prompts. (Requires a paid API key with video generation quota).
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
                    Video generation typically takes 1 to 3 minutes.
                  </p>
                </div>
              )}

              {veoError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Google Veo Notice
                  </div>
                  <p>{veoError}</p>
                  <p className="text-[11px] text-indigo-700 font-semibold pt-1">
                    Tip: Switch to the <strong>Narrated Producer</strong> tab to generate and play your video with full voiceover immediately!
                  </p>
                </div>
              )}

              {veoVideoUrl && (
                <div className="space-y-3 pt-2">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-lg aspect-video">
                    <video
                      controls
                      playsInline
                      preload="auto"
                      src={veoVideoUrl}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <a
                    href={veoVideoUrl}
                    download="veo-ai-video.mp4"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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