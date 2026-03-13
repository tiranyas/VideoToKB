'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PipelineStep, StepStatus, ProgressEvent, ArticleType, PlatformProfile } from '@/types';
import { UrlForm } from '@/components/url-form';
import { ProgressDisplay } from '@/components/progress-display';
import { ArticleView } from '@/components/article-view';
import {
  getArticleTypes, getPlatformProfiles,
  getSelectedArticleTypeId, getSelectedPlatformId,
  setSelectedArticleTypeId, setSelectedPlatformId,
  getCompanyContext, seedDefaults,
} from '@/lib/storage';

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

  // Settings from localStorage
  const [articleTypes, setArticleTypes] = useState<ArticleType[]>([]);
  const [platforms, setPlatforms] = useState<PlatformProfile[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedPlatformId, setSelectedPlatId] = useState('');

  useEffect(() => {
    seedDefaults();
    const types = getArticleTypes();
    const profs = getPlatformProfiles();
    setArticleTypes(types);
    setPlatforms(profs);
    setSelectedTypeId(getSelectedArticleTypeId() ?? types[0]?.id ?? '');
    setSelectedPlatId(getSelectedPlatformId() ?? profs[0]?.id ?? '');
  }, []);

  // ── Phase A: Generate structured article ─────────────

  const handleSubmit = useCallback(async (input: { videoUrl?: string; transcript?: string }) => {
    const articleType = articleTypes.find((t) => t.id === selectedTypeId);
    const platform = platforms.find((p) => p.id === selectedPlatformId);

    if (!articleType) {
      setError('Please select an article type in Settings');
      return;
    }

    setSelectedArticleTypeId(selectedTypeId);
    setSelectedPlatformId(selectedPlatformId);

    setPhase('processing-a');
    setError(null);
    setStepsA(PHASE_A_STEPS.map((s) => ({ ...s })));
    setStructuredArticle('');
    setFinalHTML('');

    // Get company context
    const ctx = getCompanyContext();
    const companyContext = ctx
      ? `Company: ${ctx.name}\n${ctx.description}\nIndustry: ${ctx.industry ?? 'N/A'}\nTarget audience: ${ctx.targetAudience ?? 'N/A'}`
      : undefined;

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
          // Phase A complete
          setStructuredArticle(event.article);
          setPhase('review');
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
  }, [articleTypes, platforms, selectedTypeId, selectedPlatformId]);

  // ── Phase B: Generate HTML ───────────────────────────

  const handleGenerateHTML = useCallback(async () => {
    const platform = platforms.find((p) => p.id === selectedPlatformId);
    if (!platform) {
      setError('No platform profile selected');
      return;
    }

    // "Markdown Only" — skip HTML generation, just show the article as final
    if (platform.id === 'markdown-only' || !platform.htmlTemplate) {
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
  }, [platforms, selectedPlatformId, structuredArticle]);

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
  const isMarkdownOnly = selectedPlatform?.id === 'markdown-only' || !selectedPlatform?.htmlTemplate;

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">VideoToKB</h1>
        <p className="mt-2 text-gray-500">Turn video recordings into KB articles</p>
      </div>

      {/* Phase: Input */}
      {phase === 'input' && (
        <div className="flex w-full flex-col items-center">
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

      {/* Phase: Processing A */}
      {phase === 'processing-a' && (
        <div className="flex w-full flex-col items-center">
          <ProgressDisplay steps={stepsA} error={error ?? undefined} />
        </div>
      )}

      {/* Phase: Review */}
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
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Phase: Processing B */}
      {phase === 'processing-b' && (
        <div className="flex w-full flex-col items-center">
          <ProgressDisplay steps={stepsB} error={error ?? undefined} />
        </div>
      )}

      {/* Phase: Complete */}
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
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back to Edit
            </button>
            <button
              onClick={handleStartOver}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
