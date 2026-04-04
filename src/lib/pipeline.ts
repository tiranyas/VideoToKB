import type { SSEEvent, PipelineStep, VideoInfo } from '@/types';
import { resolveLoomUrl } from '@/lib/loom-resolver';
import { resolveGoogleDriveUrl } from '@/lib/gdrive-resolver';
import { isYouTubeUrl, getYouTubeTranscript, YouTubeExtractionError } from '@/lib/youtube-resolver';
import { transcribeVideo, preprocessTranscript } from '@/lib/transcription';
import { generateDraft, generateStructured, generateHTML } from '@/lib/article-generator';
import { buildHtmlPrompt } from '@/lib/templates/agent4-html';

/**
 * Creates a throttled token emitter that batches token chunks
 * and sends them via SSE at most every INTERVAL_MS milliseconds.
 */
function createTokenEmitter(
  step: PipelineStep,
  onProgress: (event: SSEEvent) => void,
  intervalMs = 100
) {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tokenCount = 0;
  let subStepSent = false;

  const SUB_STEP_MESSAGES: Record<string, [string, string]> = {
    draft: ['Analyzing transcript...', 'Writing article content...'],
    structure: ['Organizing sections...', 'Formatting headings and lists...'],
    html: ['Building HTML structure...', 'Applying platform styles...'],
  };

  function flush() {
    if (buffer) {
      onProgress({ type: 'token', step, text: buffer });
      buffer = '';
    }
    timer = null;
  }

  return {
    push(text: string) {
      buffer += text;
      tokenCount += text.split(/\s+/).length;

      // Emit sub-step message after ~50 tokens
      if (!subStepSent && tokenCount > 50 && SUB_STEP_MESSAGES[step]) {
        subStepSent = true;
        onProgress({ step, status: 'in_progress', message: SUB_STEP_MESSAGES[step][1] });
      }

      if (!timer) {
        timer = setTimeout(flush, intervalMs);
      }
    },
    flush() {
      if (timer) clearTimeout(timer);
      flush();
    },
  };
}

