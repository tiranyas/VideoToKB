'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Loader2, Settings, Clock, Film } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import type { ArticleType, PlatformProfile } from '@/types';
import { OUTPUT_LANGUAGES } from '@/lib/languages';

type InputMode = 'url' | 'transcript';
type VideoProvider = 'youtube' | 'loom' | 'gdrive' | null;

interface VideoMeta {
  title: string;
  thumbnail: string | null;
  duration: number | null;
  provider: 'youtube' | 'loom' | 'gdrive';
}

function detectProvider(url: string): VideoProvider {
  if (!url.trim()) return null;
  if (url.includes('youtube.com/') || url.includes('youtu.be/')) return 'youtube';
  if (url.includes('loom.com/share/')) return 'loom';
  if (url.includes('drive.google.com')) return 'gdrive';
  return null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
    <svg className={className} viewBox="0 0 32 32" fill="currentColor">
      <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm0 24a8 8 0 110-16 8 8 0 010 16z"/>
      <circle cx="16" cy="16" r="4"/>
    </svg>
  );
}

function GDriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 87.3 78" fill="currentColor">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z"/>
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5l16.15-28z"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.95 10.3 7.8 13.5z"/>
      <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.85 0H34.44c-1.65 0-3.2.45-4.55 1.2L43.65 25z"/>
      <path d="M59.8 53H27.5l-13.75 23.8c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.45 4.55-1.2L59.8 53z"/>
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.5c0-1.55-.4-3.1-1.2-4.5l-12.7-22z"/>
    </svg>
  );
}

// ── Video Preview Card ──────────────────────────────────

function VideoPreview({ meta, loading }: { meta: VideoMeta | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3 animate-pulse">
        <div className="h-16 w-28 shrink-0 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/3 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!meta) return null;

  const providerColors = {
    youtube: 'border-red-200 bg-red-50/30',
    loom: 'border-purple-200 bg-purple-50/30',
    gdrive: 'border-green-200 bg-green-50/30',
  };

  const providerLabels = {
    youtube: 'YouTube',
    loom: 'Loom',
    gdrive: 'Google Drive',
  };

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-3 transition-all', providerColors[meta.provider])}>
      {/* Thumbnail */}
      {meta.thumbnail ? (
        <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meta.thumbnail}
            alt={meta.title}
            className="h-full w-full object-cover"
          />
          {meta.duration != null && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {formatDuration(meta.duration)}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-200/50">
          <Film className="h-6 w-6 text-gray-400" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900" title={meta.title}>
          {meta.title}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          <span>{providerLabels[meta.provider]}</span>
          {meta.duration != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(meta.duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Form ───────────────────────────────────────────

interface UrlFormProps {
  onSubmit: (input: { videoUrl?: string; transcript?: string }) => void;
  isProcessing: boolean;
  articleTypes: ArticleType[];
  platforms: PlatformProfile[];
  selectedTypeId: string;
  selectedPlatformId: string;
  onTypeChange: (id: string) => void;
  onPlatformChange: (id: string) => void;
  outputLanguage: string;
  onLanguageChange: (lang: string) => void;
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
  outputLanguage,
  onLanguageChange,
}: UrlFormProps) {
  const [mode, setMode] = useState<InputMode>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const lastFetchedUrl = useRef('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectedProvider = useMemo(() => detectProvider(videoUrl), [videoUrl]);

  // Fetch video metadata when URL changes (debounced)
  const fetchMeta = useCallback(async (url: string) => {
    if (!detectProvider(url)) {
      setVideoMeta(null);
      return;
    }
    if (url === lastFetchedUrl.current) return;
    lastFetchedUrl.current = url;

    setMetaLoading(true);
    try {
      const res = await fetch('/api/video-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data: VideoMeta = await res.json();
        setVideoMeta(data);
      } else {
        setVideoMeta(null);
      }
    } catch {
      setVideoMeta(null);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const provider = detectProvider(videoUrl);
    if (!provider) {
      setVideoMeta(null);
      lastFetchedUrl.current = '';
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchMeta(videoUrl);
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [videoUrl, fetchMeta]);

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
          <label htmlFor="article-type" className="block text-xs font-medium text-gray-400 mb-1.5">Article Type</label>
          <select
            id="article-type"
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
          <label htmlFor="output-platform" className="block text-xs font-medium text-gray-400 mb-1.5">Output Platform</label>
          <select
            id="output-platform"
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

      {/* Output language */}
      <div>
        <label htmlFor="output-language" className="block text-xs font-medium text-gray-400 mb-1.5">Output Language</label>
        <select
          id="output-language"
          value={outputLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
          disabled={isProcessing}
        >
          {OUTPUT_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
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
              ? 'bg-violet-600 text-white shadow-sm'
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
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          disabled={isProcessing}
        >
          Paste Content
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

          {/* Video Preview Card */}
          {(metaLoading || videoMeta) && (
            <VideoPreview meta={videoMeta} loading={metaLoading} />
          )}

          {/* Provider icons — all on by default, only matched one stays colored */}
          {!videoMeta && !metaLoading && (
            <div className="flex items-center justify-center gap-6">
              {([
                { id: 'youtube' as const, label: 'YouTube', activeColor: 'text-red-500', defaultColor: 'text-red-400', Icon: YouTubeIcon },
                { id: 'loom' as const, label: 'Loom', activeColor: 'text-purple-500', defaultColor: 'text-purple-400', Icon: LoomIcon },
                { id: 'gdrive' as const, label: 'Drive', activeColor: 'text-green-600', defaultColor: 'text-green-500', Icon: GDriveIcon },
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
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="transcript" className="block text-xs font-medium text-gray-400 mb-1.5">
            Your Content
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste any content — user stories, meeting notes, feature specs, transcripts, process descriptions..."
            rows={8}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-y transition-all"
            disabled={isProcessing}
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Works with any text: user stories, specs, transcripts, release notes, meeting summaries, and more.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isDisabled || noConfig}
        className={cn(
          'w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white transition-all',
          isDisabled || noConfig
            ? 'cursor-not-allowed bg-gray-300'
            : 'bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-700 hover:to-blue-600 active:from-violet-800 active:to-blue-700'
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
