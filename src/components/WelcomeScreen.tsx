import React from 'react';
import { 
  Sparkles, 
  GraduationCap, 
  Code2, 
  PenTool, 
  Lightbulb, 
  Film, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  hasApiKey: boolean;
  onOpenHelp: () => void;
  onOpenImageStudio?: () => void;
  onOpenVideoStudio?: (topic?: string) => void;
  onOpenCourseworkVideo?: () => void;
}

interface PromptSuggestion {
  category: string;
  icon: React.ReactNode;
  prompt: string;
  badgeColor: string;
  hoverBorder: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  hasApiKey,
  onOpenHelp,
  onOpenImageStudio,
  onOpenVideoStudio,
  onOpenCourseworkVideo,
}) => {
  const suggestions: PromptSuggestion[] = [
    {
      category: 'AI Video',
      icon: <Film className="w-4 h-4 text-indigo-600" />,
      prompt: 'Create an engaging 60-second educational video explaining how black holes bend space and time.',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      hoverBorder: 'hover:border-indigo-300',
    },
    {
      category: 'Programming',
      icon: <Code2 className="w-4 h-4 text-emerald-600" />,
      prompt: 'Write a TypeScript debounce function with proper generics, return types, and cleanup logic.',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      category: 'Learning',
      icon: <GraduationCap className="w-4 h-4 text-sky-600" />,
      prompt: 'Explain quantum computing and superposition using a simple coin-flipping analogy.',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      hoverBorder: 'hover:border-sky-300',
    },
    {
      category: 'Writing',
      icon: <PenTool className="w-4 h-4 text-amber-600" />,
      prompt: 'Draft a warm, polite and confident follow-up email after a second-round interview.',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      category: 'Brainstorming',
      icon: <Lightbulb className="w-4 h-4 text-purple-600" />,
      prompt: 'Give me 5 distinctive startup ideas combining AI with local artisanal coffee roasters.',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      hoverBorder: 'hover:border-purple-300',
    },
    {
      category: 'Deep Insight',
      icon: <Zap className="w-4 h-4 text-rose-600" />,
      prompt: 'Compare React 19 server components with traditional client rendering. What are the key trade-offs?',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      hoverBorder: 'hover:border-rose-300',
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Brand Hero */}
      <div className="text-center mb-8 sm:mb-10 space-y-3">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 shadow-xl shadow-indigo-500/25 flex items-center justify-center text-white ring-4 ring-indigo-50">
            <span className="font-extrabold text-2xl sm:text-3xl tracking-tight">D</span>
            <Sparkles className="w-5 h-5 absolute -top-1.5 -right-1.5 text-amber-300 animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          How can <span className="bg-gradient-to-r from-indigo-600 to-indigo-800 bg-clip-text text-transparent">Davis AI</span> help you today?
        </h1>
        <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto font-normal">
          An intelligent conversational assistant for coding, writing, research, brainstorming, and everyday problem solving.
        </p>

        {!hasApiKey && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium mt-2">
            <span>Requires GEMINI_API_KEY</span>
            <button
              onClick={onOpenHelp}
              className="text-indigo-700 underline font-semibold hover:text-indigo-900 cursor-pointer"
            >
              Setup Guide →
            </button>
          </div>
        )}
      </div>

      {onOpenImageStudio && (
        <button
          onClick={onOpenImageStudio}
          className="w-full mb-4 p-4 rounded-2xl border border-violet-200 bg-violet-50/70 hover:bg-violet-100/70 hover:border-violet-300 shadow-sm transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600 text-white"><Sparkles className="w-5 h-5" /></div>
            <div className="flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Image Generation</div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">Create images with Davis AI</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">Generate posters, illustrations, educational visuals and creative images from prompts.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-violet-500 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      )}

      {/* Suggested prompts grid */}
      {/* Featured coursework template */}
      {onOpenCourseworkVideo && (
        <button
          onClick={onOpenCourseworkVideo}
          className="w-full mb-4 p-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 hover:border-indigo-300 shadow-sm transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">Coursework Template</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-white border border-indigo-200 text-[10px] font-semibold text-indigo-700">120 sec</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-1">AI & Basic Prompting for ECD Teachers</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">His Grace Nursery School · Bahai Road, Kampala</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-500 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </button>
      )}

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(item.prompt)}
            className={`group text-left p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/70 shadow-sm transition-all duration-200 flex flex-col justify-between cursor-pointer ${item.hoverBorder} hover:shadow-md`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${item.badgeColor}`}>
                  {item.icon}
                  {item.category}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal group-hover:text-slate-900">
                "{item.prompt}"
              </p>
            </div>
            <span className="text-[11px] text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-3">
              Ask Davis AI →
            </span>
          </button>
        ))}
      </div>

      {/* Capabilities feature footer */}
      <div className="mt-8 pt-6 border-t border-slate-100 w-full flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-indigo-500" />
          <span>AI Video Studio & Voiceover</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-500" />
          <span>Real-time Gemini Streaming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-indigo-500" />
          <span>Formatted Code & Instant Copy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>Secure Server-Side AI Integration</span>
        </div>
      </div>
    </div>
  );
};
