'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/workspace-context';
import { createClient } from '@/lib/supabase/client';
import { updateWorkspace, upsertWorkspacePreferences } from '@/lib/supabase/queries';
import { Check } from 'lucide-react';
import type { OnboardingState, WorkspaceBranding } from '@/types';
import { StepWorkspace } from './step-workspace';
import { StepBrand } from './step-brand';
import { StepPlatform } from './step-platform';
import { StepTemplate } from './step-template';

const STEP_LABELS = ['Workspace', 'Brand', 'Platform', 'Template'];
const STEP_KEYS: Array<keyof OnboardingState['steps']> = ['workspace', 'brand', 'platform', 'template'];

interface StepData {
  workspace?: { name: string; slug: string };
  brand?: {
    companyName?: string;
    companyDescription?: string;
    industry?: string;
    targetAudience?: string;
    branding?: WorkspaceBranding;
  };
  platform?: { platformId: string };
  template?: { htmlPrompt: string; htmlTemplate: string; detectedPlatform?: string };
}

function setOnboardedCookie() {
  document.cookie = 'kbpipe-onboarded=true; path=/; max-age=31536000';
}

export function WizardShell() {
  const router = useRouter();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({});
  const [saving, setSaving] = useState(false);

  // Resume from first incomplete step
  useEffect(() => {
    if (!activeWorkspace?.onboardingState) return;
    const { steps } = activeWorkspace.onboardingState;
    const firstIncomplete = STEP_KEYS.findIndex((key) => !steps[key]);
    if (firstIncomplete > 0) {
      setCurrentStep(firstIncomplete);
    }
  }, [activeWorkspace?.onboardingState]);

  // Pre-fill step data from workspace
  useEffect(() => {
    if (!activeWorkspace) return;
    const prefilled: StepData = {};
    if (activeWorkspace.name && activeWorkspace.name !== 'Default') {
      prefilled.workspace = { name: activeWorkspace.name, slug: activeWorkspace.slug };
    }
    if (activeWorkspace.companyName || activeWorkspace.branding) {
      prefilled.brand = {
        companyName: activeWorkspace.companyName,
        companyDescription: activeWorkspace.companyDescription,
        industry: activeWorkspace.industry,
        targetAudience: activeWorkspace.targetAudience,
        branding: activeWorkspace.branding,
      };
    }
    setStepData(prefilled);
  }, [activeWorkspace]);

  const persistOnboardingState = useCallback(
    async (stepKey: keyof OnboardingState['steps'], completed: boolean) => {
      if (!activeWorkspace) return;
      const current = activeWorkspace.onboardingState ?? {
        completed: false,
        steps: { workspace: false, brand: false, platform: false, template: false },
      };
      const updated: OnboardingState = {
        ...current,
        steps: { ...current.steps, [stepKey]: completed },
      };
      try {
        await updateWorkspace(supabase, activeWorkspace.id, { onboardingState: updated });
      } catch (err) {
        console.error('Failed to persist onboarding state:', err);
      }
    },
    [activeWorkspace, supabase]
  );

  const finishOnboarding = useCallback(async () => {
    if (!activeWorkspace) return;
    const finalState: OnboardingState = {
      completed: true,
      steps: { workspace: true, brand: true, platform: true, template: true },
    };
    try {
      await updateWorkspace(supabase, activeWorkspace.id, { onboardingState: finalState });
    } catch (err) {
      console.error('Failed to finalize onboarding:', err);
    }
    setOnboardedCookie();
    await refreshWorkspaces();
    router.push('/');
  }, [activeWorkspace, supabase, refreshWorkspaces, router]);

  const handleNext = useCallback(
    async (data: Record<string, unknown>) => {
      if (!activeWorkspace || saving) return;
      setSaving(true);

      try {
        const stepKey = STEP_KEYS[currentStep];

        // Persist step-specific data to workspace
        if (currentStep === 0 && data.name) {
          const wsData = data as { name: string; slug: string };
          setStepData((prev) => ({ ...prev, workspace: wsData }));
          await updateWorkspace(supabase, activeWorkspace.id, {
            name: wsData.name,
            slug: wsData.slug,
          });
        } else if (currentStep === 1) {
          const brandData = data as StepData['brand'];
          setStepData((prev) => ({ ...prev, brand: brandData }));
          await updateWorkspace(supabase, activeWorkspace.id, {
            companyName: brandData?.companyName,
            companyDescription: brandData?.companyDescription,
            industry: brandData?.industry,
            targetAudience: brandData?.targetAudience,
            branding: brandData?.branding,
          });
        } else if (currentStep === 2 && data.platformId) {
          const platData = data as { platformId: string };
          setStepData((prev) => ({ ...prev, platform: platData }));
          await upsertWorkspacePreferences(supabase, activeWorkspace.id, {
            selectedPlatformId: platData.platformId,
          });
        } else if (currentStep === 3) {
          const tplData = data as StepData['template'];
          setStepData((prev) => ({ ...prev, template: tplData }));
          // Template saving handled inside step-template component (adds platform profile)
        }

        await persistOnboardingState(stepKey, true);
        await refreshWorkspaces();

        if (currentStep === 3) {
          await finishOnboarding();
        } else {
          setCurrentStep((s) => s + 1);
        }
      } catch (err) {
        console.error('Error saving step:', err);
      } finally {
        setSaving(false);
      }
    },
    [activeWorkspace, currentStep, saving, supabase, persistOnboardingState, refreshWorkspaces, finishOnboarding]
  );

  const handleBack = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleSkip = useCallback(async () => {
    if (!activeWorkspace || saving) return;
    setSaving(true);
    try {
      await persistOnboardingState(STEP_KEYS[currentStep], false);
      if (currentStep === 3) {
        await finishOnboarding();
      } else {
        setCurrentStep((s) => s + 1);
      }
    } finally {
      setSaving(false);
    }
  }, [activeWorkspace, currentStep, saving, persistOnboardingState, finishOnboarding]);

  const handleSkipSetup = useCallback(async () => {
    if (!activeWorkspace) return;
    const skippedState: OnboardingState = {
      completed: false,
      steps: { workspace: false, brand: false, platform: false, template: false },
      skippedAt: new Date().toISOString(),
    };
    try {
      await updateWorkspace(supabase, activeWorkspace.id, { onboardingState: skippedState });
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
    }
    setOnboardedCookie();
    router.push('/');
  }, [activeWorkspace, supabase, router]);

  const stepProps = {
    onNext: handleNext,
    onBack: handleBack,
    onSkip: handleSkip,
    saving,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-white">
      <div className="max-w-2xl mx-auto py-12 px-4 relative">
        {/* Skip setup */}
        <button
          onClick={handleSkipSetup}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip setup
        </button>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {STEP_LABELS.map((label, i) => {
            const isComplete = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isComplete
                      ? 'bg-violet-600 text-white'
                      : isCurrent
                        ? 'bg-violet-600 text-white ring-4 ring-violet-100'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs ${
                    isCurrent ? 'text-violet-600 font-medium' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          {currentStep === 0 && (
            <StepWorkspace
              {...stepProps}
              defaultName={stepData.workspace?.name}
            />
          )}
          {currentStep === 1 && (
            <StepBrand
              {...stepProps}
              defaultBrand={stepData.brand}
              workspaceName={stepData.workspace?.name ?? activeWorkspace?.name}
            />
          )}
          {currentStep === 2 && (
            <StepPlatform
              {...stepProps}
              defaultPlatformId={stepData.platform?.platformId}
            />
          )}
          {currentStep === 3 && (
            <StepTemplate
              {...stepProps}
              workspaceId={activeWorkspace?.id}
              selectedPlatformId={stepData.platform?.platformId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
