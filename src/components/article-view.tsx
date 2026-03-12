'use client';

interface ArticleViewProps {
  article: string;
  onChange: (value: string) => void;
}

export function ArticleView({ article, onChange }: ArticleViewProps) {
  return (
    <div className="w-full max-w-3xl space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">Generated Article</h2>

      <textarea
        value={article}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[400px] rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />

      <p className="text-xs text-gray-400">You can edit this article before copying or exporting.</p>
    </div>
  );
}
