import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Play, Pause, Scissors, Trash2, ArrowUp, ArrowDown, Download, Type, Film, Clock3, Plus, AlertCircle } from 'lucide-react';

type Clip = {
  id: string;
  name: string;
  url: string;
  duration: number;
  start: number;
  end: number;
  ownedUrl: boolean;
};

interface VideoEditorTimelineProps {
  initialVideos?: Array<{ url: string; name: string }>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function VideoEditorTimeline({ initialVideos = [] }: VideoEditorTimelineProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [captionSize, setCaptionSize] = useState(30);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [notice, setNotice] = useState('Upload video clips to start editing. Your clips stay in this browser.');
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopExportRef = useRef(false);
  const selectedClip = clips.find((clip) => clip.id === selectedId) ?? clips[0] ?? null;
  const totalDuration = clips.reduce((sum, clip) => sum + Math.max(0, clip.end - clip.start), 0);

  useEffect(() => {
    if (!initialVideos.length) return;
    setClips((existing) => {
      const known = new Set(existing.map((clip) => clip.url));
      const additions = initialVideos.filter((item) => item.url && !known.has(item.url)).map((item) => ({
        id: `generated-${Math.random().toString(36).slice(2)}`,
        name: item.name,
        url: item.url,
        duration: 0,
        start: 0,
        end: 0,
        ownedUrl: false,
      }));
      return additions.length ? [...existing, ...additions] : existing;
    });
  }, [initialVideos]);

  useEffect(() => {
    return () => {
      clips.forEach((clip) => {
        if (clip.ownedUrl) URL.revokeObjectURL(clip.url);
      });
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedClip) return;
    if (video.src !== selectedClip.url) {
      video.src = selectedClip.url;
      video.load();
    } else if (video.readyState >= 1) {
      video.currentTime = clamp(selectedClip.start, 0, Math.max(0, selectedClip.duration));
    }
    setIsPlaying(false);
  }, [selectedId, selectedClip?.url]);

  const updateClip = useCallback((id: string, patch: Partial<Clip>) => {
    setClips((items) => items.map((clip) => clip.id === id ? { ...clip, ...patch } : clip));
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const additions = Array.from(files).filter((file) => file.type.startsWith('video/')).map((file) => {
      const url = URL.createObjectURL(file);
      return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: file.name, url, duration: 0, start: 0, end: 0, ownedUrl: true };
    });
    if (!additions.length) {
      setNotice('Choose video files such as MP4, WebM or MOV.');
      return;
    }
    setClips((items) => [...items, ...additions]);
    setSelectedId(additions[0].id);
    setNotice(`Added ${additions.length} video clip(s). Select a clip to trim, split or reorder it.`);
  };

  const handleMetadata = (clip: Clip, duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    updateClip(clip.id, { duration, end: clip.end > clip.start ? Math.min(clip.end, duration) : duration });
    setCurrentTime(clip.start);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !selectedClip) return;
    if (video.paused) {
      try {
        if (video.currentTime < selectedClip.start || video.currentTime >= selectedClip.end) video.currentTime = selectedClip.start;
        await video.play();
        setIsPlaying(true);
      } catch {
        setNotice('The preview could not play this file. Try another video format.');
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const splitAtPlayhead = () => {
    if (!selectedClip) return;
    const video = videoRef.current;
    const cut = video?.currentTime ?? currentTime;
    if (cut <= selectedClip.start + 0.1 || cut >= selectedClip.end - 0.1) {
      setNotice('Move the playhead inside the selected clip before splitting it.');
      return;
    }
    const left: Clip = { ...selectedClip, id: `${selectedClip.id}-a-${Date.now()}`, end: cut };
    const right: Clip = { ...selectedClip, id: `${selectedClip.id}-b-${Date.now()}`, start: cut };
    setClips((items) => {
      const index = items.findIndex((clip) => clip.id === selectedClip.id);
      const next = [...items];
      next.splice(index, 1, left, right);
      return next;
    });
    setSelectedId(right.id);
    setNotice('Clip split at the playhead. Both parts remain on the timeline.');
  };

  const moveClip = (direction: -1 | 1) => {
    if (!selectedClip) return;
    setClips((items) => {
      const index = items.findIndex((clip) => clip.id === selectedClip.id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeClip = (id: string) => {
    const removed = clips.find((clip) => clip.id === id);
    if (removed?.ownedUrl) URL.revokeObjectURL(removed.url);
    const next = clips.filter((clip) => clip.id !== id);
    setClips(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    setNotice('Clip removed from the edit.');
  };

  const exportVideo = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !clips.length) return;
    if (!('MediaRecorder' in window) || !canvas.captureStream) {
      setNotice('Video export is not supported in this browser. Try the latest Chrome or Edge on your computer.');
      return;
    }
    const ordered = clips.filter((clip) => clip.end > clip.start && clip.duration > 0);
    if (!ordered.length) {
      setNotice('Wait for the video clips to finish loading, then export again.');
      return;
    }
    stopExportRef.current = false;
    setIsExporting(true);
    setExportProgress(0);
    setNotice('Rendering your timeline in real time. Keep this tab open until export finishes.');
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context) {
      setIsExporting(false);
      setNotice('Could not initialize the video renderer.');
      return;
    }
    const canvasStream = canvas.captureStream(30);
    let combinedStream = canvasStream;
    let audioCapture: MediaStream | null = null;
    const maybeCapture = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    try {
      audioCapture = maybeCapture.captureStream?.() ?? maybeCapture.mozCaptureStream?.() ?? null;
      if (audioCapture) audioCapture.getAudioTracks().forEach((track) => combinedStream.addTrack(track));
    } catch {
      // Some browsers do not expose captured video-element audio; visual export still works.
    }
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';
    const chunks: BlobPart[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, { mimeType });
    } catch {
      setIsExporting(false);
      setNotice('This browser cannot create a WebM recording. Try current Chrome or Edge.');
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => resolve();
    });
    recorder.start(250);

    const drawFrame = () => {
      context.fillStyle = '#080b14';
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (video.videoWidth && video.videoHeight) {
        const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
        const width = video.videoWidth * scale;
        const height = video.videoHeight * scale;
        context.drawImage(video, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      }
      if (caption.trim()) {
        const fontSize = clamp(captionSize, 16, 64);
        context.font = `600 ${fontSize}px Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'bottom';
        const maxWidth = canvas.width - 100;
        const words = caption.trim().split(/\s+/);
        const lines: string[] = [];
        let line = '';
        words.forEach((word) => {
          const test = line ? `${line} ${word}` : word;
          if (context.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else line = test;
        });
        if (line) lines.push(line);
        const lineHeight = fontSize * 1.25;
        const y = canvas.height - 44;
        lines.slice(-3).forEach((text, index, arr) => {
          const lineY = y - (arr.length - 1 - index) * lineHeight;
          const metrics = context.measureText(text);
          context.fillStyle = 'rgba(0,0,0,0.72)';
          context.fillRect((canvas.width - metrics.width) / 2 - 16, lineY - lineHeight + 4, metrics.width + 32, lineHeight + 10);
          context.fillStyle = '#ffffff';
          context.fillText(text, canvas.width / 2, lineY);
        });
      }
    };

    try {
      let elapsed = 0;
      for (let index = 0; index < ordered.length; index++) {
        if (stopExportRef.current) break;
        const clip = ordered[index];
        video.pause();
        if (video.src !== clip.url) {
          video.src = clip.url;
          video.load();
          await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(() => resolve(), 8000);
            video.onloadedmetadata = () => { window.clearTimeout(timeout); resolve(); };
            video.onerror = () => { window.clearTimeout(timeout); resolve(); };
          });
        }
        if (video.readyState < 1) {
          await new Promise<void>((resolve) => {
            const timeout = window.setTimeout(resolve, 5000);
            video.onloadedmetadata = () => { window.clearTimeout(timeout); resolve(); };
          });
        }
        video.currentTime = clamp(clip.start, 0, Math.max(0, clip.duration - 0.05));
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 2500);
          video.onseeked = () => { window.clearTimeout(timeout); resolve(); };
        });
        drawFrame();
        try { await video.play(); } catch { /* muted/unsupported source can still render frames */ }
        const segmentLength = Math.max(0.1, clip.end - clip.start);
        const started = performance.now();
        await new Promise<void>((resolve) => {
          const tick = () => {
            if (stopExportRef.current || video.currentTime >= clip.end || video.ended) {
              video.pause();
              resolve();
              return;
            }
            drawFrame();
            const fraction = Math.min(1, (performance.now() - started) / (segmentLength * 1000));
            setExportProgress(Math.round(((elapsed + fraction * segmentLength) / totalDuration) * 100));
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        elapsed += segmentLength;
        setExportProgress(Math.round((elapsed / Math.max(0.1, totalDuration)) * 100));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Export stopped unexpectedly.');
    } finally {
      video.pause();
      if (recorder.state !== 'inactive') recorder.stop();
      await finished;
      const blob = new Blob(chunks, { type: mimeType });
      combinedStream.getTracks().forEach((track) => track.stop());
      if (blob.size) {
        const url = URL.createObjectURL(blob);
        setExportUrl(url);
        setNotice(stopExportRef.current ? 'Export stopped early. You can still download the partial render.' : 'Export ready. Download your edited video below.');
      } else {
        setNotice('No video was rendered. Check that the selected source clips play in the preview.');
      }
      setIsExporting(false);
      setExportProgress(100);
      recorderRef.current = null;
    }
  };

  const stopExport = () => {
    stopExportRef.current = true;
    videoRef.current?.pause();
    setNotice('Stopping export after the current frame...');
  };

  const downloadExport = () => {
    if (!exportUrl) return;
    const anchor = document.createElement('a');
    anchor.href = exportUrl;
    anchor.download = 'davis-ai-edited-video.webm';
    anchor.click();
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-300"><Film className="w-5 h-5" /><h2 className="font-bold text-lg">Davis AI Video Editor</h2></div>
            <p className="text-xs text-slate-400 mt-1">Arrange clips, trim, split, add captions and export a WebM video in your browser.</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold cursor-pointer">
            <Upload className="w-4 h-4" /> Import videos
            <input type="file" accept="video/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
          </label>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)] gap-4">
          <section className="rounded-2xl overflow-hidden border border-slate-800 bg-black">
            <div className="aspect-video relative bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                controls={false}
                onLoadedMetadata={(event) => { if (selectedClip) handleMetadata(selectedClip, event.currentTarget.duration); }}
                onTimeUpdate={(event) => {
                  const time = event.currentTarget.currentTime;
                  setCurrentTime(time);
                  if (selectedClip && time >= selectedClip.end && !event.currentTarget.paused) {
                    event.currentTarget.pause();
                    setIsPlaying(false);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {!selectedClip && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3"><Film className="w-12 h-12" /><p className="text-sm">Import videos to begin your edit</p></div>}
              {selectedClip && caption.trim() && <div className="absolute bottom-8 left-5 right-5 text-center pointer-events-none"><span className="inline-block max-w-full bg-black/75 text-white px-3 py-1.5 rounded font-semibold break-words" style={{ fontSize: Math.max(12, captionSize / 2) }}>{caption}</span></div>}
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3 border-t border-slate-800 bg-slate-900">
              <button onClick={togglePlay} disabled={!selectedClip || isExporting} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 px-3 py-2 text-sm"><Play className="w-4 h-4" />{isPlaying ? 'Playing' : 'Play clip'}</button>
              <button onClick={splitAtPlayhead} disabled={!selectedClip || isExporting} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 hover:bg-slate-800 disabled:opacity-40 px-3 py-2 text-sm"><Scissors className="w-4 h-4" />Split at playhead</button>
              <span className="ml-auto text-xs text-slate-400 tabular-nums">{currentTime.toFixed(1)}s / {(selectedClip?.end ?? 0).toFixed(1)}s</span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4">
            <h3 className="font-semibold text-sm">Clip settings</h3>
            {selectedClip ? (
              <>
                <p className="text-xs text-slate-400 break-all">{selectedClip.name}</p>
                <div>
                  <div className="flex justify-between text-xs mb-2"><label>Trim start</label><span>{selectedClip.start.toFixed(1)}s</span></div>
                  <input aria-label="Trim start" type="range" min={0} max={Math.max(0.1, selectedClip.duration)} step={0.1} value={selectedClip.start} onChange={(e) => {
                    const start = Math.min(Number(e.target.value), selectedClip.end - 0.1);
                    updateClip(selectedClip.id, { start });
                    if (videoRef.current) videoRef.current.currentTime = start;
                  }} className="w-full accent-indigo-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2"><label>Trim end</label><span>{selectedClip.end.toFixed(1)}s</span></div>
                  <input aria-label="Trim end" type="range" min={Math.min(selectedClip.duration, selectedClip.start + 0.1)} max={Math.max(0.1, selectedClip.duration)} step={0.1} value={selectedClip.end} onChange={(e) => updateClip(selectedClip.id, { end: Math.max(Number(e.target.value), selectedClip.start + 0.1) })} className="w-full accent-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => moveClip(-1)} disabled={clips.findIndex((clip) => clip.id === selectedClip.id) === 0} className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30 inline-flex items-center justify-center gap-1"><ArrowUp className="w-3.5 h-3.5" />Move earlier</button>
                  <button onClick={() => moveClip(1)} disabled={clips.findIndex((clip) => clip.id === selectedClip.id) === clips.length - 1} className="rounded-lg border border-slate-700 px-3 py-2 text-xs disabled:opacity-30 inline-flex items-center justify-center gap-1"><ArrowDown className="w-3.5 h-3.5" />Move later</button>
                  <button onClick={() => removeClip(selectedClip.id)} className="col-span-2 rounded-lg border border-rose-900/70 text-rose-300 hover:bg-rose-950/40 px-3 py-2 text-xs inline-flex items-center justify-center gap-2"><Trash2 className="w-3.5 h-3.5" />Remove clip</button>
                </div>
              </>
            ) : <p className="text-xs text-slate-500">Select or import a video clip to edit its trim points.</p>}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center gap-2"><Type className="w-4 h-4 text-indigo-300" /><h3 className="font-semibold text-sm">Caption overlay</h3></div>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Type a title or subtitle to show over the video..." className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-indigo-500" />
              <div className="flex items-center justify-between text-xs text-slate-400"><label htmlFor="caption-size">Caption size</label><span>{captionSize}px</span></div>
              <input id="caption-size" aria-label="Caption size" type="range" min={18} max={48} value={captionSize} onChange={(e) => setCaptionSize(Number(e.target.value))} className="w-full accent-indigo-500" />
              <p className="text-[11px] text-slate-500">This caption is burned into the exported video. Timed, word-by-word subtitles are a future improvement.</p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-sm">Editing timeline</h3><p className="text-xs text-slate-400 mt-1">{clips.length} clip(s) · {totalDuration.toFixed(1)} seconds total</p></div><button onClick={() => document.getElementById('timeline-add-videos')?.click()} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs"><Plus className="w-3.5 h-3.5" />Add clips</button><input id="timeline-add-videos" type="file" accept="video/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} /></div>
          {clips.length ? (
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {clips.map((clip, index) => {
                  const seconds = Math.max(0, clip.end - clip.start);
                  return <button key={clip.id} onClick={() => setSelectedId(clip.id)} className={`shrink-0 text-left rounded-xl border p-3 min-w-40 max-w-56 ${clip.id === selectedClip?.id ? 'border-indigo-400 bg-indigo-950/60' : 'border-slate-700 bg-slate-950 hover:border-slate-500'}`} style={{ width: `${Math.max(160, Math.min(280, seconds * 9))}px` }}>
                    <div className="flex items-center gap-2 text-indigo-300 text-[11px] font-semibold"><Film className="w-3.5 h-3.5" />CLIP {index + 1}</div>
                    <p className="text-xs mt-2 truncate" title={clip.name}>{clip.name}</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${clip.duration ? (seconds / clip.duration) * 100 : 0}%` }} /></div>
                    <p className="text-[11px] text-slate-400 mt-2">{seconds.toFixed(1)}s · {clip.start.toFixed(1)}–{clip.end.toFixed(1)}s</p>
                  </button>;
                })}
              </div>
              <p className="text-[11px] text-slate-500">Select a timeline block, then use Move earlier/later to change sequence. Use Split at playhead to create two editable segments.</p>
            </div>
          ) : <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center text-sm text-slate-500">Your clips will appear here in sequence.</div>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-sm">Export video</h3><p className="text-xs text-slate-400 mt-1">Renders the edited sequence in real time. Longer videos take longer to export.</p></div>
            {isExporting ? <button onClick={stopExport} className="rounded-lg border border-rose-800 text-rose-300 px-4 py-2 text-sm">Stop export</button> : <button onClick={exportVideo} disabled={!clips.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-4 py-2.5 text-sm font-semibold"><Download className="w-4 h-4" />Render timeline</button>}
          </div>
          {isExporting && <div className="space-y-1"><div className="flex justify-between text-xs text-slate-400"><span>Rendering WebM</span><span>{exportProgress}%</span></div><div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${exportProgress}%` }} /></div></div>}
          {exportUrl && <button onClick={downloadExport} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold"><Download className="w-4 h-4" />Download edited video (.webm)</button>}
          <div className="flex items-start gap-2 text-xs text-slate-400"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><p>{notice} Export format is WebM in this first version; MP4 conversion, separate audio tracks, transitions and timed subtitles are next steps.</p></div>
        </section>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
