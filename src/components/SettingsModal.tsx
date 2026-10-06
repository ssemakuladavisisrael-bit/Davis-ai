import React, { useState } from 'react';
import { X, Sliders, Trash2, Check, RefreshCw, Zap, Brain } from 'lucide-react';
import { PersonaTone, ModelChoice } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tone: PersonaTone;
  onToneChange: (tone: PersonaTone) => void;
  model: ModelChoice;
  onModelChange: (model: ModelChoice) => void;
  customInstruction: string;
  onCustomInstructionChange: (instruction: string) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tone,
  onToneChange,
  model,
  onModelChange,
  customInstruction,
  onCustomInstructionChange,
  onClearAllConversations,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [tempInstruction, setTempInstruction] = useState(customInstruction);

  if (!isOpen) return null;

  const handleSaveInstruction = () => {
    onCustomInstructionChange(tempInstruction);
  };

  const handleResetInstruction = () => {
    setTempInstruction('');
    onCustomInstructionChange('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Davis AI Settings</h2>
              <p className="text-xs text-slate-500">Fine-tune model engine, tone, and assistant instructions</p>
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
        <div className="p-6 space-y-5 text-sm text-slate-700">
          {/* AI Model Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                AI Engine Model
              </label>
              <span className="text-[11px] text-emerald-600 font-medium">Auto-failover enabled</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onModelChange('gemini-3.1-flash-lite')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  model === 'gemini-3.1-flash-lite'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Gemini 3.1 Flash Lite
                  </span>
                  {model === 'gemini-3.1-flash-lite' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  <span className="font-medium text-emerald-600">⚡ Ultra Fast (~0.8s)</span> · High reliability for coding and everyday questions.
                </div>
              </button>

              <button
                type="button"
                onClick={() => onModelChange('gemini-3.8-flash')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  model === 'gemini-3.8-flash'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-indigo-600" />
                    Gemini 3.8 Flash
                  </span>
                  {model === 'gemini-3.8-flash' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  <span className="font-medium text-indigo-600">🧠 Deep Reasoning</span> · Multi-step thinking (automatic failover if high demand).
                </div>
              </button>
            </div>
          </div>

          {/* Persona Tone */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Response Tone & Persona
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onToneChange('balanced')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tone === 'balanced'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Balanced</span>
                  {tone === 'balanced' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Friendly, thorough & versatile</div>
              </button>

              <button
                type="button"
                onClick={() => onToneChange('creative')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tone === 'creative'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Creative</span>
                  {tone === 'creative' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Imaginative, expressive & vibrant</div>
              </button>

              <button
                type="button"
                onClick={() => onToneChange('precise')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  tone === 'precise'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Precise</span>
                  {tone === 'precise' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Concise, direct & factual</div>
              </button>
            </div>
          </div>

          {/* Custom System Instruction */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Custom Instructions (Optional)
              </label>
              {tempInstruction && (
                <button
                  type="button"
                  onClick={handleResetInstruction}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset to default
                </button>
              )}
            </div>
            <textarea
              value={tempInstruction}
              onChange={(e) => setTempInstruction(e.target.value)}
              placeholder="e.g. You are a senior software architect who explains concepts with clean TypeScript code and concise diagrams..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
            {tempInstruction !== customInstruction && (
              <button
                type="button"
                onClick={handleSaveInstruction}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Save Custom Instruction
              </button>
            )}
          </div>

          {/* Clear Data */}
          <div className="pt-2 border-t border-slate-100">
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-rose-900">Clear All Chat History</div>
                  <div className="text-[11px] text-rose-700/80">Permanently delete all stored conversations</div>
                </div>
                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-medium cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2.5 py-1 rounded-md text-xs text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllConversations();
                        setShowClearConfirm(false);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-md text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
