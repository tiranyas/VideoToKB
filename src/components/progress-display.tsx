'use client';

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

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pending':
      return <Circle className="h-4 w-4 text-gray-300" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-gray-900 animate-spin" />;
    case 'complete':
      return <CheckCircle2 className="h-4 w-4 text-gray-900" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

export function ProgressDisplay({ steps, error }: ProgressDisplayProps) {
  return (
    <div className="w-full max-w-xl space-y-4 mt-8">
      <ul className="space-y-1">
        {steps.map((s, i) => (
          <li
            key={s.step}
            className="flex items-center gap-3 relative"
          >
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={cn(
                'absolute left-[7px] top-[28px] w-px h-[calc(100%+4px)]',
                s.status === 'complete' ? 'bg-gray-300' : 'bg-gray-100'
              )} />
            )}
            <div className="relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 w-full">
              <StepIcon status={s.status} />
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
            </div>
          </li>
        ))}
      </ul>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
