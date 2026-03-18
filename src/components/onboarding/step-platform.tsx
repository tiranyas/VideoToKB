'use client';

interface StepPlatformProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultPlatformId?: string;
}

export function StepPlatform({ onNext, onBack, onSkip, saving }: StepPlatformProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose your platform</h2>
      <p className="text-gray-500 text-sm mb-6">Placeholder - will be replaced in Task 2</p>
      <button onClick={onBack} className="mr-2">Back</button>
      <button onClick={() => onNext({ platformId: 'generic-html' })} disabled={saving}>Continue</button>
      <button onClick={onSkip} className="ml-2 text-sm text-gray-400">Skip this step</button>
    </div>
  );
}
