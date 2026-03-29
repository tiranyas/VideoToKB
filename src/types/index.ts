// Pipeline steps & status
export type PipelineStep = 'resolve' | 'transcribe' | 'draft' | 'structure' | 'review' | 'html' | 'done';
export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface ProgressEvent {
  step: PipelineStep | 'error';
  status: StepStatus;
  message?: string;
  article?: string;
  html?: string;
}

// Streaming token event — sent during Claude response streaming
export interface TokenEvent {
  type: 'token';
  step: PipelineStep;
  text: string;
}

// Union of all SSE event types
export type SSEEvent = ProgressEvent | TokenEvent;

// Video resolution
export interface VideoInfo {
  videoUrl: string;
  title: string;
}

/** @deprecated Use VideoInfo instead */
export type LoomVideoInfo = VideoInfo;

// Transcription
export interface TranscriptResult {
  text: string;
  paragraphs: { text: string; start: number; end: number }[];
  wordCount: number;
}

export interface PipelineResult {
  article: string;
  title: string;
}

// Company Context — scraped from URL or manually entered
export interface CompanyContext {
  id: string;
  name: string;
  description: string;
  industry?: string;
  targetAudience?: string;
  createdAt: string;
}

// Article Type — defines prompts for agents 2 (draft) and 3 (structure)
export interface ArticleType {
  id: string;
  name: string;
  draftPrompt: string;
  structurePrompt: string;
  isDefault?: boolean;
}

// Platform Profile — defines prompt + HTML template for agent 4 (HTML generation)
export interface PlatformProfile {
  id: string;
  name: string;
  htmlPrompt: string;
  htmlTemplate: string;
  isDefault?: boolean;
  applyBranding?: boolean; // true = workspace brand colors override template colors; false = keep template colors as-is
}

// Onboarding state — tracks wizard step completion per workspace
export interface OnboardingState {
  completed: boolean;
  steps: {
    workspace: boolean;
    brand: boolean;
    platform: boolean;
    template: boolean;
  };
  skippedAt?: string; // ISO timestamp
}

// Workspace branding
export interface WorkspaceBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  fontFamily?: string;
  customCss?: string;
}

// Workspace — groups company context, preferences, and articles
export interface Workspace {
  id: string;
  userId: string;
  name: string;
  slug: string;
  companyName?: string;
  companyDescription?: string;
  industry?: string;
  targetAudience?: string;
  branding?: WorkspaceBranding;
  onboardingState?: OnboardingState;
  createdAt: string;
  updatedAt: string;
}

// Team access
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email?: string;    // joined from auth.users for display
  createdAt: string;
  updatedAt: string;
}

export type InviteStatus = 'pending' | 'accepted' | 'expired';

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
}

// Article type simple controls (stored alongside prompts)
export interface ArticleTypeControls {
  tone?: 'formal' | 'casual' | 'technical' | 'friendly';
  length?: 'concise' | 'standard' | 'detailed';
  structure?: 'step-by-step' | 'narrative' | 'faq-heavy' | 'reference';
  audience?: 'end-users' | 'developers' | 'managers' | 'mixed';
}

// Pricing & Subscriptions
export type PlanId = 'free' | 'starter' | 'team' | 'enterprise' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  articleLimit: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  bonusCredits: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserUsage {
  articlesThisPeriod: number;
  articleLimit: number;
  bonusCredits: number;
  articlesRemaining: number;
  planId: PlanId;
  planName: string;
  periodStart: string;
  periodEnd: string;
}

export interface WorkspaceUsage {
  articlesThisPeriod: number;
  articleLimit: number;
  bonusCredits: number;
  articlesRemaining: number;
  planId: PlanId;
  planName: string;
  periodStart: string;
  periodEnd: string;
}

// Saved article
export interface Article {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  sourceUrl?: string;
  sourceType: 'youtube' | 'loom' | 'google-drive' | 'paste';
  articleTypeId?: string;
  platformId?: string;
  markdown: string;
  html?: string;
  createdAt: string;
}
