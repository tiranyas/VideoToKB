import type { ProgressEvent, VideoInfo } from '@/types';
import { resolveLoomUrl } from '@/lib/loom-resolver';
import { resolveGoogleDriveUrl } from '@/lib/gdrive-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateArticle } from '@/lib/article-generator';
import { HOW_TO_TEMPLATE } from '@/lib/templates/how-to';

function detectProvider(url: string): 'loom' | 'gdrive' {
  if (url.includes('drive.google.com')) return 'gdrive';
  return 'loom';
}

async function resolveVideoUrl(url: string, provider: 'loom' | 'gdrive'): Promise<VideoInfo> {
  switch (provider) {
    case 'gdrive':
      return resolveGoogleDriveUrl(url);
    case 'loom':
    default:
      return resolveLoomUrl(url);
  }
}

export interface PipelineInput {
  videoUrl?: string;
  transcript?: string;
  template: string;
}

export async function runPipeline(
  input: PipelineInput,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  const { videoUrl, transcript, template } = input;

  // Direct transcript mode — skip resolve and transcribe
  if (transcript) {
    onProgress({ step: 'resolve', status: 'complete', message: 'Skipped — using pasted transcript' });
    onProgress({ step: 'transcribe', status: 'complete', message: 'Skipped — using pasted transcript' });

    try {
      onProgress({ step: 'generate', status: 'in_progress', message: 'Generating KB article...' });

      const article = await generateArticle(transcript, HOW_TO_TEMPLATE);

      onProgress({ step: 'generate', status: 'complete', message: 'Article generated' });
      onProgress({ step: 'done', status: 'complete', article });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress({
        step: 'error',
        status: 'error',
        message: `Article generation failed: ${message}`,
      });
    }
    return;
  }

  // Video URL mode — full pipeline
  if (!videoUrl) {
    onProgress({ step: 'error', status: 'error', message: 'No video URL or transcript provided' });
    return;
  }

  // Step 1: Resolve video URL
  try {
    const provider = detectProvider(videoUrl);
    const providerLabel = provider === 'gdrive' ? 'Google Drive' : 'Loom';
    onProgress({ step: 'resolve', status: 'in_progress', message: `Resolving ${providerLabel} video URL...` });

    const videoInfo = await resolveVideoUrl(videoUrl, provider);

    onProgress({ step: 'resolve', status: 'complete', message: 'Video URL resolved' });

    // Step 2: Transcribe video
    try {
      onProgress({ step: 'transcribe', status: 'in_progress', message: 'Transcribing video audio...' });

      const transcriptResult = await transcribeVideo(videoInfo.videoUrl);
      const cleanedTranscript = preprocessTranscript(transcriptResult.paragraphs);

      onProgress({ step: 'transcribe', status: 'complete', message: 'Transcription complete' });

      // Step 3: Generate article
      try {
        onProgress({ step: 'generate', status: 'in_progress', message: 'Generating KB article...' });

        // Phase 1: always use HOW_TO_TEMPLATE regardless of template param
        const article = await generateArticle(cleanedTranscript, HOW_TO_TEMPLATE);

        onProgress({ step: 'generate', status: 'complete', message: 'Article generated' });

        // Done
        onProgress({ step: 'done', status: 'complete', article });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        onProgress({
          step: 'error',
          status: 'error',
          message: `Article generation failed: ${message}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProgress({
        step: 'error',
        status: 'error',
        message: `Transcription failed: ${message}`,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress({
      step: 'error',
      status: 'error',
      message: `Failed to resolve video URL: ${message}`,
    });
  }
}
