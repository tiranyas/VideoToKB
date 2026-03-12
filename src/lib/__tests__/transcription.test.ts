import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preprocessTranscript, transcribeVideo } from '@/lib/transcription';

// Mock AssemblyAI SDK
vi.mock('assemblyai', () => {
  const mockTranscribe = vi.fn();
  const mockParagraphs = vi.fn();
  return {
    AssemblyAI: vi.fn().mockImplementation(() => ({
      transcripts: {
        transcribe: mockTranscribe,
        paragraphs: mockParagraphs,
      },
    })),
    __mockTranscribe: mockTranscribe,
    __mockParagraphs: mockParagraphs,
  };
});

describe('preprocessTranscript', () => {
  it('removes filler words (um, uh, like, you know, I mean, basically, actually, literally, right)', () => {
    const paragraphs = [
      {
        text: 'Um so basically you know what I mean is that you like click the button and uh it actually works literally right',
        start: 0,
        end: 5000,
      },
    ];

    const result = preprocessTranscript(paragraphs);
    expect(result).not.toMatch(/\bum\b/i);
    expect(result).not.toMatch(/\buh\b/i);
    expect(result).not.toMatch(/\bbasically\b/i);
    expect(result).not.toMatch(/\byou know\b/i);
    expect(result).not.toMatch(/\bI mean\b/i);
    expect(result).not.toMatch(/\bactually\b/i);
    expect(result).not.toMatch(/\bliterally\b/i);
    expect(result).toContain('click the button');
  });

  it('collapses multiple spaces after filler word removal', () => {
    const paragraphs = [
      {
        text: 'Click um the uh button',
        start: 0,
        end: 3000,
      },
    ];

    const result = preprocessTranscript(paragraphs);
    expect(result).not.toContain('  ');
  });

  it('formats timestamps as M:SS', () => {
    const paragraphs = [
      {
        text: 'First paragraph content here.',
        start: 65000, // 1:05
        end: 70000,
      },
    ];

    const result = preprocessTranscript(paragraphs);
    expect(result).toContain('[1:05]');
  });

  it('filters out near-empty paragraphs (< 10 chars after cleaning)', () => {
    const paragraphs = [
      { text: 'Um uh like', start: 0, end: 1000 },
      { text: 'This is a substantive paragraph with real content.', start: 2000, end: 5000 },
    ];

    const result = preprocessTranscript(paragraphs);
    const lines = result.split('\n\n').filter(Boolean);
    expect(lines.length).toBe(1);
    expect(result).toContain('substantive paragraph');
  });

  it('preserves substantive content', () => {
    const paragraphs = [
      {
        text: 'Navigate to the settings page and click on the security tab.',
        start: 0,
        end: 5000,
      },
      {
        text: 'Then enter your new password and click save.',
        start: 6000,
        end: 10000,
      },
    ];

    const result = preprocessTranscript(paragraphs);
    expect(result).toContain('Navigate to the settings page');
    expect(result).toContain('enter your new password');
  });
});

describe('transcribeVideo', () => {
  it('calls AssemblyAI with correct params', async () => {
    const { __mockTranscribe, __mockParagraphs } = await import('assemblyai') as any;

    __mockTranscribe.mockResolvedValueOnce({
      id: 'test-id',
      status: 'completed',
      text: 'Test transcript text',
      words: [{ text: 'Test' }, { text: 'transcript' }, { text: 'text' }],
    });

    __mockParagraphs.mockResolvedValueOnce({
      paragraphs: [{ text: 'Test transcript text', start: 0, end: 5000 }],
    });

    const result = await transcribeVideo('https://cdn.loom.com/sessions/raw/abc/video.mp4');

    expect(__mockTranscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: 'https://cdn.loom.com/sessions/raw/abc/video.mp4',
      })
    );
    expect(result.text).toBe('Test transcript text');
    expect(result.paragraphs).toBeDefined();
    expect(result.wordCount).toBe(3);
  });

  it('throws on transcription error status', async () => {
    const { __mockTranscribe } = await import('assemblyai') as any;

    __mockTranscribe.mockResolvedValueOnce({
      id: 'test-id',
      status: 'error',
      error: 'Audio file could not be processed',
    });

    await expect(
      transcribeVideo('https://cdn.loom.com/sessions/raw/abc/video.mp4')
    ).rejects.toThrow(/transcription failed/i);
  });
});
