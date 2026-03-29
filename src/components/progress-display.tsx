'use client';

import { useState, useEffect, useRef } from 'react';
import { Circle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { PipelineStep, StepStatus } from '@/types';
import { cn } from '@/utils/cn';

interface StepInfo {
  step: PipelineStep;
  status: StepStatus;
  message?: string;
}

interface ProgressDisplayProps {
  steps: StepInfo[];
  error?: string;
  streamingText?: string;
}

const STEP_LABELS: Record<PipelineStep, string> = {
  resolve: 'Resolving video URL',
  transcribe: 'Transcribing audio',
  draft: 'Creating draft',
  structure: 'Structuring article',
  review: 'Ready for review',
  html: 'Generating HTML',
  done: 'Complete',
};

// Approximate seconds per step (for time estimate)
const STEP_ESTIMATES: Record<PipelineStep, number> = {
  resolve: 5,
  transcribe: 30,
  draft: 15,
  structure: 10,
  review: 0,
  html: 12,
  done: 0,
};

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pending':
      return <Circle className="h-4 w-4 text-gray-300" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-violet-600 animate-spin" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-violet-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function TimeEstimate({ step, status }: { step: PipelineStep; status: StepStatus }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'in_progress') {
      startRef.current = Date.now();
      setElapsed(0);
      const timer = setInterval(() => {
        if (startRef.current) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(timer);
    } else {
      startRef.current = null;
    }
  }, [status]);

  if (status !== 'in_progress') return null;

  const estimate = STEP_ESTIMATES[step];
  if (!estimate) return null;

  const remaining = Math.max(0, estimate - elapsed);
  const progress = Math.min(95, (elapsed / estimate) * 100);

  return (
    <div className="ml-7 mt-1">
      <div className="h-1 w-full max-w-[200px] rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-violet-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-300 mt-0.5">
        {remaining > 0 ? `~${remaining}s remaining` : 'Almost done...'}
      </p>
    </div>
  );
}

function StreamingPanel({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'h-full overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/50 px-6 py-5 font-mono text-sm leading-relaxed text-gray-600 whitespace-pre-wrap transition-opacity duration-300',
        text ? 'opacity-100' : 'opacity-40'
      )}
    >
      {text || (
        <span className="text-gray-300 italic">Waiting for AI to start writing...</span>
      )}
      {text && (
        <span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}

export function ProgressDisplay({ steps, error, streamingText }: ProgressDisplayProps) {
  const hasStreaming = streamingText !== undefined;

  return (
    <div className={cn(
      'w-full mt-8',
      hasStreaming ? 'max-w-5xl' : 'max-w-xl'
    )}>
      <div className={cn(
        hasStreaming ? 'flex gap-8' : ''
      )}>
        {/* Left: Steps */}
        <div className={cn(
          'shrink-0',
          hasStreaming ? 'w-[280px]' : 'w-full'
        )}>
          <ul className="space-y-1">
            {steps.map((s, i) => (
              <li key={s.step}>
                <div className="flex items-center gap-3 relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className={cn(
                      'absolute left-[7px] top-[28px] w-px h-[calc(100%+4px)]',
                      s.status === 'complete' ? 'bg-gray-300' : 'bg-gray-100'
                    )} />
                  )}
                  <div className="relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 w-full">
                    <StepIcon status={s.status} />
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'text-sm',
                          s.status === 'pending' && 'text-gray-300',
                          s.status === 'in_progress' && 'text-gray-900 font-medium',
                          s.status === 'complete' && 'text-gray-500',
                          s.status === 'error' && 'text-red-500'
                        )}
                      >
                        {STEP_LABELS[s.step]}
                      </span>
                      {s.message && s.status === 'in_progress' && (
                        <p className="text-xs text-gray-400 mt-0.5">{s.message}</p>
                      )}
                    </div>
                  </div>
                </div>
                {/* Time estimate bar */}
                <TimeEstimate step={s.step} status={s.status} />
              </li>
            ))}
          </ul>
        </div>

        {/* Right: Streaming text panel */}
        {hasStreaming && (
          <div className="flex-1 min-h-[360px]">
            <StreamingPanel text={streamingText ?? ''} />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600 mt-4">
          {error}
        </div>
      )}
    </div>
  );
}
