'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/utils/cn';

type InputMode = 'url' | 'transcript';

interface UrlFormProps {
  onSubmit: (input: { videoUrl?: string; transcript?: string; template: string }) => void;
  isProcessing: boolean;
}

export function UrlForm({ onSubmit, isProcessing }: UrlFormProps) {
  const [mode, setMode] = useState<InputMode>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [template, setTemplate] = useState('how-to-guide');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === 'url') {
      const isLoom = videoUrl.includes('loom.com/share/');
      const isGDrive = videoUrl.includes('drive.google.com');
      if (!isLoom && !isGDrive) {
        toast.error('Please enter a Loom or Google Drive URL');
        return;
      }
      onSubmit({ videoUrl, template });
    } else {
      if (transcript.trim().length < 20) {
        toast.error('Please paste a longer transcript (at least 20 characters)');
        return;
      }
      onSubmit({ transcript: transcript.trim(), template });
    }
  }

  const isDisabled =
    isProcessing ||
    (mode === 'url' && videoUrl.trim() === '') ||
    (mode === 'transcript' && transcript.trim() === '');

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-300 p-1">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            mode === 'url'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          )}
          disabled={isProcessing}
        >
          Video URL
        </button>
        <button
          type="button"
          onClick={() => setMode('transcript')}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            mode === 'transcript'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:text-gray-900'
          )}
          disabled={isProcessing}
        >
          Paste Transcript
        </button>
      </div>

      {/* Input area */}
      {mode === 'url' ? (
        <div>
          <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-1">
            Video URL
          </label>
          <input
            id="video-url"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Paste your Loom or Google Drive URL here..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            disabled={isProcessing}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-700 mb-1">
            Transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your ready-made transcript here..."
            rows={8}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
            disabled={isProcessing}
          />
        </div>
      )}

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
