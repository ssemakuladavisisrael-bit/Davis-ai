import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Menu, 
  Plus, 
  Sparkles, 
  ArrowDown, 
  HelpCircle, 
  Sliders, 
  RotateCcw,
  ShieldAlert,
  Zap,
  Brain
} from 'lucide-react';
import { Conversation, Message, ServerStatus, PersonaTone, ModelChoice } from './types';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { HelpModal } from './components/HelpModal';
import { SettingsModal } from './components/SettingsModal';
import { VideoStudio } from './components/VideoStudio';

const STORAGE_KEY_CONVOS = 'davis_ai_conversations';
const STORAGE_KEY_TONE = 'davis_ai_tone';
const STORAGE_KEY_CUSTOM_INSTR = 'davis_ai_custom_instruction';
const STORAGE_KEY_MODEL = 'davis_ai_model';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVOS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load conversations from storage:', e);
    }
    return [];
  });

  const [activeId, setActiveId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONVOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return null;
  });

  const [tone, setTone] = useState<PersonaTone>(() => {
    return (localStorage.getItem(STORAGE_KEY_TONE) as PersonaTone) || 'balanced';
  });

  const [model, setModel] = useState<ModelChoice>(() => {
    return (localStorage.getItem(STORAGE_KEY_MODEL) as ModelChoice) || 'gemini-3.1-flash-lite';
  });

  const [customInstruction, setCustomInstruction] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_CUSTOM_INSTR) || '';
  });

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVideoStudioOpen, setIsVideoStudioOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check server health and Gemini API key status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setServerStatus(data);
        }
      } catch (err) {
        console.warn('Server health check error:', err);
      }
    };
    checkHealth();
  }, []);

  // Save conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONVOS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, [conversations]);

  // Save settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TONE, tone);
  }, [tone]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODEL, model);
  }, [model]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CUSTOM_INSTR, customInstruction);
  }, [customInstruction]);

  // Global keyboard shortcuts (Ctrl/Cmd + K for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Handle scroll detection for floating scroll-to-bottom button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 160;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom(false);
    }
  }, [isStreaming, activeConversation?.messages]);

  const handleNewChat = () => {
    if (activeConversation && activeConversation.messages.length === 0) {
      return;
    }
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    setInput('');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleClearAllConversations = () => {
    setConversations([]);
    setActiveId(null);
    setInput('');
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Build persona-based system instruction
  const getSystemInstruction = () => {
    let base = `You are Davis AI, a helpful, intelligent, friendly, and honest conversational assistant.
Your goal is to help users with learning, coding, writing, brainstorming, and everyday questions.
Guidelines:
1. Always format responses with clean Markdown: headers, lists, and code blocks with language tags.
2. Be honest when you are uncertain about something or when information is speculative.
3. If asked about your identity, state that you are Davis AI, powered by Google Gemini.`;

    if (tone === 'creative') {
      base += `\nTone adjustment: Be particularly imaginative, expressive, vibrant, and engaging. Offer creative perspectives.`;
    } else if (tone === 'precise') {
      base += `\nTone adjustment: Be concise, direct, factual, and strictly focused. Avoid unnecessary fluff and get straight to the point.`;
    }

    if (customInstruction.trim()) {
      base += `\nAdditional user instructions: ${customInstruction.trim()}`;
    }

    return base;
  };

  // Main message send logic
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;

    let targetConvId = activeId;
    let targetMessages: Message[] = [];

    // Auto-create conversation if none exists
    if (!targetConvId || !activeConversation) {
      const newId = `conv-${Date.now()}`;
      const cleanTitle = textToSend.trim().slice(0, 32) + (textToSend.trim().length > 32 ? '...' : '');
      const newConv: Conversation = {
        id: newId,
        title: cleanTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newId);
      targetConvId = newId;
      targetMessages = [];
    } else {
      targetMessages = [...activeConversation.messages];
      if (activeConversation.messages.length === 0 || activeConversation.title === 'New Chat') {
        const cleanTitle = textToSend.trim().slice(0, 32) + (textToSend.trim().length > 32 ? '...' : '');
        handleRenameConversation(targetConvId, cleanTitle);
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = `msg-${Date.now()}-assistant`;
    const assistantMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    const updatedMessages = [...targetMessages, userMessage, assistantMessage];

    // Optimistically update conversation state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetConvId
          ? {
              ...c,
              messages: updatedMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setInput('');
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    // Prepare clean history for multi-turn model context (skip errors and blanks)
    const validHistory = targetMessages.filter(
      (m) => !m.isError && typeof m.content === 'string' && m.content.trim() !== ''
    );
    const historyPayload = [...validHistory, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyPayload,
          systemInstruction: getSystemInstruction(),
          temperature: tone === 'creative' ? 0.9 : tone === 'precise' ? 0.3 : 0.7,
          model,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const dataStr = trimmed.slice(6).trim();
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== targetConvId) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantPlaceholderId
                        ? { ...m, content: accumulatedText }
                        : m
                    ),
                  };
                })
              );
            }
          } catch (jsonErr) {
            // Non-JSON SSE line or parse error
          }
        }
      }

      // Final check: if text is empty, display helpful notice
      if (!accumulatedText.trim()) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? {
                      ...m,
                      content: "I apologize, but I couldn't generate a response. Please verify that your Gemini API key is active or try again.",
                      isError: true,
                    }
                  : m
              ),
            };
          })
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user.');
      } else {
        console.error('Chat error:', err);
        const errorMsg =
          err?.message || 'Failed to connect to Davis AI. Please check your network and Gemini API key.';
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantPlaceholderId
                  ? { ...m, content: errorMsg, isError: true }
                  : m
              ),
            };
          })
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetryLastTurn = () => {
    if (!activeConversation || activeConversation.messages.length < 2 || isStreaming) return;

    const msgs = [...activeConversation.messages];
    if (msgs[msgs.length - 1].role === 'assistant') {
      msgs.pop();
    }
    const lastUserMessage = msgs.pop();
    if (!lastUserMessage || lastUserMessage.role !== 'user') return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, messages: msgs }
          : c
      )
    );

    handleSendMessage(lastUserMessage.content);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={setActiveId}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        serverStatus={serverStatus}
        model={model}
      />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fbfcfd] relative overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur px-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Open conversations sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm hidden sm:inline">Davis AI</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-xs font-medium text-slate-600 truncate max-w-[160px] sm:max-w-xs">
                {activeConversation?.title || 'New Conversation'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Model Selector Pill */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setModel('gemini-3.1-flash-lite')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  model === 'gemini-3.1-flash-lite'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ultra Fast Response (~0.8s)"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Fast Lite</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('gemini-3.8-flash')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  model === 'gemini-3.8-flash'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Deep Reasoning"
              >
                <Brain className="w-3 h-3 text-indigo-600" />
                <span className="hidden sm:inline">Reasoning 3.8</span>
              </button>
            </div>

            {!serverStatus?.hasApiKey && (
              <button
                onClick={() => setIsHelpOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Missing API Key</span>
              </button>
            )}

            <button
              onClick={() => setIsVideoStudioOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Open Video Studio"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Video</span>
            </button>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-xs"
              title="Start a new chat (⌘K)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>

            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Help & Run Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message View Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto no-scrollbar flex flex-col"
        >
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <WelcomeScreen
              onSelectPrompt={handleSendMessage}
              hasApiKey={Boolean(serverStatus?.hasApiKey)}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          ) : (
            <div className="py-4 space-y-1">
              {activeConversation.messages.map((msg, index) => {
                const isLastAssistant =
                  msg.role === 'assistant' &&
                  index === activeConversation.messages.length - 1;

                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && isLastAssistant}
                    isLastAssistant={isLastAssistant}
                    onRetry={handleRetryLastTurn}
                  />
                );
              })}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {/* Floating Scroll-to-Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute right-6 bottom-24 p-2 rounded-full bg-white text-slate-700 border border-slate-200 shadow-lg hover:bg-slate-50 transition-all cursor-pointer z-20 flex items-center justify-center animate-bounce"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4 text-indigo-600" />
          </button>
        )}

        {/* Chat Input Bar */}
        <div className="bg-gradient-to-t from-white via-white/95 to-transparent pt-3">
          <ChatInput
            input={input}
            setInput={setInput}
            onSend={handleSendMessage}
            onStop={handleStopStreaming}
            isStreaming={isStreaming}
            disabled={false}
          />
        </div>
      </main>

      {/* Beginner Setup & Publishing Guide Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        hasApiKey={Boolean(serverStatus?.hasApiKey)}
      />

      {/* AI Video Studio */}
      <VideoStudio
        isOpen={isVideoStudioOpen}
        onClose={() => setIsVideoStudioOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tone={tone}
        onToneChange={setTone}
        model={model}
        onModelChange={setModel}
        customInstruction={customInstruction}
        onCustomInstructionChange={setCustomInstruction}
        onClearAllConversations={handleClearAllConversations}
      />
    </div>
  );
}
