'use client';

import { useState } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { ArticleType, PlatformProfile } from '@/types';

type InputMode = 'url' | 'transcript';

interface UrlFormProps {
  onSubmit: (input: { videoUrl?: string; transcript?: string }) => void;
  isProcessing: boolean;
  articleTypes: ArticleType[];
  platforms: PlatformProfile[];
  selectedTypeId: string;
  selectedPlatformId: string;
  onTypeChange: (id: string) => void;
  onPlatformChange: (id: string) => void;
}

export function UrlForm({
  onSubmit,
  isProcessing,
  articleTypes,
  platforms,
  selectedTypeId,
  selectedPlatformId,
  onTypeChange,
  onPlatformChange,
}: UrlFormProps) {
  const [mode, setMode] = useState<InputMode>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTypeId) {
      toast.error('Please select an article type (or configure one in Settings)');
      return;
    }

    if (mode === 'url') {
      const isLoom = videoUrl.includes('loom.com/share/');
      const isGDrive = videoUrl.includes('drive.google.com');
      if (!isLoom && !isGDrive) {
        toast.error('Please enter a Loom or Google Drive URL');
        return;
      }
      onSubmit({ videoUrl });
    } else {
      if (transcript.trim().length < 20) {
        toast.error('Please paste a longer transcript (at least 20 characters)');
        return;
      }
      onSubmit({ transcript: transcript.trim() });
    }
  }

  const isDisabled =
    isProcessing ||
    (mode === 'url' && videoUrl.trim() === '') ||
    (mode === 'transcript' && transcript.trim() === '');

  const noConfig = articleTypes.length === 0;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-4">
      {/* Config selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Article Type</label>
          <select
            value={selectedTypeId}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isProcessing}
          >
            {articleTypes.length === 0 && <option value="">No article types configured</option>}
            {articleTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Output Platform</label>
          <select
            value={selectedPlatformId}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            disabled={isProcessing}
          >
            {platforms.length === 0 && <option value="">No platforms configured</option>}
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {noConfig && (
        <Link
          href="/settings"
          className="flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100"
        >
          <Settings className="h-4 w-4" />
          Configure article types and platforms in Settings
        </Link>
      )}

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

      <button
        type="submit"
        disabled={isDisabled || noConfig}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors',
          isDisabled || noConfig
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
