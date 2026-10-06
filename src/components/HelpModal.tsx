import React from 'react';
import { X, Key, Play, Globe, Sparkles, Terminal, CheckCircle2, ShieldAlert } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasApiKey: boolean;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, hasApiKey }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Davis AI Setup & User Guide</h2>
              <p className="text-xs text-slate-500">Beginner guide for configuring, running, testing, and publishing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-slate-700 text-sm">
          {/* Status Alert */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            hasApiKey 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}>
            {hasApiKey ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {hasApiKey ? 'Gemini API Key Detected' : 'Gemini API Key Required'}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {hasApiKey 
                  ? 'Davis AI is connected to Google Gemini 3.8 Flash via secure server-side proxy. You are ready to chat!'
                  : 'To chat with Davis AI, configure your GEMINI_API_KEY in the AI Studio Secrets panel or .env file.'
                }
              </p>
            </div>
          </div>

          {/* Step 1: Configure Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">1</span>
              <Key className="w-4 h-4 text-indigo-600" />
              <h3>How to Configure the Gemini API Key</h3>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              Davis AI keeps your API credentials 100% secure on the server so keys are never exposed in browser code.
            </p>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="font-medium text-slate-800">In Google AI Studio:</div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                <li>Click the <strong>Settings</strong> icon in the left or top navigation of AI Studio.</li>
                <li>Open the <strong>Secrets</strong> panel.</li>
                <li>Add a secret named <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">GEMINI_API_KEY</code> with your Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline">aistudio.google.com</a>.</li>
              </ol>
              <div className="font-medium text-slate-800 pt-1">Running Locally:</div>
              <p className="text-slate-600">
                Create a <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">.env</code> file in the project root with:
              </p>
              <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
GEMINI_API_KEY="AIzaSy..."
PORT=3000
              </pre>
            </div>
          </div>

          {/* Step 2: Running & Testing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">2</span>
              <Play className="w-4 h-4 text-indigo-600" />
              <h3>Running & Testing Davis AI</h3>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600">
              <p>
                To launch the full-stack server running Vite + Express:
              </p>
              <div className="flex items-center gap-2 bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>npm run dev</span>
              </div>
              <p>
                Open <span className="font-semibold text-indigo-600">http://localhost:3000</span> in your browser.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Multi-turn chat:</strong> Davis AI remembers your previous answers in the active thread.</li>
                <li><strong>Code snippets:</strong> Easily copy generated code with the one-click copy button.</li>
                <li><strong>Keyboard shortcut:</strong> Press <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">Enter</kbd> to send, or <kbd className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">Shift + Enter</kbd> for a new line.</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Publishing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">3</span>
              <Globe className="w-4 h-4 text-indigo-600" />
              <h3>How to Publish the App</h3>
            </div>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600">
              <p>
                You have multiple options to deploy Davis AI to the web:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>One-Click AI Studio / Cloud Run:</strong> In Google AI Studio, click the <strong>Deploy</strong> button in the top right. It packages the container with Node.js and serves it on your shared Cloud Run URL.
                </li>
                <li>
                  <strong>Production Build:</strong> Run <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">npm run build</code>, then start the server with <code className="bg-slate-200 px-1 py-0.5 rounded text-indigo-700 font-mono">npm start</code>.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            Got it, let's chat!
          </button>
        </div>
      </div>
    </div>
  );
};
