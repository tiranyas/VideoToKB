'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Check, FileDown, Code, Eye, FileCode } from 'lucide-react';
import { toast } from 'sonner';

type ReviewTab = 'draft' | 'article';

interface ArticleViewProps {
  article: string;
  draft?: string;
  onChange: (value: string) => void;
  mode: 'review' | 'final';
  onGenerateHTML?: () => void;
  platformName?: string;
}

export function ArticleView({ article, draft, onChange, mode, onGenerateHTML, platformName }: ArticleViewProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('article');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isFinal = mode === 'final';
  const isReview = mode === 'review';

  useEffect(() => {
    if (showPreview && iframeRef.current && article) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(article);
        doc.close();
      }
    }
  }, [showPreview, article]);

  async function handleCopy() {
    try {
      const text = isReview && reviewTab === 'draft' ? (draft ?? '') : article;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  async function handleDownloadWord() {
    try {
      const { generateWordDoc } = await import('@/lib/word-export');
      const blob = await generateWordDoc(article);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'article.docx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word file downloaded');
    } catch {
      toast.error('Failed to generate Word file');
    }
  }

  const title = isReview ? 'Review Article' : 'Final Output';
  const subtitle = isReview
    ? 'Review and edit the structured article before generating the final output.'
    : 'Your article has been converted to platform HTML.';

  return (
    <div className="w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {isReview && (
            <button
              onClick={handleDownloadWord}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              title="Download as Word"
            >
              <FileDown className="h-4 w-4" />
              Word
            </button>
          )}
          {isFinal && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200"
              title={showPreview ? 'Show HTML code' : 'Show preview'}
            >
              {showPreview ? <FileCode className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Code' : 'Preview'}
            </button>
          )}
        </div>
      </div>

      {isReview && draft && (
        <div className="flex gap-1 bg-gray-100 rounded-full p-1 w-fit">
          <button
            onClick={() => setReviewTab('draft')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              reviewTab === 'draft'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setReviewTab('article')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              reviewTab === 'article'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Article
          </button>
        </div>
      )}

      {showPreview ? (
        <>
          <p className="text-xs text-gray-400">
            This is a generic preview. Images and layout may appear differently in your KB platform.
          </p>
          <iframe
            ref={iframeRef}
            title="Article Preview"
            className="w-full min-h-[400px] rounded-xl border border-gray-200 bg-white"
            sandbox="allow-same-origin"
          />
        </>
      ) : isReview && reviewTab === 'draft' ? (
        <div className="relative">
          <div className="absolute top-3 right-3 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
            Agent 2 — Raw Draft
          </div>
          <textarea
            readOnly
            value={draft ?? ''}
            className="w-full min-h-[400px] rounded-xl border border-amber-200 bg-amber-50/30 px-4 py-3 font-mono text-sm leading-relaxed focus:outline-none"
          />
        </div>
      ) : (
        <textarea
          value={article}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[400px] rounded-xl border border-gray-200 bg-gray-50/30 px-4 py-3 font-mono text-sm leading-relaxed focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
        />
      )}

      {isReview && onGenerateHTML && (
        <button
          onClick={onGenerateHTML}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-700 hover:to-blue-600"
        >
          <Code className="h-4 w-4" />
          Format for {platformName ?? 'Platform'}
        </button>
      )}
    </div>
  );
}
