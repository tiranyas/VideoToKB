'use client';

import { useState, useCallback } from 'react';
import type { PipelineStep, StepStatus, ProgressEvent } from '@/types';
import { UrlForm } from '@/components/url-form';
import { ProgressDisplay } from '@/components/progress-display';
import { ArticleView } from '@/components/article-view';

interface StepInfo {
  step: PipelineStep;
  status: StepStatus;
  message?: string;
}

const INITIAL_STEPS: StepInfo[] = [
  { step: 'resolve', status: 'pending' },
  { step: 'transcribe', status: 'pending' },
  { step: 'generate', status: 'pending' },
  { step: 'done', status: 'pending' },
];

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState<StepInfo[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState('');
  const [showResult, setShowResult] = useState(false);

  const hasActivity = steps.some((s) => s.status !== 'pending');

  const handleSubmit = useCallback(async (input: { videoUrl?: string; transcript?: string; template: string }) => {
    setIsProcessing(true);
    setError(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setArticle('');
    setShowResult(false);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        // Keep the last part as it may be incomplete
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const event: ProgressEvent = JSON.parse(data);

                if (event.step === 'error') {
                  setError(event.message ?? 'An unknown error occurred');
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.status === 'in_progress' ? { ...s, status: 'error' } : s
                    )
                  );
                } else {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.step === event.step
                        ? { ...s, status: event.status, message: event.message }
                        : s
                    )
                  );

                  if (event.step === 'done' && event.article) {
                    setArticle(event.article);
                    setShowResult(true);
                  }
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Connection lost. Please try again.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  function handleStartOver() {
    setIsProcessing(false);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s })));
    setError(null);
    setArticle('');
    setShowResult(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">VideoToKB</h1>
        <p className="mt-2 text-gray-500">Turn video recordings into KB articles</p>
      </div>

      {!showResult ? (
        <div className="flex w-full flex-col items-center">
          <UrlForm onSubmit={handleSubmit} isProcessing={isProcessing} />
          {(isProcessing || hasActivity) && (
            <ProgressDisplay steps={steps} error={error ?? undefined} />
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <ArticleView article={article} onChange={setArticle} />
          <button
            onClick={handleStartOver}
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
