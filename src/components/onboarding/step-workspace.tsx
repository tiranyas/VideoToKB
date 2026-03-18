'use client';

interface StepWorkspaceProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultName?: string;
}

export function StepWorkspace({ onNext, onSkip, saving, defaultName }: StepWorkspaceProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Name your workspace</h2>
      <p className="text-gray-500 text-sm mb-6">Placeholder - will be replaced in Task 2</p>
      <button onClick={() => onNext({ name: defaultName ?? 'My Workspace', slug: 'my-workspace' })} disabled={saving}>
        Continue
      </button>
      <button onClick={onSkip} className="ml-2 text-sm text-gray-400">Skip this step</button>
    </div>
  );
}
