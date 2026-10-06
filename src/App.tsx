import { apiUrl } from './lib/api';
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
  Brain,
  Film,
  ClipboardPaste,
  Search,
  Globe2
} from 'lucide-react';
import { Conversation, Message, ServerStatus, PersonaTone, ModelChoice } from './types';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { HelpModal } from './components/HelpModal';
import { SettingsModal } from './components/SettingsModal';
import { VideoStudio } from './components/VideoStudio';
import { PromptImportModal } from './components/PromptImportModal';
import { ImageStudio } from './components/ImageStudio';
import type { ImportedVideoConfig } from './components/PromptImportModal';

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
  const [isPromptImportOpen, setIsPromptImportOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [videoStudioTopic, setVideoStudioTopic] = useState('');
  const [videoStudioConfig, setVideoStudioConfig] = useState<ImportedVideoConfig | undefined>(undefined);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [researchMode, setResearchMode] = useState(false);

  const openECDCourseworkVideo = () => {
    setVideoStudioConfig({
      topic: "Create an EXACTLY 120-second PowerPoint-style explainer video for Early Childhood Development teachers at His Grace Nursery School, Bahai Road, Kampala. Title: Artificial Intelligence and Basic Prompting Skills for Early Childhood Development Teachers. Use approximately 8 concise slides: 1) title and school, 2) simple definition of AI, 3) benefits of AI for early childhood teachers, 4) how to access an AI tool on a phone/computer, 5) weak vs better prompt, 6) ROLE + TASK + AUDIENCE + DETAILS + FORMAT prompting formula, 7) practical Teaching Practice I, II and III prompts, 8) responsible AI use and conclusion. Teaching Practice I prompt: Create a simple nursery lesson plan for children aged 3–4 on colours, including objectives, materials, activities and assessment. Teaching Practice II prompt: Create five learner-centred classroom activities for teaching shapes to nursery children aged 4–5, including teacher instructions and expected learner responses. Teaching Practice III prompt: Help me prepare teaching practice materials for a nursery lesson on numbers 1–10, including a lesson plan, teaching aids, classroom activities, assessment questions and a short teacher reflection. Include narration and readable on-screen captions. Use child-friendly, colourful, playful educational visuals throughout: cute cartoon children, nursery classroom scenes, ABC blocks, crayons, books, shapes, numbers, smiling teacher illustrations and simple learning icons. Make the visuals eye-catching and warm without making the academic content childish or unprofessional. Use large readable text and avoid overcrowding. Emphasize that teachers should review and adapt AI output and protect children's personal information.",
      audience: 'Early Childhood Development teachers at His Grace Nursery School, Bahai Road, Kampala',
      duration: '120',
      style: 'Child-friendly professional educational PowerPoint presentation, colourful nursery-school visuals, cute cartoon children and classroom illustrations, clean modern academic design, simple language, visually engaging, suitable for university coursework submission',
      voiceName: 'Puck',
      mode: 'narrated',
    });
    setVideoStudioTopic("Create an EXACTLY 120-second PowerPoint-style explainer video for Early Childhood Development teachers at His Grace Nursery School, Bahai Road, Kampala. Title: Artificial Intelligence and Basic Prompting Skills for Early Childhood Development Teachers. Use approximately 8 concise slides: 1) title and school, 2) simple definition of AI, 3) benefits of AI for early childhood teachers, 4) how to access an AI tool on a phone/computer, 5) weak vs better prompt, 6) ROLE + TASK + AUDIENCE + DETAILS + FORMAT prompting formula, 7) practical Teaching Practice I, II and III prompts, 8) responsible AI use and conclusion. Teaching Practice I prompt: Create a simple nursery lesson plan for children aged 3–4 on colours, including objectives, materials, activities and assessment. Teaching Practice II prompt: Create five learner-centred classroom activities for teaching shapes to nursery children aged 4–5, including teacher instructions and expected learner responses. Teaching Practice III prompt: Help me prepare teaching practice materials for a nursery lesson on numbers 1–10, including a lesson plan, teaching aids, classroom activities, assessment questions and a short teacher reflection. Include narration and readable on-screen captions. Use child-friendly, colourful, playful educational visuals throughout: cute cartoon children, nursery classroom scenes, ABC blocks, crayons, books, shapes, numbers, smiling teacher illustrations and simple learning icons. Make the visuals eye-catching and warm without making the academic content childish or unprofessional. Use large readable text and avoid overcrowding. Emphasize that teachers should review and adapt AI output and protect children's personal information.");
    setIsVideoStudioOpen(true);
  };

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check server health and Gemini API key status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(apiUrl('/api/health'));
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

  // Real-time research mode. Uses Google Search grounding and keeps sources with the answer.
  const handleResearchMessage = async (textToResearch: string) => {
    if (!textToResearch.trim() || isStreaming) return;

    let targetConvId = activeId;
    let targetMessages: Message[] = [];
    if (!targetConvId || !activeConversation) {
      const newId = `conv-${Date.now()}`;
      const newConv: Conversation = { id: newId, title: textToResearch.trim().slice(0, 32) + (textToResearch.trim().length > 32 ? '...' : ''), createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newId);
      targetConvId = newId;
    } else {
      targetMessages = [...activeConversation.messages];
      if (activeConversation.messages.length === 0 || activeConversation.title === 'New Chat') {
        handleRenameConversation(targetConvId, textToResearch.trim().slice(0, 32) + (textToResearch.trim().length > 32 ? '...' : ''));
      }
    }

    const userMessage: Message = { id: `msg-${Date.now()}-user`, role: 'user', content: textToResearch.trim(), timestamp: Date.now() };
    const assistantPlaceholderId = `msg-${Date.now()}-research`;
    const assistantMessage: Message = { id: assistantPlaceholderId, role: 'assistant', content: '', timestamp: Date.now() };
    const updatedMessages = [...targetMessages, userMessage, assistantMessage];
    setConversations((prev) => prev.map((c) => c.id === targetConvId ? { ...c, messages: updatedMessages, updatedAt: Date.now() } : c));
    setInput('');
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(apiUrl('/api/research'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToResearch.trim() }),
        signal: abortControllerRef.current.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Research failed (HTTP ${response.status})`);

      const sources = Array.isArray(data.sources) ? data.sources : [];
      const sourceText = sources.length
        ? `\\n\\n---\\n### Sources\\n${sources.map((s: any, i: number) => `${i + 1}. [${s.title || 'Source'}](${s.url})`).join('\\n')}`
        : '';
      const answer = (data.text || 'No research result was returned.') + sourceText;

      setConversations((prev) => prev.map((c) => c.id === targetConvId ? {
        ...c,
        messages: c.messages.map((m) => m.id === assistantPlaceholderId ? { ...m, content: answer } : m),
        updatedAt: Date.now(),
      } : c));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setConversations((prev) => prev.map((c) => c.id === targetConvId ? {
          ...c,
          messages: c.messages.map((m) => m.id === assistantPlaceholderId ? { ...m, content: err?.message || 'Research failed. Please try again.', isError: true } : m),
        } : c));
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Main message send logic
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isStreaming) return;
    if (researchMode) {
      await handleResearchMessage(textToSend);
      return;
    }

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
      const response = await fetch(apiUrl('/api/chat', {
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

  const handleAnalyzeMp4 = async (file: File, prompt: string) => {
    if (isStreaming) return;

    if (!file.type.includes('mp4') && !file.name.toLowerCase().endsWith('.mp4')) {
      window.alert('Please select a valid MP4 video file.');
      return;
    }

    const targetConvId = activeId || 'conv-' + Date.now();
    const userMessage: Message = {
      id: 'msg-' + Date.now() + '-video-user',
      role: 'user',
      content: '🎬 MP4 uploaded: **' + file.name + '**\\n\\n' + prompt,
      timestamp: Date.now(),
    };
    const assistantId = 'msg-' + Date.now() + '-video-assistant';
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: 'Uploading and analyzing your MP4 video…',
      timestamp: Date.now(),
    };

    if (!activeConversation) {
      setConversations((prev) => [{
        id: targetConvId,
        title: file.name.replace(/\\.mp4$/i, '').slice(0, 32) || 'MP4 Analysis',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [userMessage, assistantMessage],
      }, ...prev]);
      setActiveId(targetConvId);
    } else {
      setConversations((prev) => prev.map((c) =>
        c.id === targetConvId
          ? { ...c, messages: [...c.messages, userMessage, assistantMessage], updatedAt: Date.now() }
          : c
      ));
    }

    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch(apiUrl('/api/video/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'video/mp4',
          'X-Video-Prompt': encodeURIComponent(prompt),
        },
        body: file,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'MP4 analysis failed (HTTP ' + response.status + ').');
      }

      const answer = data.text || 'The MP4 was analyzed successfully, but no text result was returned.';
      setConversations((prev) => prev.map((c) =>
        c.id === targetConvId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: answer } : m
              ),
              updatedAt: Date.now(),
            }
          : c
      ));
    } catch (err: any) {
      const message = err?.message || 'Could not analyze the MP4 video.';
      setConversations((prev) => prev.map((c) =>
        c.id === targetConvId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantId ? { ...m, content: message, isError: true } : m
              ),
            }
          : c
      ));
    } finally {
      setIsStreaming(false);
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
        onOpenImageStudio={() => setIsImageStudioOpen(true)}
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
            <button
              type="button"
              onClick={() => setResearchMode((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${researchMode ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'}`}
              title="Research current information from the web with cited sources"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{researchMode ? 'Research On' : 'Research'}</span>
            </button>

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
              onClick={() => {
                setVideoStudioTopic('');
                setVideoStudioConfig(undefined);
                setIsVideoStudioOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              title="Open Video Studio"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Video</span>
            </button>
            <button
              onClick={() => setIsPromptImportOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Import a prompt generated by ChatGPT"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import Prompt</span>
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
              onOpenImageStudio={() => setIsImageStudioOpen(true)}
              onOpenVideoStudio={(top) => {
                setVideoStudioTopic(top || '');
                setIsVideoStudioOpen(true);
              }}
              onOpenCourseworkVideo={openECDCourseworkVideo}
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
                    onOpenVideoStudio={(top, cfg) => {
                      setVideoStudioTopic(top || '');
                      setVideoStudioConfig(cfg);
                      setIsVideoStudioOpen(true);
                    }}
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

        {researchMode && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Globe2 className="w-4 h-4 shrink-0" />
            <span><strong>Research mode:</strong> Davis AI will use current web information and include source links. Turn it off for normal chat.</span>
          </div>
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
            onAnalyzeMp4={handleAnalyzeMp4}
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
      <PromptImportModal
        isOpen={isPromptImportOpen}
        onClose={() => setIsPromptImportOpen(false)}
        onImport={(config) => {
          setVideoStudioConfig(config);
          setVideoStudioTopic(config.topic || config.veoPrompt || '');
          setIsPromptImportOpen(false);
          setIsVideoStudioOpen(true);
        }}
      />

      {/* AI Video Studio */}
      <VideoStudio
        isOpen={isVideoStudioOpen}
        onClose={() => setIsVideoStudioOpen(false)}
        initialTopic={videoStudioTopic}
        initialConfig={videoStudioConfig}
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
    
      <ImageStudio isOpen={isImageStudioOpen} onClose={() => setIsImageStudioOpen(false)} />
</div>
  );
}
