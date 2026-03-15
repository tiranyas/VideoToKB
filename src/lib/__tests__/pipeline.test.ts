import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProgressEvent } from '@/types';
import { runPhaseA } from '@/lib/pipeline';
import type { PhaseAInput } from '@/lib/pipeline';

// Mock service modules
vi.mock('@/lib/loom-resolver', () => ({
  resolveLoomUrl: vi.fn(),
}));

vi.mock('@/lib/gdrive-resolver', () => ({
  resolveGoogleDriveUrl: vi.fn(),
}));

vi.mock('@/lib/youtube-resolver', () => ({
  isYouTubeUrl: vi.fn().mockReturnValue(false),
  getYouTubeTranscript: vi.fn(),
  YouTubeExtractionError: class YouTubeExtractionError extends Error {
    isServerBlocked = false;
  },
}));

vi.mock('@/lib/transcription', () => ({
  transcribeVideo: vi.fn(),
  preprocessTranscript: vi.fn(),
}));

vi.mock('@/lib/article-generator', () => ({
  generateDraft: vi.fn(),
  generateStructured: vi.fn(),
  generateHTML: vi.fn(),
}));

import { resolveLoomUrl } from '@/lib/loom-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateDraft, generateStructured } from '@/lib/article-generator';

const mockResolveLoomUrl = vi.mocked(resolveLoomUrl);
const mockTranscribeVideo = vi.mocked(transcribeVideo);
const mockPreprocessTranscript = vi.mocked(preprocessTranscript);
const mockGenerateDraft = vi.mocked(generateDraft);
const mockGenerateStructured = vi.mocked(generateStructured);

beforeEach(() => {
  vi.clearAllMocks();
});

function setupSuccessfulPipeline() {
  mockResolveLoomUrl.mockResolvedValue({
    videoUrl: 'https://cdn.loom.com/sessions/raw/abc/video.mp4',
    title: 'Test Video',
  });

  mockTranscribeVideo.mockResolvedValue({
    text: 'Full transcript text',
    paragraphs: [{ text: 'Full transcript text', start: 0, end: 5000 }],
    wordCount: 3,
  });

  mockPreprocessTranscript.mockReturnValue('Cleaned transcript text');

  mockGenerateDraft.mockResolvedValue('# Draft Article\n\nDraft content.');
  mockGenerateStructured.mockResolvedValue('# Generated Article\n\nContent here.');
}

function makeInput(overrides?: Partial<PhaseAInput>): PhaseAInput {
  return {
    videoUrl: 'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    draftPrompt: 'Test draft prompt',
    structurePrompt: 'Test structure prompt',
    ...overrides,
  };
}

describe('runPhaseA', () => {
  it('emits progress events in order: resolve -> transcribe -> draft -> structure -> review', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    const steps = events.map((e) => e.step);
    expect(steps).toContain('resolve');
    expect(steps).toContain('transcribe');
    expect(steps).toContain('draft');
    expect(steps).toContain('structure');
    expect(steps).toContain('review');

    const resolveIdx = steps.indexOf('resolve');
    const transcribeIdx = steps.indexOf('transcribe');
    const draftIdx = steps.indexOf('draft');
    const structureIdx = steps.indexOf('structure');
    const reviewIdx = steps.indexOf('review');
    expect(resolveIdx).toBeLessThan(transcribeIdx);
    expect(transcribeIdx).toBeLessThan(draftIdx);
    expect(draftIdx).toBeLessThan(structureIdx);
    expect(structureIdx).toBeLessThan(reviewIdx);
  });

  it('emits in_progress then complete status for each step', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    for (const step of ['resolve', 'transcribe', 'draft', 'structure'] as const) {
      const stepEvents = events.filter((e) => e.step === step);
      expect(stepEvents.length).toBeGreaterThanOrEqual(2);
      expect(stepEvents[0].status).toBe('in_progress');
      expect(stepEvents[stepEvents.length - 1].status).toBe('complete');
    }
  });

  it('emits error with "Loom" in message when resolve fails', async () => {
    mockResolveLoomUrl.mockRejectedValue(new Error('Invalid Loom URL'));
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/resolve|loom|video url/i);
  });

  it('emits error with "transcription" in message when transcribe fails', async () => {
    mockResolveLoomUrl.mockResolvedValue({
      videoUrl: 'https://cdn.loom.com/sessions/raw/abc/video.mp4',
      title: 'Test Video',
    });
    mockTranscribeVideo.mockRejectedValue(new Error('Transcription failed'));
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/transcription/i);
  });

  it('emits error with "generation" in message when draft generation fails', async () => {
    mockResolveLoomUrl.mockResolvedValue({
      videoUrl: 'https://cdn.loom.com/sessions/raw/abc/video.mp4',
      title: 'Test Video',
    });
    mockTranscribeVideo.mockResolvedValue({
      text: 'Full transcript text',
      paragraphs: [{ text: 'Full transcript text', start: 0, end: 5000 }],
      wordCount: 3,
    });
    mockPreprocessTranscript.mockReturnValue('Cleaned transcript text');
    mockGenerateDraft.mockRejectedValue(new Error('Generation failed'));
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/generation/i);
  });

  it('review event includes the structured article text', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPhaseA(makeInput(), (event) => events.push(event));

    const reviewEvent = events.find((e) => e.step === 'review');
    expect(reviewEvent).toBeDefined();
    expect(reviewEvent!.article).toBe('# Generated Article\n\nContent here.');
  });
});
