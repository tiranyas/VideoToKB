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
