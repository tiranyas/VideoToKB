'use client';

import { useState, useMemo } from 'react';
import { Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { ArticleType, PlatformProfile } from '@/types';

type InputMode = 'url' | 'transcript';
type VideoProvider = 'youtube' | 'loom' | 'gdrive' | null;

function detectProvider(url: string): VideoProvider {
  if (!url.trim()) return null;
  if (url.includes('youtube.com/') || url.includes('youtu.be/')) return 'youtube';
  if (url.includes('loom.com/share/')) return 'loom';
  if (url.includes('drive.google.com')) return 'gdrive';
  return null;
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function LoomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.16 12.6l-4.73-2.73 4.73-2.73a.87.87 0 000-1.5L12.6.84a1.18 1.18 0 00-1.2 0L.84 7.14a.87.87 0 000 1.5l4.73 2.73L.84 14.1a.87.87 0 000 1.5l10.56 6.3a1.18 1.18 0 001.2 0l10.56-6.3a.87.87 0 000-1.5zM12 2.42l8.4 5.01L12 12.44 3.6 7.43 12 2.42zm0 19.16l-8.4-5.01 3.93-2.27L12 17.03l4.47-2.73 3.93 2.27L12 21.58z"/>
    </svg>
  );
}

function GDriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7.94 1.65L.82 13.8h4.24l7.12-12.15H7.94zm.73 14.7L5.7 21.6h14.18l2.97-5.25H8.67zm7.68-1.5L23.47 1.65h-4.24l-7.12 13.2h4.24z"/>
    </svg>
  );
}

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

  const detectedProvider = useMemo(() => detectProvider(videoUrl), [videoUrl]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTypeId) {
      toast.error('Please select an article type (or configure one in Settings)');
      return;
    }

    if (mode === 'url') {
      const isLoom = videoUrl.includes('loom.com/share/');
      const isGDrive = videoUrl.includes('drive.google.com');
      const isYouTube = videoUrl.includes('youtube.com/') || videoUrl.includes('youtu.be/');
      if (!isLoom && !isGDrive && !isYouTube) {
        toast.error('Please enter a YouTube, Loom, or Google Drive URL');
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
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5">
      {/* Config selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Article Type</label>
          <select
            value={selectedTypeId}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
            disabled={isProcessing}
          >
            {articleTypes.length === 0 && <option value="">No article types configured</option>}
            {articleTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Output Platform</label>
          <select
            value={selectedPlatformId}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
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
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Configure article types and platforms in Settings
        </Link>
      )}

      {/* Mode toggle */}
      <div className="bg-gray-100 rounded-full p-1 flex">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
            mode === 'url'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          disabled={isProcessing}
        >
          Video URL
        </button>
        <button
          type="button"
          onClick={() => setMode('transcript')}
          className={cn(
            'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
            mode === 'transcript'
              ? 'bg-black text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          disabled={isProcessing}
        >
          Paste Transcript
        </button>
      </div>

      {/* Input area */}
      {mode === 'url' ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="video-url" className="block text-xs font-medium text-gray-400 mb-1.5">
              Video URL
            </label>
            <input
              id="video-url"
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Paste a YouTube, Loom, or Google Drive URL..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              disabled={isProcessing}
            />
          </div>

          {/* Provider icons — all on by default, only matched one stays colored */}
          <div className="flex items-center justify-center gap-6">
            {([
              { id: 'youtube' as const, label: 'YouTube', activeColor: 'text-red-500', defaultColor: 'text-gray-400', Icon: YouTubeIcon },
              { id: 'loom' as const, label: 'Loom', activeColor: 'text-purple-500', defaultColor: 'text-gray-400', Icon: LoomIcon },
              { id: 'gdrive' as const, label: 'Drive', activeColor: 'text-green-600', defaultColor: 'text-gray-400', Icon: GDriveIcon },
            ]).map(({ id, label, activeColor, defaultColor, Icon }) => {
              const hasUrl = detectedProvider !== null;
              const isActive = detectedProvider === id;
              return (
                <div key={id} className={cn(
                  'flex items-center gap-1.5 transition-all duration-200',
                  hasUrl
                    ? isActive
                      ? `${activeColor} scale-110`
                      : 'text-gray-200 scale-100'
                    : defaultColor
                )}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="transcript" className="block text-xs font-medium text-gray-400 mb-1.5">
            Transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste your ready-made transcript here..."
            rows={8}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-y transition-all"
            disabled={isProcessing}
          />
        </div>
      )}

      <button
        type="submit"
        disabled={isDisabled || noConfig}
        className={cn(
          'w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white transition-all',
          isDisabled || noConfig
            ? 'cursor-not-allowed bg-gray-300'
            : 'bg-black hover:bg-gray-800 active:bg-gray-900'
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
