'use client';

import { useState, useCallback } from 'react';
import { Globe, AlertCircle, Loader2 } from 'lucide-react';
import { ColorSwatch } from './color-swatch';
import type { WorkspaceBranding } from '@/types';

interface BrandData {
  companyName?: string;
  companyDescription?: string;
  industry?: string;
  targetAudience?: string;
  branding?: WorkspaceBranding;
}

interface StepBrandProps {
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  onSkip: () => void;
  saving: boolean;
  defaultBrand?: BrandData;
  workspaceName?: string;
}

interface ScrapeResult {
  name?: string;
  description?: string;
  industry?: string;
  targetAudience?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
  };
}

export function StepBrand({ onNext, onBack, onSkip, saving, defaultBrand, workspaceName }: StepBrandProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);

  const [companyName, setCompanyName] = useState(defaultBrand?.companyName ?? '');
  const [description, setDescription] = useState(defaultBrand?.companyDescription ?? '');
  const [industry, setIndustry] = useState(defaultBrand?.industry ?? '');
  const [colors, setColors] = useState<string[]>(
    [defaultBrand?.branding?.primaryColor, defaultBrand?.branding?.accentColor].filter(Boolean) as string[]
  );
  const [primaryIdx, setPrimaryIdx] = useState<number | null>(defaultBrand?.branding?.primaryColor ? 0 : null);
  const [accentIdx, setAccentIdx] = useState<number | null>(defaultBrand?.branding?.accentColor ? 1 : null);

  const [showNameMismatch, setShowNameMismatch] = useState(false);

  const analyze = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/scrape-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error('Failed to analyze website');
      const data: ScrapeResult = await res.json();

      if (data.name) setCompanyName(data.name);
      if (data.description) setDescription(data.description);
      if (data.industry) setIndustry(data.industry);
      // Map individual color properties to array
      const extractedColors: string[] = [];
      if (data.branding?.primaryColor) extractedColors.push(data.branding.primaryColor);
      if (data.branding?.secondaryColor) extractedColors.push(data.branding.secondaryColor);
      if (data.branding?.accentColor) extractedColors.push(data.branding.accentColor);
      if (extractedColors.length > 0) {
        setColors(extractedColors);
        setPrimaryIdx(0);
        if (extractedColors.length > 1) setAccentIdx(1);
      }
      setScraped(true);

      // Check name mismatch
      if (data.name && workspaceName && data.name.toLowerCase() !== workspaceName.toLowerCase()) {
        setShowNameMismatch(true);
      }
    } catch {
      setError('Could not analyze that URL. You can enter your brand info manually below.');
      setScraped(true); // Show manual form
    } finally {
      setLoading(false);
    }
  }, [url, workspaceName]);

  function handleColorClick(idx: number) {
    if (primaryIdx === idx) {
      // Deselect primary
      setPrimaryIdx(null);
    } else if (accentIdx === idx) {
      // Deselect accent
      setAccentIdx(null);
    } else if (primaryIdx === null) {
      setPrimaryIdx(idx);
    } else if (accentIdx === null) {
      setAccentIdx(idx);
    } else {
      // Replace accent
      setAccentIdx(idx);
    }
  }

  function handleSubmit() {
    const branding: WorkspaceBranding = {};
    if (primaryIdx !== null && colors[primaryIdx]) branding.primaryColor = colors[primaryIdx];
    if (accentIdx !== null && colors[accentIdx]) branding.accentColor = colors[accentIdx];

    onNext({
      companyName: companyName.trim() || undefined,
      companyDescription: description.trim() || undefined,
      industry: industry.trim() || undefined,
      branding: Object.keys(branding).length > 0 ? branding : undefined,
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
          <Globe className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your brand</h2>
          <p className="text-gray-500 text-sm">We&apos;ll match your articles to your brand</p>
        </div>
      </div>

      {/* URL input */}
      {!scraped && (
        <div className="mb-6">
          <label htmlFor="brand-url" className="block text-sm font-medium text-gray-700 mb-1.5">
            Company website
          </label>
          <div className="flex gap-2">
            <input
              id="brand-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); analyze(); } }}
            />
            <button
              type="button"
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </span>
              ) : 'Analyze'}
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-amber-700">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Editable brand preview */}
      {scraped && (
        <div className="space-y-4 mb-6">
          {showNameMismatch && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-800">
                We found your company is called <strong>{companyName}</strong> &mdash; update workspace name?
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowNameMismatch(false)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Yes, update
                </button>
                <button
                  type="button"
                  onClick={() => { setCompanyName(workspaceName ?? ''); setShowNameMismatch(false); }}
                  className="px-3 py-1 text-xs border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100"
                >
                  No, keep current
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Color palette */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand colors <span className="text-gray-400 font-normal">(click to assign as primary/accent)</span>
            </label>
            <div className="flex gap-3 flex-wrap">
              {colors.map((color, idx) => (
                <ColorSwatch
                  key={`${color}-${idx}`}
                  color={color}
                  label={primaryIdx === idx ? 'Primary' : accentIdx === idx ? 'Accent' : undefined}
                  selected={primaryIdx === idx || accentIdx === idx}
                  onClick={() => handleColorClick(idx)}
                />
              ))}
              {/* Manual color picker */}
              <div className="flex flex-col items-center gap-1">
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-gray-400 overflow-hidden relative">
                  <input
                    type="color"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const newColor = e.target.value;
                      if (!colors.includes(newColor)) {
                        setColors((prev) => [...prev, newColor]);
                      }
                    }}
                  />
                  <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs">+</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
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
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip this step
          </button>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
