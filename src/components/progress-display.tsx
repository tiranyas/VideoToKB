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
  generate: 'Generating article',
  done: 'Complete',
};

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'pending':
      return <Circle className="h-5 w-5 text-gray-400" />;
    case 'in_progress':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
  }
}

export function ProgressDisplay({ steps, error }: ProgressDisplayProps) {
  return (
    <div className="w-full max-w-xl space-y-3 mt-6">
      <ul className="space-y-2">
        {steps.map((s) => (
          <li
            key={s.step}
            className={cn(
              'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors',
              s.status === 'in_progress' && 'bg-blue-50',
              s.status === 'complete' && 'bg-green-50',
              s.status === 'error' && 'bg-red-50',
              s.status === 'pending' && 'bg-gray-50'
            )}
          >
            <StepIcon status={s.status} />
            <span
              className={cn(
                'font-medium',
                s.status === 'pending' && 'text-gray-500',
                s.status === 'in_progress' && 'text-blue-700',
                s.status === 'complete' && 'text-green-700',
                s.status === 'error' && 'text-red-700'
              )}
            >
              {STEP_LABELS[s.step]}
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
