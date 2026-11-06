import React from 'react';
import {
  Sparkles,
  GraduationCap,
  BookOpen,
  Stethoscope,
  Brain,
  ClipboardCheck,
  Search,
  PenTool,
  Film,
  ArrowRight,
  ShieldCheck,
  Zap,
  Image as ImageIcon,
} from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
  hasApiKey: boolean;
  onOpenHelp: () => void;
  onOpenImageStudio?: () => void;
  onOpenVideoStudio?: (topic?: string) => void;
  onOpenCourseworkVideo?: () => void;
}

const studyTools = [
  {
    title: 'Anatomy',
    description: 'Learn body structures, regions and relationships.',
    icon: <Stethoscope className="h-5 w-5" />,
    prompt: 'Teach me human anatomy at first-year university level. Start with the learning objectives, explain the structures and their functions in depth, use accurate anatomical terminology, and connect the topic to clinical nursing practice. Ask me one question to check my understanding.',
    tint: 'from-sky-500/10 to-cyan-500/5',
    iconTone: 'text-sky-700 bg-sky-100',
  },
  {
    title: 'Embryology',
    description: 'Understand human development step by step.',
    icon: <Brain className="h-5 w-5" />,
    prompt: 'Teach me human embryology at first-year Bachelor of Nursing Science level. Explain the developmental timeline, origin of tissues, sequence of events, resulting structures, and relevant clinical abnormalities. Use clear university-level detail and explain why each stage matters.',
    tint: 'from-violet-500/10 to-fuchsia-500/5',
    iconTone: 'text-violet-700 bg-violet-100',
  },
  {
    title: 'Nursing Studies',
    description: 'Connect theory, patient care and clinical practice.',
    icon: <BookOpen className="h-5 w-5" />,
    prompt: 'Help me study Bachelor of Nursing Science. Explain the topic systematically, define important terms, connect theory to patient care, and give practical nursing examples at first-year university level.',
    tint: 'from-emerald-500/10 to-teal-500/5',
    iconTone: 'text-emerald-700 bg-emerald-100',
  },
  {
    title: 'Exam Preparation',
    description: 'Practise structured questions and model answers.',
    icon: <ClipboardCheck className="h-5 w-5" />,
    prompt: 'Prepare me for a university examination on this topic. First teach the examinable concepts in depth, then give realistic structured and essay questions with complete model answers matched to the marks. Explain what earns marks.',
    tint: 'from-amber-500/10 to-orange-500/5',
    iconTone: 'text-amber-700 bg-amber-100',
  },
];

const assistantTools = [
  {
    title: 'Research & Explain',
    description: 'Explore a topic, compare evidence and understand difficult ideas.',
    icon: <Search className="h-4 w-4" />,
    prompt: 'Help me research and understand this topic. Separate established facts from interpretations, explain the evidence clearly, and identify reliable sources I should consult.',
  },
  {
    title: 'Writing & Communication',
    description: 'Prepare clear, professional documents and messages.',
    icon: <PenTool className="h-4 w-4" />,
    prompt: 'Help me prepare a clear, professional piece of writing. Ask only if an essential detail is missing, and make the result ready to use.',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onSelectPrompt,
  hasApiKey,
  onOpenHelp,
  onOpenImageStudio,
  onOpenVideoStudio,
  onOpenCourseworkVideo,
}) => {
  return (
    <div className="flex-1 w-full px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <section className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500/20">
            <span className="text-2xl font-black tracking-tight">D</span>
            <Sparkles className="absolute ml-12 -mt-12 h-4 w-4 text-amber-400" />
          </div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Your intelligent learning companion
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            What would you like to work on?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Learn deeply, explore ideas and get useful work done with Davis AI.
          </p>
          {!hasApiKey && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-medium text-amber-800">
              <span>AI connection needs attention.</span>
              <button onClick={onOpenHelp} className="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
                View setup guide
              </button>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Learning spaces</h2>
              <p className="mt-1 text-xs text-slate-500">Start with a focused learning area.</p>
            </div>
            <span className="hidden text-[11px] font-medium text-slate-400 sm:inline">Choose a subject to begin</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {studyTools.map((tool) => (
              <button
                key={tool.title}
                onClick={() => onSelectPrompt(tool.prompt)}
                className={`group flex min-h-28 items-start gap-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br ${tool.tint} p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.iconTone}`}>{tool.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{tool.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{tool.description}</span>
                  <span className="mt-3 block text-[11px] font-semibold text-indigo-700">Start learning</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">More ways to use Davis AI</h2>
            <p className="mt-1 text-xs text-slate-500">Research, create and get help with everyday work.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {assistantTools.map((tool) => (
              <button
                key={tool.title}
                onClick={() => onSelectPrompt(tool.prompt)}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">{tool.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800">{tool.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{tool.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </section>

        {(onOpenImageStudio || onOpenVideoStudio || onOpenCourseworkVideo) && (
          <section className="mt-9">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Creative studio</h2>
              <p className="mt-1 text-xs text-slate-500">Turn ideas into visual and video content.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {onOpenImageStudio && (
                <button onClick={onOpenImageStudio} className="group flex items-center gap-3 rounded-xl border border-violet-200/80 bg-violet-50/60 p-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white"><ImageIcon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">Image Studio</span><span className="mt-1 block text-xs text-slate-600">Create illustrations, posters and learning visuals.</span></span>
                  <ArrowRight className="h-4 w-4 text-violet-500 transition-transform group-hover:translate-x-1" />
                </button>
              )}
              {onOpenVideoStudio && (
                <button onClick={() => onOpenVideoStudio()} className="group flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/60 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white"><Film className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">Video Studio</span><span className="mt-1 block text-xs text-slate-600">Create narrated videos and explainers.</span></span>
                  <ArrowRight className="h-4 w-4 text-indigo-500 transition-transform group-hover:translate-x-1" />
                </button>
              )}
              {onOpenCourseworkVideo && (
                <button onClick={onOpenCourseworkVideo} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-slate-50 sm:col-span-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"><GraduationCap className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-900">Educational video template</span><span className="mt-1 block text-xs text-slate-500">Start with a guided educational presentation and narration workflow.</span></span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200/70 pt-5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Gemini-powered assistance</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Server-side API protection</span>
        </footer>
      </div>
    </div>
  );
};
