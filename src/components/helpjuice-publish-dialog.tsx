'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2, CheckCircle2, ExternalLink, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';

interface HelpjuicePublishDialogProps {
  open: boolean;
  onClose: () => void;
  articleId: string;
  articleTitle: string;
}

interface Category {
  id: number;
  name: string;
}

type Phase = 'select' | 'publishing' | 'success';

export function HelpjuicePublishDialog({ open, onClose, articleId, articleTitle }: HelpjuicePublishDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('select');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('select');
    setResultUrl(null);
    setError(null);
    setSelectedCategoryId(null);

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/integrations/helpjuice');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Failed to load categories');
          return;
        }
        const data = await res.json();
        setCategories(data.categories ?? []);
      } catch {
        setError('Failed to connect to Helpjuice');
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  async function handlePublish() {
    if (!selectedCategoryId) {
      toast.error('Please select a category');
      return;
    }

    setPhase('publishing');
    try {
      const res = await fetch('/api/integrations/helpjuice/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, categoryId: selectedCategoryId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      setResultUrl(data.helpjuiceUrl);
      setPhase('success');
      toast.success('Article published as draft to Helpjuice!');
    } catch (err) {
      setPhase('select');
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-xs">HJ</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Publish to Helpjuice</h3>
              <p className="text-xs text-gray-400 truncate max-w-[250px]">{articleTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="text-sm text-gray-400">Loading categories...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <button
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Select Category */}
          {phase === 'select' && !loading && !error && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <FolderOpen className="h-4 w-4 text-gray-400" />
                  Select Category
                </label>
                <select
                  value={selectedCategoryId ?? ''}
                  onChange={(e) => setSelectedCategoryId(Number(e.target.value) || null)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                >
                  <option value="">Choose a category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                The article will be created as a <strong>draft</strong> in Helpjuice. You can review and publish it from there.
              </div>
            </div>
          )}

          {/* Publishing */}
          {phase === 'publishing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm text-gray-500">Publishing to Helpjuice...</p>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              <div className="h-14 w-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-gray-900">Draft Created!</p>
                <p className="text-sm text-gray-500 mt-1">Your article is now a draft in Helpjuice</p>
              </div>
              {resultUrl && (
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Helpjuice
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'select' && !loading && !error && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={!selectedCategoryId}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all ${
                !selectedCategoryId
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600'
              }`}
            >
              <Upload className="h-4 w-4" />
              Publish as Draft
            </button>
          </div>
        )}

        {phase === 'success' && (
          <div className="flex justify-center border-t border-gray-100 px-5 py-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
