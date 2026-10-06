import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ThumbsUp, 
  ThumbsDown, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  Film,
  Play,
  Sliders,
  Tv
} from 'lucide-react';
import { Message, VideoStudioConfig } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  isLastAssistant?: boolean;
  onRetry?: () => void;
  onOpenVideoStudio?: (topic?: string, config?: VideoStudioConfig) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  isLastAssistant = false,
  onRetry,
  onOpenVideoStudio,
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isUser = message.role === 'user';

  // Detect whether this message represents a video concept, storyboard, or video script
  const videoDetails = useMemo(() => {
    if (isUser || isStreaming || !message.content) return null;
    const lower = message.content.toLowerCase();
    const hasScenes = lower.includes('### scene') || lower.includes('scene 1') || lower.includes('**scene 1');
    const hasVideoMention = lower.includes('video storyboard') || lower.includes('video title') || lower.includes('davis_video_prompt');
    const hasScriptTerms = lower.includes('narration') && (lower.includes('visual direction') || lower.includes('visual'));

    if (!hasScenes && !hasVideoMention && !hasScriptTerms) return null;

    // Extract title if available
    const titleMatch = message.content.match(/(?:# Video Title:|Video Title:|\*\*Video Title:\*\*|\*\*Title:\*\*)\s*([^\n\r]+)/i);
    let title = titleMatch ? titleMatch[1].replace(/[*_#`]/g, '').trim() : '';
    if (!title) {
      const topicMatch = message.content.match(/Topic:\s*([^\n\r]+)/i);
      if (topicMatch) title = topicMatch[1].replace(/[*_#`]/g, '').trim();
    }
    if (!title) {
      title = 'AI Directed Video Presentation';
    }

    // Count scenes
    const sceneMatches = message.content.match(/Scene\s+\d+/gi);
    const sceneCount = sceneMatches ? sceneMatches.length : 5;

    // Detect voice if specified
    const voiceMatch = message.content.match(/Voice:\s*(Puck|Charon|Kore|Fenrir|Zephyr)/i);
    const voiceName = voiceMatch ? voiceMatch[1] : 'Puck';

    // Build the topic for VideoStudio
    const topic = title || message.content.slice(0, 120);

    return {
      title,
      sceneCount,
      voiceName,
      topic,
    };
  }, [message.content, isUser, isStreaming]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text of markdown characters for cleaner audio
    const cleanText = message.content
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/[*_#`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (isUser) {
    return (
      <div className="flex justify-end py-3 px-4 sm:px-6">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-indigo-600 text-white shadow-sm shadow-indigo-600/10">
          <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className={`py-4 px-4 sm:px-6 transition-colors ${message.isError ? 'bg-rose-50/50' : 'bg-transparent'}`}>
      <div className="max-w-3xl mx-auto flex items-start gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 shadow-sm shadow-indigo-500/20 flex items-center justify-center text-white ring-2 ring-indigo-50">
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Name & Timestamp */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight">Davis AI</span>
            <span className="text-[11px] text-slate-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Body */}
          {message.isError ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="font-semibold text-rose-900">Unable to complete response</div>
                <p className="leading-relaxed">{message.content}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer transition-colors mt-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative">
              {isStreaming && !message.content ? (
                <div className="flex items-center gap-2.5 py-1 text-slate-500 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                  </div>
                  <span className="text-slate-500 font-medium text-xs">Davis AI is thinking...</span>
                </div>
              ) : (
                <>
                  <MarkdownRenderer content={message.content} />
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-indigo-600 animate-pulse align-middle" />
                  )}
                </>
              )}
            </div>
          )}

          {/* Interactive Video Production Card if video content is detected */}
          {!isStreaming && !message.isError && videoDetails && onOpenVideoStudio && (
            <div className="my-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/50 border border-indigo-200/90 p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-indigo-950">
                        {videoDetails.title}
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded-md">
                        {videoDetails.sceneCount} Scenes
                      </span>
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                        <Volume2 className="w-2.5 h-2.5" /> Voiceover: {videoDetails.voiceName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ready to play with motion graphics, visuals, and voiceover narration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => onOpenVideoStudio(videoDetails.topic, {
                    topic: videoDetails.topic,
                    voiceName: videoDetails.voiceName,
                    autoPlay: true,
                    mode: 'narrated'
                  })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  title="Play video with real-time voiceover"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Play Video with Voiceover</span>
                </button>

                <button
                  onClick={() => onOpenVideoStudio(videoDetails.topic, {
                    topic: videoDetails.topic,
                    voiceName: videoDetails.voiceName,
                    autoPlay: false,
                    mode: 'narrated'
                  })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
                  title="Customize scenes, change narrator voice, or export video file"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Customize & Export</span>
                </button>
              </div>
            </div>
          )}

          {/* Action toolbar (Copy, Speak, Feedback, Retry) */}
          {!isStreaming && !message.isError && message.content && (
            <div className="pt-2 flex flex-wrap items-center gap-1 sm:gap-2 text-slate-400 text-xs">
              {/* Copy Response */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Copy entire response"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-medium text-[11px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>

              {/* Text-to-speech */}
              {'speechSynthesis' in window && (
                <button
                  onClick={handleToggleSpeak}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    isSpeaking
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title={isSpeaking ? 'Stop reading' : 'Read response aloud'}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                      <span className="text-[11px]">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Read</span>
                    </>
                  )}
                </button>
              )}

              {/* Feedback */}
              <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-2">
                <button
                  onClick={() => setFeedback(feedback === 'liked' ? null : 'liked')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    feedback === 'liked'
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title="Good response"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setFeedback(feedback === 'disliked' ? null : 'disliked')}
                  className={`p-1 rounded-md transition-colors cursor-pointer ${
                    feedback === 'disliked'
                      ? 'text-rose-600 bg-rose-50'
                      : 'hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title="Needs improvement"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Video Studio Action if relevant */}
              {onOpenVideoStudio && (message.content.toLowerCase().includes('video') || message.content.toLowerCase().includes('scene') || message.content.toLowerCase().includes('storyboard')) && (
                <button
                  onClick={() => onOpenVideoStudio(message.content.slice(0, 80))}
                  className="flex items-center gap-1 px-2 py-0.8 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer border border-indigo-200/80 font-medium text-[11px]"
                  title="Open this concept in Davis Video Studio"
                >
                  <Film className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Render Video</span>
                </button>
              )}

              {/* Retry button for latest turn */}
              {isLastAssistant && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
                  title="Regenerate this response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Regenerate</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
