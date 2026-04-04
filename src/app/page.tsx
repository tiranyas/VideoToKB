'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PipelineStep, StepStatus, ArticleType, PlatformProfile, SSEEvent } from '@/types';
import { readSSEStream } from '@/lib/sse';
import { toast } from 'sonner';
import { UrlForm } from '@/components/url-form';
import { ProgressDisplay } from '@/components/progress-display';
import { ArticleView } from '@/components/article-view';
import { HelpjuicePublishDialog } from '@/components/helpjuice-publish-dialog';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import {
  getArticleTypes, getPlatformProfiles,
  getWorkspacePreferences, upsertWorkspacePreferences,
  saveArticle, updateArticleHtml,
} from '@/lib/supabase/queries';

interface StepInfo {
  step: PipelineStep;
  status: StepStatus;
  message?: string;
}

const PHASE_A_STEPS: StepInfo[] = [
  { step: 'resolve', status: 'pending' },
  { step: 'transcribe', status: 'pending' },
  { step: 'draft', status: 'pending' },
  { step: 'structure', status: 'pending' },
];

const PHASE_B_STEPS: StepInfo[] = [
  { step: 'html', status: 'pending' },
  { step: 'done', status: 'pending' },
];

type AppPhase = 'input' | 'processing-a' | 'review' | 'processing-b' | 'complete' | 'youtube-help';

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('input');
  const [stepsA, setStepsA] = useState<StepInfo[]>(PHASE_A_STEPS);
  const [stepsB, setStepsB] = useState<StepInfo[]>(PHASE_B_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [draftArticle, setDraftArticle] = useState('');
  const [structuredArticle, setStructuredArticle] = useState('');
  const [finalHTML, setFinalHTML] = useState('');
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [helpjuiceConnected, setHelpjuiceConnected] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingArticle = useRef(false);
  const isProcessing = useRef(false);
  const lastInputRef = useRef<{ videoUrl?: string; transcript?: string; sourceType?: string } | null>(null);

  // Settings from Supabase
  const [articleTypes, setArticleTypes] = useState<ArticleType[]>([]);
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedPlatformId, setSelectedPlatId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();
  const { activeWorkspace } = useWorkspace();

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const [types, profs] = await Promise.all([
          getArticleTypes(supabase, activeWorkspace?.id),
          getPlatformProfiles(supabase, activeWorkspace?.id),
        ]);

        setArticleTypes(types);
        setPlatforms(profs);

        // Load workspace-scoped preferences
        if (activeWorkspace) {
          const prefs = await getWorkspacePreferences(supabase, activeWorkspace.id);
          setSelectedTypeId(prefs.selectedArticleTypeId ?? types[0]?.id ?? '');
          setSelectedPlatId(prefs.selectedPlatformId ?? profs[0]?.id ?? '');
        } else {
          setSelectedTypeId(types[0]?.id ?? '');
          setSelectedPlatId(profs[0]?.id ?? '');
        }
        // Check Helpjuice connection
        fetch('/api/integrations/helpjuice?action=status')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.connected) setHelpjuiceConnected(true); })
          .catch(console.error);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings. Please refresh the page.');
      }
    }
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace?.id]);

  // ── Phase A: Generate structured article ─────────────

  const handleSubmit = useCallback(async (input: { videoUrl?: string; transcript?: string; sourceType?: string }) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    lastInputRef.current = input;

    const articleType = articleTypes.find((t) => t.id === selectedTypeId);

    if (!articleType) {
      setError('Please select an article type in Settings');
      isProcessing.current = false;
      return;
    }

    // Save workspace preferences
    if (activeWorkspace) {
      upsertWorkspacePreferences(supabase, activeWorkspace.id, {
        selectedArticleTypeId: selectedTypeId,
        selectedPlatformId: selectedPlatformId,
      }).catch(console.error);
    }

    setPhase('processing-a');
    setError(null);
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setDraftArticle('');
    setStructuredArticle('');
    setFinalHTML('');
    setSavedArticleId(null);
    setStreamingText('');

    // Create abort controller for cancel support + timeout safety net (5.5 min)
    const abortController = new AbortController();
    abortRef.current = abortController;
    timeoutRef.current = setTimeout(() => abortController.abort(), 330_000);

    // Get company context from active workspace
    let companyContext: string | undefined;
    if (activeWorkspace?.companyName || activeWorkspace?.companyDescription) {
      companyContext = `Company: ${activeWorkspace.companyName ?? 'N/A'}\n${activeWorkspace.companyDescription ?? ''}\nIndustry: ${activeWorkspace.industry ?? 'N/A'}\nTarget audience: ${activeWorkspace.targetAudience ?? 'N/A'}`;
    }

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'generate',
          videoUrl: input.videoUrl,
          transcript: input.transcript,
          draftPrompt: articleType.draftPrompt,
          structurePrompt: articleType.structurePrompt,
          companyContext,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          if (errData.error === 'quota_exceeded') {
            const msg = errData.message ?? 'You have reached your article limit for this month.';
            setError(msg);
            toast.error('Article limit reached', {
              description: 'Upgrade your plan to generate more articles.',
              action: {
                label: 'Upgrade',
                onClick: () => window.location.href = '/billing',
              },
              duration: 8000,
            });
            setPhase('input');
            isProcessing.current = false;
            return;
          }
        }
        throw new Error(`Server error: ${response.status}`);
      }

      await readSSEStream(response, (event: SSEEvent) => {
        // Handle streaming token events
        if ('type' in event && event.type === 'token') {
          setStreamingText((prev) => prev + event.text);
          return;
        }

        // Clear streaming text when step changes
        if ('status' in event && event.status === 'in_progress') {
          setStreamingText('');
        }

        if (event.step === 'error') {
          if ('message' in event && event.message === 'youtube_blocked') {
            setYoutubeUrl(input.videoUrl ?? null);
            setPhase('youtube-help');
            return;
          }
          setError('message' in event ? event.message ?? 'An unknown error occurred' : 'An unknown error occurred');
          setStepsA((prev) =>
            prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s))
          );
        } else if (event.step === 'review' && 'article' in event && event.article) {
          setStreamingText('');
          const eventDraft = 'draft' in event ? event.draft ?? '' : '';
          setDraftArticle(eventDraft);
          setStructuredArticle(event.article);
          setPhase('review');
          // Auto-save article to DB (guarded against concurrent saves)
          if (userId && activeWorkspace && !isSavingArticle.current) {
            isSavingArticle.current = true;
            const title = event.article.match(/^#+\s+(.+)/m)?.[1]
              ?? event.article.split('\n').map(l => l.trim()).find(l => l.length > 0)?.slice(0, 120)
              ?? 'Untitled Article';
            const sourceType = input.transcript ? 'paste'
              : input.videoUrl?.includes('drive.google') ? 'google-drive'
              : (input.videoUrl?.includes('youtube.com') || input.videoUrl?.includes('youtu.be')) ? 'youtube'
              : 'loom';
            saveArticle(supabase, userId, activeWorkspace.id, {
              title,
              sourceUrl: input.videoUrl,
              sourceType: sourceType as 'loom' | 'google-drive' | 'youtube' | 'paste',
              articleTypeId: selectedTypeId,
              platformId: selectedPlatformId,
              draft: eventDraft || undefined,
              markdown: event.article,
            }).then((id) => setSavedArticleId(id)).catch(console.error).finally(() => { isSavingArticle.current = false; });
          }
        } else {
          setStepsA((prev) =>
            prev.map((s) =>
              s.step === event.step ? { ...s, status: 'status' in event ? event.status : s.status, message: 'message' in event ? event.message : s.message } : s
            )
          );
        }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled or timeout — silently reset
        return;
      }
      setError(err instanceof Error ? err.message : 'Connection lost. Please try again.');
      setPhase('input');
    } finally {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      abortRef.current = null;
      isProcessing.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleTypes, platforms, selectedTypeId, selectedPlatformId, userId, activeWorkspace]);

  // ── Phase B: Generate HTML ───────────────────────────

  const handleGenerateHTML = useCallback(async () => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    const platform = platforms.find((p) => p.id === selectedPlatformId);
    if (!platform) {
      setError('No platform profile selected');
      isProcessing.current = false;
      return;
    }

    if (platform.id === 'markdown-only' || (!platform.htmlTemplate && !platform.htmlPrompt)) {
      setFinalHTML(structuredArticle);
      setPhase('complete');
      isProcessing.current = false;
      return;
    }

    setPhase('processing-b');
    setError(null);
    setStepsB(PHASE_B_STEPS.map((s) => ({ ...s })));
    setStreamingText('');

    const abortController = new AbortController();
    abortRef.current = abortController;
    timeoutRef.current = setTimeout(() => abortController.abort(), 330_000);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'html',
          article: structuredArticle,
          htmlPrompt: platform.htmlPrompt,
          htmlTemplate: platform.htmlTemplate,
          branding: activeWorkspace?.branding,
          applyBranding: platform.applyBranding,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      await readSSEStream(response, (event: SSEEvent) => {
        // Handle streaming token events
        if ('type' in event && event.type === 'token') {
          setStreamingText((prev) => prev + event.text);
          return;
        }

        if ('status' in event && event.status === 'in_progress') {
          setStreamingText('');
        }

        if (event.step === 'error') {
          setError('message' in event ? event.message ?? 'An unknown error occurred' : 'An unknown error occurred');
          setStepsB((prev) =>
            prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s))
          );
        } else if (event.step === 'done' && 'html' in event && event.html) {
          setStreamingText('');
          setFinalHTML(event.html);
          setPhase('complete');
          // Update saved article with HTML
          if (savedArticleId && userId) {
            updateArticleHtml(supabase, savedArticleId, event.html).catch(console.error);
          }
        } else {
          setStepsB((prev) =>
            prev.map((s) =>
              s.step === event.step ? { ...s, status: 'status' in event ? event.status : s.status, message: 'message' in event ? event.message : s.message } : s
            )
          );
        }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Connection lost. Please try again.');
    } finally {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      abortRef.current = null;
      isProcessing.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platforms, selectedPlatformId, structuredArticle, savedArticleId]);

  // ── Reset ────────────────────────────────────────────

  function handleCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    isProcessing.current = false;
    setPhase('input');
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setStepsB(PHASE_B_STEPS.map((s) => ({ ...s })));
    setError(null);
    setStreamingText('');
  }

  function handleStartOver() {
    isProcessing.current = false;
    setPhase('input');
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setStepsB(PHASE_B_STEPS.map((s) => ({ ...s })));
    setError(null);
    setDraftArticle('');
    setStructuredArticle('');
    setFinalHTML('');
    setStreamingText('');
  }

  function handleBackToEdit() {
    setPhase('review');
    setFinalHTML('');
    setError(null);
  }

  // ── Render ───────────────────────────────────────────

  const selectedPlatform = platforms.find((p) => p.id === selectedPlatformId);
  const isMarkdownOnly = selectedPlatform?.id === 'markdown-only' || (!selectedPlatform?.htmlTemplate && !selectedPlatform?.htmlPrompt);

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12">
      {phase === 'input' && (
        <div className="flex w-full flex-col items-center mt-8">
          <OnboardingChecklist />
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Create Article</h1>
            <p className="mt-2 text-sm text-gray-400">Paste a video URL, user story, or any content to generate a KB article</p>
          </div>
          <UrlForm
            onSubmit={handleSubmit}
            isProcessing={phase !== 'input'}
            articleTypes={articleTypes}
            platforms={platforms}
            selectedTypeId={selectedTypeId}
            selectedPlatformId={selectedPlatformId}
            onTypeChange={setSelectedTypeId}
            onPlatformChange={setSelectedPlatId}
          />
        </div>
      )}

      {phase === 'youtube-help' && (
        <div className="flex w-full flex-col items-center mt-8">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg shadow-gray-200/50 p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <svg className="h-6 w-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                YouTube Transcript Required
              </h2>
              <p className="text-sm text-gray-500">
                YouTube blocks automatic caption extraction from servers.
                <br />
                Copy the transcript manually — it takes 30 seconds:
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">1</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Open the video on YouTube</p>
                  {youtubeUrl && (
                    <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline break-all">
                      {youtubeUrl}
                    </a>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">2</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Click &quot;...more&quot; under the video description</p>
                  <p className="text-xs text-gray-400">Then click &quot;Show transcript&quot;</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">3</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Select all transcript text and copy it</p>
                  <p className="text-xs text-gray-400">Ctrl+A → Ctrl+C in the transcript panel</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">4</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Come back here and paste it</p>
                  <p className="text-xs text-gray-400">Switch to &quot;Paste Content&quot; mode below</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setPhase('input');
                setError(null);
                setYoutubeUrl(null);
              }}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-3 text-sm font-medium text-white transition-all hover:from-violet-700 hover:to-blue-600"
            >
              Got it — paste transcript
            </button>
          </div>
        </div>
      )}

      {phase === 'processing-a' && (
        <div className="flex w-full flex-col items-center">
          <ProgressDisplay steps={stepsA} error={error ?? undefined} streamingText={streamingText} />
          <div className="mt-4 flex items-center gap-3">
            {error && lastInputRef.current && (
              <button
                onClick={() => { if (lastInputRef.current) handleSubmit(lastInputRef.current); }}
                className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                Retry
              </button>
            )}
            <button
              onClick={handleCancel}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="flex w-full flex-col items-center gap-4">
          <ArticleView
            article={structuredArticle}
            onChange={setStructuredArticle}
            mode="review"
            onGenerateHTML={isMarkdownOnly ? undefined : handleGenerateHTML}
            platformName={selectedPlatform?.name}
          />
          <button
            onClick={handleStartOver}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            Start Over
          </button>
        </div>
      )}

      {phase === 'processing-b' && (
        <div className="flex w-full flex-col items-center mt-8">
          <ProgressDisplay steps={stepsB} error={error ?? undefined} streamingText={streamingText} />
          <button
            onClick={handleCancel}
            className="mt-4 rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex w-full flex-col items-center gap-4">
          <ArticleView
            article={finalHTML}
            onChange={setFinalHTML}
            mode="final"
          />
          <div className="flex gap-3">
            <button
              onClick={handleBackToEdit}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              Back to Edit
            </button>
            {helpjuiceConnected && selectedPlatformId === 'helpjuice' && savedArticleId && (
              <button
                onClick={() => setPublishDialogOpen(true)}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Publish to Helpjuice
              </button>
            )}
            <button
              onClick={handleStartOver}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              Start Over
            </button>
          </div>

          {savedArticleId && (
            <HelpjuicePublishDialog
              open={publishDialogOpen}
              onClose={() => setPublishDialogOpen(false)}
              articleId={savedArticleId}
              articleTitle={structuredArticle.split('\n')[0]?.replace(/^#+\s*/, '') || 'Untitled Article'}
            />
          )}
        </div>
      )}
    </div>
  );
}

