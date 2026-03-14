import type { ProgressEvent, VideoInfo } from '@/types';
import { resolveLoomUrl } from '@/lib/loom-resolver';
import { resolveGoogleDriveUrl } from '@/lib/gdrive-resolver';
import { isYouTubeUrl, getYouTubeTranscript, YouTubeExtractionError } from '@/lib/youtube-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateDraft, generateStructured, generateHTML } from '@/lib/article-generator';

function detectProvider(url: string): 'loom' | 'gdrive' | 'youtube' {
  if (url.includes('drive.google.com')) return 'gdrive';
  if (isYouTubeUrl(url)) return 'youtube';
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

// ── Phase A: Generate structured article ─────────────────

export interface PhaseAInput {
  videoUrl?: string;
  transcript?: string;
  draftPrompt: string;
  structurePrompt: string;
  companyContext?: string;
}

export async function runPhaseA(
  input: PhaseAInput,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  const { videoUrl, transcript, draftPrompt, structurePrompt, companyContext } = input;

  let cleanedTranscript = transcript ?? '';

  // Direct transcript mode — skip resolve and transcribe
  if (transcript) {
    onProgress({ step: 'resolve', status: 'complete', message: 'Skipped — using pasted transcript' });
    onProgress({ step: 'transcribe', status: 'complete', message: 'Skipped — using pasted transcript' });
  } else if (videoUrl) {
    const provider = detectProvider(videoUrl);

    if (provider === 'youtube') {
      // YouTube: Extract captions directly (no AssemblyAI needed)
      try {
        onProgress({ step: 'resolve', status: 'in_progress', message: 'Extracting YouTube captions...' });

        const ytResult = await getYouTubeTranscript(videoUrl);
        // Format segments like AssemblyAI paragraphs for consistency
        cleanedTranscript = preprocessTranscript(ytResult.segments);

        onProgress({ step: 'resolve', status: 'complete', message: 'YouTube captions extracted' });
        onProgress({ step: 'transcribe', status: 'complete', message: 'Skipped — using YouTube captions' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isBlocked = error instanceof YouTubeExtractionError && error.isServerBlocked;
        onProgress({
          step: 'error',
          status: 'error',
          message: isBlocked
            ? 'youtube_blocked'
            : `YouTube caption extraction failed: ${message}`,
        });
        return;
      }
    } else {
      // Loom / Google Drive: Resolve URL → Transcribe with AssemblyAI
      try {
        const providerLabel = provider === 'gdrive' ? 'Google Drive' : 'Loom';
        onProgress({ step: 'resolve', status: 'in_progress', message: `Resolving ${providerLabel} video URL...` });

        const videoInfo = await resolveVideoUrl(videoUrl, provider);
        onProgress({ step: 'resolve', status: 'complete', message: 'Video URL resolved' });

        // Step 2: Transcribe video
        onProgress({ step: 'transcribe', status: 'in_progress', message: 'Transcribing video audio...' });

        const transcriptResult = await transcribeVideo(videoInfo.videoUrl);
        cleanedTranscript = preprocessTranscript(transcriptResult.paragraphs);

        onProgress({ step: 'transcribe', status: 'complete', message: 'Transcription complete' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const step = message.includes('Transcri') ? 'transcribe' : 'resolve';
        onProgress({ step: 'error', status: 'error', message: `${step === 'resolve' ? 'Failed to resolve video URL' : 'Transcription failed'}: ${message}` });
        return;
      }
    }
  } else {
    onProgress({ step: 'error', status: 'error', message: 'No video URL or transcript provided' });
    return;
  }

  // Step 3: Agent 2 — Generate draft
  try {
    onProgress({ step: 'draft', status: 'in_progress', message: 'Creating draft article...' });

    // Inject company context into draft prompt
    let fullDraftPrompt = draftPrompt;
    if (companyContext) {
      fullDraftPrompt += `\n\n## Company Context\n${companyContext}`;
    }
    fullDraftPrompt += `\n\n## Language Handling\n- Write the output in the SAME language as the transcript.\n- Never refuse to process a transcript because of its language.`;

    const draft = await generateDraft(cleanedTranscript, fullDraftPrompt);
    onProgress({ step: 'draft', status: 'complete', message: 'Draft created' });

    // Step 4: Agent 3 — Structure article
    onProgress({ step: 'structure', status: 'in_progress', message: 'Structuring article...' });

    let fullStructurePrompt = structurePrompt;
    if (companyContext) {
      fullStructurePrompt += `\n\n## Company Context\n${companyContext}`;
    }
    fullStructurePrompt += `\n\n## Language Handling\n- Maintain the SAME language as the input draft.`;

    const structuredArticle = await generateStructured(draft, fullStructurePrompt);
    onProgress({ step: 'structure', status: 'complete', message: 'Article structured' });

    // Phase A complete — return the structured article for human review
    onProgress({ step: 'review', status: 'complete', article: structuredArticle });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress({ step: 'error', status: 'error', message: `Article generation failed: ${message}` });
  }
}

// ── Phase B: Generate platform HTML ──────────────────────

export interface PhaseBInput {
  article: string;
  htmlPrompt: string;
  htmlTemplate: string;
}

export async function runPhaseB(
  input: PhaseBInput,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  const { article, htmlPrompt, htmlTemplate } = input;

  try {
    onProgress({ step: 'html', status: 'in_progress', message: 'Generating platform HTML...' });

    // Build the full prompt with template reference
    let fullPrompt = htmlPrompt;
    if (htmlTemplate) {
      fullPrompt += `\n\n## Reference HTML Template\nStudy this template carefully and produce HTML that follows this exact structure:\n\n\`\`\`html\n${htmlTemplate}\n\`\`\`\n\n## Rules\n- Output ONLY the HTML code — no explanations\n- Match exact CSS, classes, and component structure\n- Keep content in the same language as the input article`;
    }

    const html = await generateHTML(article, fullPrompt);

    onProgress({ step: 'html', status: 'complete', message: 'HTML generated' });
    onProgress({ step: 'done', status: 'complete', html });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onProgress({ step: 'error', status: 'error', message: `HTML generation failed: ${message}` });
  }
}

// ── Legacy pipeline (kept for backward compatibility) ────

export interface PipelineInput {
  videoUrl?: string;
  transcript?: string;
  template: string;
}

export async function runPipeline(
  input: PipelineInput,
  onProgress: (event: ProgressEvent) => void
): Promise<void> {
  // Legacy: redirect to Phase A with default prompts
  const { buildDraftPrompt, buildStructurePrompt, DEFAULT_ARTICLE_TYPES } = await import('@/lib/templates/agent2-draft');
  const defaultType = DEFAULT_ARTICLE_TYPES[0];

  await runPhaseA(
    {
      videoUrl: input.videoUrl,
      transcript: input.transcript,
      draftPrompt: buildDraftPrompt(defaultType.draftPrompt),
      structurePrompt: buildStructurePrompt(defaultType.structurePrompt),
    },
    onProgress
  );
}
