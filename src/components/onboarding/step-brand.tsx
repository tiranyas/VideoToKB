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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  branding?: Record<string, any>;
}

export function StepBrand({ onNext, onBack, onSkip, saving, defaultBrand, workspaceName }: StepBrandProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
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
    setLoadingStep(0);
    setError(null);

    // Animated loading steps
    const steps = [
      'Capturing website screenshot...',
      'Analyzing visual brand identity...',
      'Extracting company information...',
      'Identifying brand colors...',
    ];
    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setLoadingStep(stepIdx);
    }, 4000);

    try {
      // Auto-prepend https:// if user didn't type a protocol
      let cleanUrl = url.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = `https://${cleanUrl}`;
      }

      const res = await fetch('/api/scrape-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });
      if (!res.ok) throw new Error('Failed to analyze website');
      const data: ScrapeResult = await res.json();

      if (data.name) setCompanyName(data.name);
      if (data.description) setDescription(data.description);
      if (data.industry) setIndustry(data.industry);

      // Extract colors from branding — handle any format Claude returns
      const extractedColors: string[] = [];
      const b = data.branding;
      if (b && typeof b === 'object') {
        // Log for debugging
        console.log('[KBPipe] Branding response:', JSON.stringify(b));

        // Check named color properties (camelCase and snake_case)
        const colorKeys = [
          'primaryColor', 'primary_color', 'primary',
          'secondaryColor', 'secondary_color', 'secondary',
          'accentColor', 'accent_color', 'accent',
        ];
        for (const key of colorKeys) {
          const val = b[key];
          if (typeof val === 'string' && val.length >= 4 && val.startsWith('#')) {
            if (!extractedColors.includes(val)) extractedColors.push(val);
          }
        }

        // Also check if colors came as array
        if (Array.isArray(b.colors)) {
          for (const c of b.colors) {
            if (typeof c === 'string' && c.startsWith('#') && !extractedColors.includes(c)) {
              extractedColors.push(c);
            }
          }
        }

        // Last resort: scan all string values for hex colors
        if (extractedColors.length === 0) {
          for (const val of Object.values(b)) {
            if (typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val)) {
              if (!extractedColors.includes(val)) extractedColors.push(val);
            }
          }
        }
      }

      if (extractedColors.length > 0) {
        setColors(extractedColors);
        setPrimaryIdx(0);
        if (extractedColors.length > 1) setAccentIdx(1);
      } else {
        console.log('[KBPipe] No colors extracted from branding:', data.branding);
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
      clearInterval(stepInterval);
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
      {!scraped && !loading && (
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
              disabled={!url.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              Analyze
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

      {/* Animated loading state */}
      {loading && (
        <div className="mb-6 py-8 flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
            <Globe className="absolute inset-0 m-auto w-6 h-6 text-violet-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">
              {['Capturing website screenshot...', 'Analyzing visual brand identity...', 'Extracting company information...', 'Identifying brand colors...'][loadingStep]}
            </p>
            <p className="text-xs text-gray-400 mt-1">This takes 10-20 seconds</p>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                  i <= loadingStep ? 'bg-violet-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Brand colors
            </label>
            <p className="text-xs text-gray-400 mb-3">Click a color to cycle: <span className="text-violet-500 font-medium">Primary</span> → <span className="text-emerald-500 font-medium">Accent</span> → unset</p>

            {colors.length > 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex gap-5 flex-wrap items-start">
                  {colors.map((color, idx) => (
                    <ColorSwatch
                      key={`${color}-${idx}`}
                      color={color}
                      label={primaryIdx === idx ? 'Primary' : accentIdx === idx ? 'Accent' : undefined}
                      selected={primaryIdx === idx || accentIdx === idx}
                      onClick={() => handleColorClick(idx)}
                      onDelete={() => {
                        const next = colors.filter((_, i) => i !== idx);
                        setColors(next);
                        // Fix indices after deletion
                        if (primaryIdx === idx) setPrimaryIdx(null);
                        else if (primaryIdx !== null && primaryIdx > idx) setPrimaryIdx(primaryIdx - 1);
                        if (accentIdx === idx) setAccentIdx(null);
                        else if (accentIdx !== null && accentIdx > idx) setAccentIdx(accentIdx - 1);
                      }}
                    />
                  ))}
                  {/* Add color button */}
                  <div className="flex flex-col items-center gap-1.5">
                    <label className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 cursor-pointer hover:border-violet-400 hover:bg-violet-50 overflow-hidden relative transition-colors">
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
                      <span className="flex items-center justify-center w-full h-full text-gray-400 text-lg">+</span>
                    </label>
                    <span className="text-[10px] text-gray-400">Add</span>
                  </div>
                </div>

                {/* Preview bar */}
                {(primaryIdx !== null || accentIdx !== null) && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Preview</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-8 rounded-md flex-1 transition-colors"
                        style={{ backgroundColor: primaryIdx !== null ? colors[primaryIdx] : '#e5e7eb' }}
                      />
                      <div
                        className="h-8 rounded-md w-20 transition-colors"
                        style={{ backgroundColor: accentIdx !== null ? colors[accentIdx] : '#e5e7eb' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-sm text-gray-400 mb-2">No colors detected</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-violet-300 text-sm text-gray-600 hover:text-violet-600 transition-colors">
                  <input
                    type="color"
                    className="w-0 h-0 opacity-0 absolute"
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setColors([newColor]);
                      setPrimaryIdx(0);
                    }}
                  />
                  + Add a color manually
                </label>
              </div>
            )}
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
