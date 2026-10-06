import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Download, 
  CheckCircle2,
  Tv
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  duration?: number;
  downloadFilename?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title = 'Davis AI Video',
  duration: providedDuration = 60,
  downloadFilename = 'davis-ai-video.webm',
  autoPlay = false,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(providedDuration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Sync duration if providedDuration changes
  useEffect(() => {
    if (providedDuration && providedDuration > 0) {
      setDuration(providedDuration);
    }
  }, [providedDuration]);

  // Initial setup when src changes
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);

    if (autoPlay) {
      vid.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [src, autoPlay]);

  const handleLoadedMetadata = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    if (isFinite(vid.duration) && vid.duration > 0) {
      setDuration(Math.round(vid.duration));
    } else if (providedDuration) {
      setDuration(providedDuration);
    }
  };

  const handleTimeUpdate = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (vid.paused || vid.ended) {
      vid.play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          console.warn('Playback request failed:', e);
          setIsPlaying(false);
        });
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleReplay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = 0;
    setCurrentTime(0);
    vid.play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const target = parseFloat(e.target.value);
    vid.currentTime = target;
    setCurrentTime(target);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const nextMuted = !isMuted;
    vid.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vid = videoRef.current;
    if (!vid) return;
    const newVol = parseFloat(e.target.value);
    vid.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      vid.muted = false;
      setIsMuted(false);
    }
  };

  const handleRateChange = (rate: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-300 shadow-xl aspect-video group select-none flex items-center justify-center"
    >
      {/* Video Media Element */}
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
      />

      {/* Top Banner on hover */}
      <div 
        className={`absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 text-white">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs">
            <Tv className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight truncate max-w-[280px] sm:max-w-md">
            {title}
          </span>
        </div>

        <a
          href={src}
          download={downloadFilename}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-semibold transition-colors backdrop-blur-md cursor-pointer"
          title="Download video file"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>
      </div>

      {/* Center Big Play/Pause Splash Overlay */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 backdrop-blur-sm"
          title="Play video"
        >
          <Play className="w-7 h-7 fill-white ml-1" />
        </button>
      )}

      {/* Bottom Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-3 pt-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 z-10 space-y-2 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar Scrubber */}
        <div className="relative w-full flex items-center group/scrubber cursor-pointer">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
            style={{
              background: `linear-gradient(to right, #6366f1 ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)`
            }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Replay */}
            <button
              onClick={handleReplay}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Time Stamp */}
            <span className="font-mono text-[11px] text-slate-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1 ml-2 group/volume">
              <button
                onClick={toggleMute}
                className="p-1 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-white/30 rounded-lg appearance-none accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Selector */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-[10px] font-semibold">
              {[1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handleRateChange(rate)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    playbackRate === rate ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
