'use client';

import { useState } from 'react';
import { Globe, BookOpen, Layers, FileText, HelpCircle, MessageSquare, Code, LayoutGrid } from 'lucide-react';
import { PlatformCard } from './platform-card';
import type { LucideIcon } from 'lucide-react';

interface StepPlatformProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultPlatformId?: string;
}

interface PlatformInfo {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

const PLATFORMS: PlatformInfo[] = [
  { id: 'generic-html', name: 'Generic HTML', description: 'Works everywhere', icon: Globe },
  { id: 'helpjuice', name: 'Helpjuice', description: 'Accordion-rich articles', icon: BookOpen },
  { id: 'confluence', name: 'Confluence', description: 'Atlassian wiki format', icon: Layers },
  { id: 'notion', name: 'Notion', description: 'Clean semantic HTML', icon: FileText },
  { id: 'zendesk', name: 'Zendesk Help Center', description: 'Help Center articles', icon: HelpCircle },
  { id: 'intercom', name: 'Intercom', description: 'Minimal clean HTML', icon: MessageSquare },
  { id: 'markdown-only', name: 'Markdown', description: 'GitHub, GitBook, etc.', icon: Code },
];

export function StepPlatform({ onNext, onBack, onSkip, saving, defaultPlatformId }: StepPlatformProps) {
  const [selectedId, setSelectedId] = useState<string | null>(defaultPlatformId ?? null);

  function handleSubmit() {
    onNext({ platformId: selectedId ?? 'generic-html' });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <LayoutGrid className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Choose your platform</h2>
          <p className="text-gray-500 text-sm">We&apos;ll format articles for your knowledge base</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            id={p.id}
            name={p.name}
            description={p.description}
            icon={p.icon}
            selected={selectedId === p.id}
            onClick={() => setSelectedId(p.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => onSkip()}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip this step
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !selectedId}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