function detectProvider(url: string): 'loom' | 'gdrive' | 'youtube' | null {
  if (url.includes('drive.google.com')) return 'gdrive';
  if (isYouTubeUrl(url)) return 'youtube';
  if (url.includes('loom.com')) return 'loom';
  return null;
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
  onProgress: (event: SSEEvent) => void
): Promise<void> {
  const { videoUrl, transcript, draftPrompt, structurePrompt, companyContext } = input;

  let cleanedTranscript = transcript ?? '';

  // Direct transcript mode — skip resolve and transcribe
  if (transcript) {
    onProgress({ step: 'resolve', status: 'complete', message: 'Skipped — using pasted transcript' });
    onProgress({ step: 'transcribe', status: 'complete', message: 'Skipped — using pasted transcript' });
  } else if (videoUrl) {
    const provider = detectProvider(videoUrl);

    if (!provider) {
      onProgress({ step: 'error', status: 'error', message: 'Unsupported video URL. Please use a Loom, Google Drive, or YouTube link.' });
      return;
    }

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

  // Log transcript stats for transparency
  const wordCount = cleanedTranscript.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = Math.round(wordCount / 150); // ~150 wpm speaking rate
  onProgress({
    step: 'transcribe',
    status: 'complete',
    message: `Transcript ready — ${wordCount.toLocaleString()} words (~${estimatedMinutes} min of content)`,
  });

  // Step 3: Agent 2 — Generate draft
  try {
    onProgress({ step: 'draft', status: 'in_progress', message: 'Analyzing transcript...' });

    // Inject company context into draft prompt
    let fullDraftPrompt = draftPrompt;
    if (companyContext) {
      fullDraftPrompt += `\n\n## Company Context\n${companyContext}`;
    }
    fullDraftPrompt += `\n\n## CRITICAL — Language Rule (HIGHEST PRIORITY)\n- DETECT the language of the transcript below.\n- Write the ENTIRE output in that SAME language — every heading, sentence, and bullet point.\n- If the transcript is in English, write in English. If in Hebrew, write in Hebrew. If in Spanish, write in Spanish. Etc.\n- The Company Context may be in a DIFFERENT language — that's fine, still write the output in the transcript's language.\n- Never refuse to process a transcript because of its language.`;

    const draftEmitter = createTokenEmitter('draft', onProgress);
    const draft = await generateDraft(cleanedTranscript, fullDraftPrompt, (chunk) => draftEmitter.push(chunk));
    draftEmitter.flush();
    onProgress({ step: 'draft', status: 'complete', message: 'Draft created' });

    // Step 4: Agent 3 — Structure article
    onProgress({ step: 'structure', status: 'in_progress', message: 'Organizing sections...' });

    let fullStructurePrompt = structurePrompt;
    if (companyContext) {
      fullStructurePrompt += `\n\n## Company Context\n${companyContext}`;
    }
    fullStructurePrompt += `\n\n## CRITICAL — Language Rule (HIGHEST PRIORITY)\n- The output MUST be in the SAME language as the input draft.\n- Do NOT switch languages. If the draft is in English, output in English. If in Hebrew, output in Hebrew.\n- The Company Context may be in a different language — ignore that, match the draft's language.`;

    const structEmitter = createTokenEmitter('structure', onProgress);
    const structuredArticle = await generateStructured(draft, fullStructurePrompt, (chunk) => structEmitter.push(chunk));
    structEmitter.flush();
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
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    fontFamily?: string;
    customCss?: string;
  };
  /** When false, branding is NOT applied to the template (e.g. scraped custom templates). Default: true. */
  applyBranding?: boolean;
}

export async function runPhaseB(
  input: PhaseBInput,
  onProgress: (event: SSEEvent) => void
): Promise<void> {
  const { article, htmlPrompt, htmlTemplate, branding } = input;

  try {
    onProgress({ step: 'html', status: 'in_progress', message: 'Building HTML structure...' });

    // Determine effective branding: skip when applyBranding is explicitly false
    // (e.g. scraped custom templates should keep their own styling)
    const effectiveBranding = input.applyBranding === false ? undefined : branding;

    // Build the full prompt with template reference and placeholder replacement
    let fullPrompt = buildHtmlPrompt(htmlPrompt, htmlTemplate, effectiveBranding);

    // Inject workspace branding into prompt text (only when branding should be applied)
    if (input.applyBranding !== false && branding && (branding.primaryColor || branding.fontFamily)) {
      fullPrompt += `\n\n## Workspace Branding\nApply these brand styles to the generated HTML:`;
      if (branding.primaryColor) fullPrompt += `\n- Primary color: ${branding.primaryColor} (use for headings, primary buttons, key highlights)`;
      if (branding.secondaryColor) fullPrompt += `\n- Secondary color: ${branding.secondaryColor} (use for secondary elements, borders, subtle accents)`;
      if (branding.accentColor) fullPrompt += `\n- Accent color: ${branding.accentColor} (use for call-to-action, important callouts, badges)`;
      if (branding.fontFamily) fullPrompt += `\n- Font family: "${branding.fontFamily}", sans-serif (apply to body and all text elements)`;
      if (branding.logoUrl) fullPrompt += `\n- Company logo URL: ${branding.logoUrl} (include at the top of the article if appropriate)`;
      if (branding.customCss) fullPrompt += `\n- Additional custom CSS:\n${branding.customCss}`;
      fullPrompt += `\nReplace any hardcoded colors in the template with the brand colors above.`;
    }

    const htmlEmitter = createTokenEmitter('html', onProgress);
    const html = await generateHTML(article, fullPrompt, (chunk) => htmlEmitter.push(chunk));
    htmlEmitter.flush();

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
  onProgress: (event: SSEEvent) => void
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
