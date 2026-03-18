'use client';

import { useState, useCallback } from 'react';
import { FileCode, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addPlatformProfile } from '@/lib/supabase/queries';

interface StepTemplateProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  workspaceId?: string;
  selectedPlatformId?: string;
}

interface ScrapeTemplateResult {
  htmlPrompt: string;
  htmlTemplate: string;
  detectedPlatform?: string;
}

export function StepTemplate({ onNext, onBack, onSkip, saving, selectedPlatformId }: StepTemplateProps) {
  const supabase = createClient();

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState<ScrapeTemplateResult | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const [manualHtml, setManualHtml] = useState('');
  const [platformMismatch, setPlatformMismatch] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPlatformMismatch(null);

    const attemptScrape = async (): Promise<ScrapeTemplateResult> => {
      // Auto-prepend https:// if user didn't type a protocol
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const res = await fetch('/api/scrape-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      if (!res.ok) throw new Error('Failed to scrape template');
      return res.json();
    };

    try {
      let data: ScrapeTemplateResult;
      try {
        data = await attemptScrape();
      } catch {
        // Retry once automatically
        if (retryCount === 0) {
          setRetryCount(1);
          data = await attemptScrape();
        } else {
          throw new Error('retry-exhausted');
        }
      }

      setScraped(data);

      // Check platform mismatch
      if (data.detectedPlatform && selectedPlatformId && data.detectedPlatform !== selectedPlatformId) {
        setPlatformMismatch(data.detectedPlatform);
      }
    } catch {
      setError('Could not scrape that URL.');
      setShowFallback(true);
    } finally {
      setLoading(false);
    }
  }, [url, selectedPlatformId, retryCount]);

  async function handleFinish() {
    const templateData = scraped ?? (manualHtml.trim() ? {
      htmlPrompt: 'Match the visual style and HTML structure of the provided reference article.',
      htmlTemplate: manualHtml.trim(),
    } : null);

    if (templateData) {
      // Save scraped template as custom platform profile with applyBranding=false
      const profileId = `custom-${Date.now()}`;
      try {
        await addPlatformProfile(supabase, {
          id: profileId,
          name: 'Custom (Scraped)',
          htmlPrompt: templateData.htmlPrompt,
          htmlTemplate: templateData.htmlTemplate,
          isDefault: false,
          applyBranding: false,
        });
      } catch (err) {
        console.error('Failed to save custom template:', err);
      }

      onNext({
        htmlPrompt: templateData.htmlPrompt,
        htmlTemplate: templateData.htmlTemplate,
        detectedPlatform: scraped?.detectedPlatform,
      });
    } else {
      onNext({});
    }
  }

  const previewHtml = scraped?.htmlTemplate ?? manualHtml;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <FileCode className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Match your style</h2>
          <p className="text-gray-500 text-sm">Got an existing article? Paste a URL and we&apos;ll match its style</p>
        </div>
      </div>

      {/* URL input */}
      {!scraped && !showFallback && (
        <div className="mb-6">
          <label htmlFor="template-url" className="block text-sm font-medium text-gray-700 mb-1.5">
            Article URL
          </label>
          <div className="flex gap-2">
            <input
              id="template-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://help.yourcompany.com/article-123"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); analyze(); } }}
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </span>
              ) : 'Analyze'}
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-amber-700">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Fallback: manual HTML paste */}
      {showFallback && !scraped && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Paste your HTML directly
          </label>
          <textarea
            value={manualHtml}
            onChange={(e) => setManualHtml(e.target.value)}
            rows={6}
            placeholder="<article>...</article>"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
      )}

      {/* Platform mismatch notice */}
      {platformMismatch && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm mb-4">
          <p className="text-blue-800">
            This looks like a <strong>{platformMismatch}</strong> article &mdash; would you like to switch?
          </p>
        </div>
      )}

      {/* Preview iframe */}
      {previewHtml && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">
            This is the style we&apos;ll match for your articles
          </p>
          <iframe
            sandbox="allow-same-origin"
            srcDoc={previewHtml}
            className="w-full h-64 border border-gray-200 rounded-lg bg-white"
            title="Template preview"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip and finish
          </button>
        </div>
        <button
          type="button"
          onClick={handleFinish}
          disabled={saving}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Finish setup'}
        </button>
      </div>
    </div>
  );
}
