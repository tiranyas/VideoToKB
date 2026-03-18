'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface StepWorkspaceProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultName?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';
}

export function StepWorkspace({ onNext, onSkip, saving, defaultName }: StepWorkspaceProps) {
  const [name, setName] = useState(defaultName ?? '');
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 50;
  const showError = touched && !isValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setTouched(true);
      return;
    }
    onNext({ name: trimmed, slug: slugify(trimmed) });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Welcome to KBPipe</h2>
          <p className="text-gray-500 text-sm">Let&apos;s set up your workspace</p>
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-1.5">
          Workspace name
        </label>
        <input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setTouched(true); }}
          onBlur={() => setTouched(true)}
          placeholder="e.g. Acme Corp"
          maxLength={50}
          autoFocus
          className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
            showError ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
        />
        <div className="flex justify-between mt-1">
          {showError ? (
            <span className="text-xs text-red-500">
              {trimmed.length === 0 ? 'Workspace name is required' : 'Max 50 characters'}
            </span>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400">{trimmed.length}/50</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip this step
        </button>
        <button
          type="submit"
          disabled={saving || !isValid}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </form>
  );
}
