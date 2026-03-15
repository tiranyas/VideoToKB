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
  createdAt: string;
  updatedAt: string;
}

// Pricing & Subscriptions
export type PlanId = 'free' | 'pro' | 'business';
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
