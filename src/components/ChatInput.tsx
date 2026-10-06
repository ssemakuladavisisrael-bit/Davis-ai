import React, { useRef, useEffect } from 'react';
import { Send, Square, Sparkles, CornerDownLeft } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on text height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && input.trim()) {
        onSend(input);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) {
      onStop();
      return;
    }
    if (input.trim()) {
      onSend(input);
    }
  };

  const handleAddPromptModifier = (modifier: string) => {
    if (input.trim()) {
      setInput(`${input.trim()} (${modifier})`);
    } else {
      setInput(modifier);
    }
    textareaRef.current?.focus();
  };

  const modifiers = [
    'Explain step-by-step',
    'Include code sample',
    'Summarize concisely',
    'Beginner friendly',
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 sm:pb-6">
      {/* Quick helper tags (visible when textarea is empty) */}
      {!input && !isStreaming && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 no-scrollbar">
          <span className="text-[11px] text-slate-600 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            Quick tips:
          </span>
          {modifiers.map((mod, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAddPromptModifier(mod)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors whitespace-nowrap cursor-pointer border border-slate-200/60"
            >
              {mod}
            </button>
          ))}
        </div>
      )}

      {/* Main input wrapper */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-2xl border border-slate-300 bg-white shadow-lg shadow-slate-200/50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={isStreaming ? 'Davis AI is thinking...' : 'Message Davis AI... (Press Enter to send)'}
            className="w-full resize-none bg-transparent py-3.5 pl-4 pr-14 text-sm text-slate-800 placeholder-slate-400 focus:outline-none max-h-44 leading-relaxed"
          />

          {/* Action Button: Send or Stop */}
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                title="Stop response"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || disabled}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !disabled
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30 cursor-pointer'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Small footer disclaimer & shortcut indicator */}
        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-600">
          <div className="truncate">
            Davis AI can make mistakes. Please verify important technical, legal, or medical facts.
          </div>
          <div className="hidden sm:flex items-center gap-1 shrink-0 ml-2">
            <span>Shift + Enter for new line</span>
            <CornerDownLeft className="w-3 h-3 text-slate-300" />
          </div>
        </div>
      </form>
    </div>
  );
};
