import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProgressEvent } from '@/types';
import { runPipeline } from '@/lib/pipeline';

// Mock service modules
vi.mock('@/lib/loom-resolver', () => ({
  resolveLoomUrl: vi.fn(),
}));

vi.mock('@/lib/transcription', () => ({
  transcribeVideo: vi.fn(),
  preprocessTranscript: vi.fn(),
}));

vi.mock('@/lib/article-generator', () => ({
  generateArticle: vi.fn(),
}));

import { resolveLoomUrl } from '@/lib/loom-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateArticle } from '@/lib/article-generator';

const mockResolveLoomUrl = vi.mocked(resolveLoomUrl);
const mockTranscribeVideo = vi.mocked(transcribeVideo);
const mockPreprocessTranscript = vi.mocked(preprocessTranscript);
const mockGenerateArticle = vi.mocked(generateArticle);

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

  mockGenerateArticle.mockResolvedValue('# Generated Article\n\nContent here.');
}

describe('runPipeline', () => {
  it('emits progress events in order: resolve -> transcribe -> generate -> done', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      'how-to',
      (event) => events.push(event)
    );

    const steps = events.map((e) => e.step);
    expect(steps).toContain('resolve');
    expect(steps).toContain('transcribe');
    expect(steps).toContain('generate');
    expect(steps).toContain('done');

    const resolveIdx = steps.indexOf('resolve');
    const transcribeIdx = steps.indexOf('transcribe');
    const generateIdx = steps.indexOf('generate');
    const doneIdx = steps.indexOf('done');
    expect(resolveIdx).toBeLessThan(transcribeIdx);
    expect(transcribeIdx).toBeLessThan(generateIdx);
    expect(generateIdx).toBeLessThan(doneIdx);
  });

  it('emits in_progress then complete status for each step', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      'how-to',
      (event) => events.push(event)
    );

    for (const step of ['resolve', 'transcribe', 'generate'] as const) {
      const stepEvents = events.filter((e) => e.step === step);
      expect(stepEvents.length).toBeGreaterThanOrEqual(2);
      expect(stepEvents[0].status).toBe('in_progress');
      expect(stepEvents[stepEvents.length - 1].status).toBe('complete');
    }
  });

  it('emits error with "Loom" in message when resolve fails', async () => {
    mockResolveLoomUrl.mockRejectedValue(new Error('Invalid Loom URL'));
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/bad',
      'how-to',
      (event) => events.push(event)
    );

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/loom/i);
  });

  it('emits error with "transcription" in message when transcribe fails', async () => {
    mockResolveLoomUrl.mockResolvedValue({
      videoUrl: 'https://cdn.loom.com/sessions/raw/abc/video.mp4',
      title: 'Test Video',
    });
    mockTranscribeVideo.mockRejectedValue(new Error('Transcription failed'));
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      'how-to',
      (event) => events.push(event)
    );

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/transcription/i);
  });

  it('emits error with "generation" in message when generate fails', async () => {
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
    mockGenerateArticle.mockRejectedValue(new Error('Generation failed'));
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      'how-to',
      (event) => events.push(event)
    );

    const errorEvent = events.find((e) => e.step === 'error' || e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toMatch(/generation/i);
  });

  it('done event includes the generated article text', async () => {
    setupSuccessfulPipeline();
    const events: ProgressEvent[] = [];

    await runPipeline(
      'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
      'how-to',
      (event) => events.push(event)
    );

    const doneEvent = events.find((e) => e.step === 'done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent!.article).toBe('# Generated Article\n\nContent here.');
  });
});
