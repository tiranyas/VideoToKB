'use client';

import type { WorkspaceBranding } from '@/types';

interface StepBrandProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultBrand?: {
    companyName?: string;
    companyDescription?: string;
    industry?: string;
    targetAudience?: string;
    branding?: WorkspaceBranding;
  };
  workspaceName?: string;
}

export function StepBrand({ onNext, onBack, onSkip, saving }: StepBrandProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Your brand</h2>
      <p className="text-gray-500 text-sm mb-6">Placeholder - will be replaced in Task 2</p>
      <button onClick={onBack} className="mr-2">Back</button>
      <button onClick={() => onNext({})} disabled={saving}>Continue</button>
      <button onClick={onSkip} className="ml-2 text-sm text-gray-400">Skip this step</button>
    </div>
  );
}
