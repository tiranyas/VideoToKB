'use client';

import { useState } from 'react';
import { Copy, Check, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface ArticleViewProps {
  article: string;
  onChange: (value: string) => void;
}

export function ArticleView({ article, onChange }: ArticleViewProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(article);
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

  return (
    <div className="w-full max-w-3xl space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Generated Article</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownloadWord}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            title="Download as Word"
          >
            <FileDown className="h-4 w-4" />
            Word
          </button>
        </div>
      </div>

      <textarea
        value={article}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[400px] rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      <p className="text-xs text-gray-400">You can edit this article before copying or exporting.</p>
    </div>
  );
}
