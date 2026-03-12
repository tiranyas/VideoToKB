import { AssemblyAI } from 'assemblyai';
import type { TranscriptResult } from '@/types';

const FILLER_WORDS =
  /\b(um|uh|like|you know|I mean|basically|actually|literally|right)\b/gi;

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function preprocessTranscript(
  paragraphs: { text: string; start: number; end: number }[]
): string {
  return paragraphs
    .map((p) => {
      const cleaned = p.text
        .replace(FILLER_WORDS, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const timestamp = formatTimestamp(p.start);
      return `[${timestamp}] ${cleaned}`;
    })
    .filter((line) => {
      // Remove the timestamp prefix before checking length
      const contentAfterTimestamp = line.replace(/^\[\d+:\d{2}\]\s*/, '');
      return contentAfterTimestamp.length >= 10;
    })
    .join('\n\n');
}

export async function transcribeVideo(
  audioUrl: string
): Promise<TranscriptResult> {
  const client = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY!,
  });

  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    auto_chapters: true,
  });

  if (transcript.status === 'error') {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  const paragraphsResponse = await client.transcripts.paragraphs(
    transcript.id
  );

  return {
    text: transcript.text ?? '',
    paragraphs: paragraphsResponse.paragraphs.map((p) => ({
      text: p.text,
      start: p.start,
      end: p.end,
    })),
    wordCount: transcript.words?.length ?? 0,
  };
}
