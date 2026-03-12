import type { ProgressEvent } from '@/types';
import { resolveLoomUrl } from '@/lib/loom-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateArticle } from '@/lib/article-generator';
import { HOW_TO_TEMPLATE } from '@/lib/templates/how-to';

export async function runPipeline(
  videoUrl: string,
  template: string,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  // Step 1: Resolve Loom URL
  try {
    onProgress({ step: 'resolve', status: 'in_progress', message: 'Resolving Loom video URL...' });

    const videoInfo = await resolveLoomUrl(videoUrl);

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
      message: `Failed to resolve Loom video: ${message}`,
    });
  }
}
