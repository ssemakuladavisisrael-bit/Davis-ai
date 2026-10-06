import React, { useState } from 'react';
import { Download, Image as ImageIcon, Loader2, X, Sparkles } from 'lucide-react';

interface ImageStudioProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const generate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError('');
    setImageUrl(null);
    try {
      const response = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio, imageSize }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Image generation failed.');
      setImageUrl(`data:${data.mimeType || 'image/png'};base64,${data.image}`);
    } catch (err: any) {
      setError(err?.message || 'Could not generate the image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const download = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `davis-ai-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Davis AI Image Studio</h2>
              <p className="text-xs text-slate-500">Create or edit images from natural-language prompts.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 grid lg:grid-cols-[1fr_1.15fr] gap-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Describe the image</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: Create a professional 16:9 educational poster showing a smiling Ugandan nursery teacher helping children learn colours in a bright classroom..."
                className="w-full min-h-40 rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Aspect ratio
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 bg-white">
                  <option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Quality
                <select value={imageSize} onChange={(e) => setImageSize(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 p-2.5 bg-white">
                  <option>1K</option><option>2K</option><option>4K</option>
                </select>
              </label>
            </div>
            <button
              onClick={generate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 flex items-center justify-center gap-2"
            >
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating…</> : <><Sparkles className="w-5 h-5" /> Generate Image</>}
            </button>
            {error && <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3">{error}</div>}
            <p className="text-[11px] text-slate-500">Davis AI uses Gemini's native image generation for high-quality visuals and can later be extended with image editing and reference-image workflows.</p>
          </div>

          <div className="min-h-[360px] rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
            {imageUrl ? (
              <div className="w-full p-3">
                <img src={imageUrl} alt="Generated by Davis AI" className="w-full max-h-[65vh] object-contain rounded-xl shadow-sm" />
                <button onClick={download} className="mt-3 mx-auto rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-bold flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download Image
                </button>
              </div>
            ) : (
              <div className="text-center px-6 text-slate-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">Your generated image will appear here</p>
                <p className="text-xs mt-1">Describe exactly what you want, just like you would ask Davis AI for anything else.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
