export type PipelineStep = 'resolve' | 'transcribe' | 'generate' | 'done';
export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error';

export interface ProgressEvent {
  step: PipelineStep | 'error';
  status: StepStatus;
  message?: string;
  article?: string;
}

export interface VideoInfo {
  videoUrl: string;
  title: string;
}

/** @deprecated Use VideoInfo instead */
export type LoomVideoInfo = VideoInfo;

export interface TranscriptResult {
  text: string;
  paragraphs: { text: string; start: number; end: number }[];
  wordCount: number;
}

export interface PipelineResult {
  article: string;
  title: string;
}
