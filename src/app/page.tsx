'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PipelineStep, StepStatus, ProgressEvent, ArticleType, PlatformProfile } from '@/types';
import { UrlForm } from '@/components/url-form';
import { ProgressDisplay } from '@/components/progress-display';
import { ArticleView } from '@/components/article-view';
import { OnboardingChecklist } from '@/components/onboarding-checklist';
import { createClient } from '@/lib/supabase/client';
import {
  getArticleTypes, getPlatformProfiles,
  getUserPreferences, upsertUserPreferences,
  getCompanyContext, saveArticle, updateArticleHtml,
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

type AppPhase = 'input' | 'processing-a' | 'review' | 'processing-b' | 'complete';

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('input');
  const [stepsA, setStepsA] = useState<StepInfo[]>(PHASE_A_STEPS);
  const [stepsB, setStepsB] = useState<StepInfo[]>(PHASE_B_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [structuredArticle, setStructuredArticle] = useState('');
  const [finalHTML, setFinalHTML] = useState('');
  const [savedArticleId, setSavedArticleId] = useState<string | null>(null);

  // Settings from Supabase
  const [articleTypes, setArticleTypes] = useState<ArticleType[]>([]);
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedPlatformId, setSelectedPlatId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [types, profs, prefs] = await Promise.all([
        getArticleTypes(supabase),
        getPlatformProfiles(supabase),
        getUserPreferences(supabase, user.id),
      ]);

      setArticleTypes(types);
      setPlatforms(profs);
      setSelectedTypeId(prefs.selectedArticleTypeId ?? types[0]?.id ?? '');
      setSelectedPlatId(prefs.selectedPlatformId ?? profs[0]?.id ?? '');
    }
    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase A: Generate structured article ─────────────

  const handleSubmit = useCallback(async (input: { videoUrl?: string; transcript?: string; sourceType?: string }) => {
    const articleType = articleTypes.find((t) => t.id === selectedTypeId);

    if (!articleType) {
      setError('Please select an article type in Settings');
      return;
    }

    // Save preferences
    if (userId) {
      upsertUserPreferences(supabase, userId, {
        selectedArticleTypeId: selectedTypeId,
        selectedPlatformId: selectedPlatformId,
      }).catch(() => {});
    }

    setPhase('processing-a');
    setError(null);
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setStructuredArticle('');
    setFinalHTML('');
    setSavedArticleId(null);

    // Get company context
    let companyContext: string | undefined;
    if (userId) {
      const ctx = await getCompanyContext(supabase, userId);
      if (ctx) {
        companyContext = `Company: ${ctx.name}\n${ctx.description}\nIndustry: ${ctx.industry ?? 'N/A'}\nTarget audience: ${ctx.targetAudience ?? 'N/A'}`;
      }
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
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      await readSSEStream(response, (event) => {
        if (event.step === 'error') {
          setError(event.message ?? 'An unknown error occurred');
          setStepsA((prev) =>
            prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s))
          );
        } else if (event.step === 'review' && event.article) {
          setStructuredArticle(event.article);
          setPhase('review');
          // Auto-save article to DB
          if (userId) {
            const title = event.article.match(/^#+\s+(.+)/m)?.[1]
              ?? event.article.split('\n').map(l => l.trim()).find(l => l.length > 0)?.slice(0, 120)
              ?? 'Untitled Article';
            const sourceType = input.transcript ? 'paste' : (input.videoUrl?.includes('drive.google') ? 'google-drive' : 'loom');
            saveArticle(supabase, userId, {
              title,
              sourceUrl: input.videoUrl,
              sourceType: sourceType as 'loom' | 'google-drive' | 'paste',
              articleTypeId: selectedTypeId,
              platformId: selectedPlatformId,
              markdown: event.article,
            }).then((id) => setSavedArticleId(id)).catch(() => {});
          }
        } else {
          setStepsA((prev) =>
            prev.map((s) =>
              s.step === event.step ? { ...s, status: event.status, message: event.message } : s
            )
          );
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection lost. Please try again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleTypes, platforms, selectedTypeId, selectedPlatformId, userId]);

  // ── Phase B: Generate HTML ───────────────────────────

  const handleGenerateHTML = useCallback(async () => {
    const platform = platforms.find((p) => p.id === selectedPlatformId);
    if (!platform) {
      setError('No platform profile selected');
      return;
    }

    if (platform.id === 'markdown-only' || (!platform.htmlTemplate && !platform.htmlPrompt)) {
      setFinalHTML(structuredArticle);
      setPhase('complete');
      return;
    }

    setPhase('processing-b');
    setError(null);
    setStepsB(PHASE_B_STEPS.map((s) => ({ ...s })));

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: 'html',
          article: structuredArticle,
          htmlPrompt: platform.htmlPrompt,
          htmlTemplate: platform.htmlTemplate,
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      await readSSEStream(response, (event) => {
        if (event.step === 'error') {
          setError(event.message ?? 'An unknown error occurred');
          setStepsB((prev) =>
            prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'error' } : s))
          );
        } else if (event.step === 'done' && event.html) {
          setFinalHTML(event.html);
          setPhase('complete');
          // Update saved article with HTML
          if (savedArticleId) {
            updateArticleHtml(supabase, savedArticleId, event.html, userId!).catch(() => {});
          }
        } else {
          setStepsB((prev) =>
            prev.map((s) =>
              s.step === event.step ? { ...s, status: event.status, message: event.message } : s
            )
          );
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection lost. Please try again.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platforms, selectedPlatformId, structuredArticle, savedArticleId]);

  // ── Reset ────────────────────────────────────────────

  function handleStartOver() {
    setPhase('input');
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setStepsB(PHASE_B_STEPS.map((s) => ({ ...s })));
    setError(null);
    setStructuredArticle('');
    setFinalHTML('');
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
            <p className="mt-2 text-sm text-gray-400">Paste a video URL or transcript to generate a KB article</p>
          </div>
          <UrlForm
            onSubmit={handleSubmit}
            isProcessing={false}
            articleTypes={articleTypes}
            platforms={platforms}
            selectedTypeId={selectedTypeId}
            selectedPlatformId={selectedPlatformId}
            onTypeChange={setSelectedTypeId}
            onPlatformChange={setSelectedPlatId}
          />
        </div>
      )}

      {phase === 'processing-a' && (
        <div className="flex w-full flex-col items-center">
          <ProgressDisplay steps={stepsA} error={error ?? undefined} />
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
          <ProgressDisplay steps={stepsB} error={error ?? undefined} />
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
            <button
              onClick={handleStartOver}
              className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SSE Reader Helper ────────────────────────────────────

async function readSSEStream(
  response: Response,
  onEvent: (event: ProgressEvent) => void
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));
            onEvent(event);
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }
}
