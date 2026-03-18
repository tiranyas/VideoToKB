'use client';

interface StepTemplateProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  workspaceId?: string;
  selectedPlatformId?: string;
}

export function StepTemplate({ onNext, onBack, onSkip, saving }: StepTemplateProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Match your style</h2>
      <p className="text-gray-500 text-sm mb-6">Placeholder - will be replaced in Task 2</p>
      <button onClick={onBack} className="mr-2">Back</button>
      <button onClick={() => onNext({})} disabled={saving}>Finish setup</button>
      <button onClick={onSkip} className="ml-2 text-sm text-gray-400">Skip and finish</button>
    </div>
  );
}
