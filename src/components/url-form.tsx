'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

interface UrlFormProps {
  onSubmit: (videoUrl: string, template: string) => void;
  isProcessing: boolean;
}

export function UrlForm({ onSubmit, isProcessing }: UrlFormProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [template, setTemplate] = useState('how-to-guide');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!videoUrl.includes('loom.com/share/')) {
      toast.error('Please enter a valid Loom share URL (e.g. https://www.loom.com/share/...)');
      return;
    }

    onSubmit(videoUrl, template);
  }

  const isDisabled = isProcessing || videoUrl.trim() === '';

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      <div>
        <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
          Video URL
        </label>
        <input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Paste your Loom URL here..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isProcessing}
        />
      </div>

      <div>
        <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
          Article Template
        </label>
        <select
          id="template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          disabled={isProcessing}
        >
          <option value="how-to-guide">How-to Guide</option>
          <option value="feature-explainer" disabled>Feature Explainer (Coming soon)</option>
          <option value="troubleshooting-guide" disabled>Troubleshooting Guide (Coming soon)</option>
          <option value="onboarding-guide" disabled>Onboarding Guide (Coming soon)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isDisabled}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors',
          isDisabled
            ? 'cursor-not-allowed bg-blue-300'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        )}
      >
        {isProcessing ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : (
          'Create Article'
        )}
      </button>
    </form>
  );
}
