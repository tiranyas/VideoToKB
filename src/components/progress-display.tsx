'use client';

import { useState, useEffect, useRef } from 'react';
import { Circle, Loader2, CheckCircle2, XCircle, X, Eye } from 'lucide-react';
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

const AGENT_LABELS: Partial<Record<PipelineStep, string>> = {
  draft: 'Draft — Agent 2',
  structure: 'Structure — Agent 3',
  html: 'HTML — Agent 4',
};

function StreamingPanel({ text, activeStep, onClose }: { text: string; activeStep?: PipelineStep; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  const agentLabel = activeStep ? AGENT_LABELS[activeStep] : undefined;

  return (
    <div className="fixed top-0 right-0 h-screen w-[480px] z-40 animate-in slide-in-from-right duration-300">
      <div className="h-full flex flex-col bg-white/5 backdrop-blur-2xl border-l border-violet-500/10 shadow-2xl shadow-violet-500/5">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-500/10">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-700">Live Preview</span>
            {agentLabel && (
              <>
                <span className="text-gray-300">—</span>
                <span className="text-xs font-medium text-violet-600 bg-violet-500/10 border border-violet-500/15 rounded-full px-2.5 py-0.5">{agentLabel}</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-500/10 transition-colors"
            title="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-6 py-5 font-mono text-[13px] leading-relaxed text-gray-600 whitespace-pre-wrap"
        >
          {text || (
            <span className="text-gray-300 italic font-sans">Waiting for AI to start writing...</span>
          )}
          {text && (
            <span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse rounded-sm align-middle" />
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-violet-500/10">
          <span className="text-[11px] text-gray-400">
            {text ? `${text.length.toLocaleString()} characters` : 'Waiting...'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProgressDisplay({ steps, error, streamingText }: ProgressDisplayProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const hasStreamingContent = !!streamingText;
  const activeStep = steps.find((s) => s.status === 'in_progress')?.step;

  // Auto-open panel when streaming starts
  useEffect(() => {
    if (hasStreamingContent) {
      setPanelOpen(true);
    }
  }, [hasStreamingContent]);

  return (
    <>
      <div className="w-full max-w-xl mt-8">
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

        {/* Show preview button when panel is closed but streaming is active */}
        {hasStreamingContent && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-100 transition-colors"
          >
            <Eye className="h-4 w-4" />
            Show live preview
          </button>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600 mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Floating side panel */}
      {hasStreamingContent && panelOpen && (
        <StreamingPanel
          text={streamingText ?? ''}
          activeStep={activeStep}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
