import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateArticle } from '@/lib/article-generator';

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        messages: {
          create: mockCreate,
        },
      };
    }),
  };
});

beforeEach(() => {
  mockCreate.mockReset();
});

describe('generateArticle', () => {
  const sampleTranscript = 'Navigate to the settings page and click on the security tab.';
  const sampleTemplate = 'You are a technical writer creating a How-to Guide.';

  it('calls Anthropic with claude-sonnet-4-5 model', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# How to Configure Security Settings' }],
    });

    await generateArticle(sampleTranscript, sampleTemplate);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining('claude-sonnet-4-5'),
      })
    );
  });

  it('passes template as system prompt', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Article' }],
    });

    await generateArticle(sampleTranscript, sampleTemplate);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: sampleTemplate,
      })
    );
  });

  it('includes transcript in user message', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# Article' }],
    });

    await generateArticle(sampleTranscript, sampleTemplate);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === 'user');
    expect(userMessage.content).toContain(sampleTranscript);
  });

  it('returns text content from response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '# How to Configure Security Settings\n\nFollow these steps...' }],
    });

    const result = await generateArticle(sampleTranscript, sampleTemplate);
    expect(result).toBe('# How to Configure Security Settings\n\nFollow these steps...');
  });

  it('throws when no text block in response', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
    });

    await expect(generateArticle(sampleTranscript, sampleTemplate)).rejects.toThrow(
      /no text content/i
    );
  });
});
