import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250514';

export async function generateArticle(
  cleanedTranscript: string,
  templatePrompt: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: templatePrompt,
    messages: [
      {
        role: 'user',
        content: `Generate a KB article from the following video transcript:\n\n${cleanedTranscript}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Article generation returned no text content');
  }

  return textBlock.text;
}
