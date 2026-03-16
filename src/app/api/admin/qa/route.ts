import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_PLATFORM_PROFILES } from '@/lib/templates/agent4-html';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const ADMIN_EMAILS = ['tiran@kbpipe.com', 'tiranyas@gmail.com'];

// Sample test transcript for QA
const TEST_TRANSCRIPT = `Today we're going to show you how to set up two-factor authentication on your account.
First, go to Settings, then Security. Click "Enable 2FA".
You'll need to download an authenticator app like Google Authenticator or Authy.
Scan the QR code shown on screen. Enter the 6-digit code from the app.
That's it! Your account is now protected with two-factor authentication.
If you lose access to your authenticator app, you can use the backup codes we provide.
Make sure to store those backup codes somewhere safe.`;

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  durationMs: number;
  details?: string;
}

// Test 1: Claude API connectivity
async function testClaudeAPI(): Promise<TestResult> {
  const start = Date.now();
  try {
    const anthropic = new Anthropic();
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Reply with exactly: "OK"' }],
    });
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const durationMs = Date.now() - start;

    if (text.includes('OK')) {
      return { name: 'Claude API', status: 'pass', message: `Connected (${durationMs}ms)`, durationMs };
    }
    return { name: 'Claude API', status: 'warn', message: `Unexpected response: ${text.slice(0, 100)}`, durationMs };
  } catch (err) {
    return {
      name: 'Claude API',
      status: 'fail',
      message: err instanceof Error ? err.message : 'Connection failed',
      durationMs: Date.now() - start,
    };
  }
}

// Test 2: Supabase connectivity
async function testSupabase(): Promise<TestResult> {
  const start = Date.now();
  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { count, error } = await admin
      .from('articles')
      .select('*', { count: 'exact', head: true });

    if (error) throw new Error(error.message);
    return {
      name: 'Supabase DB',
      status: 'pass',
      message: `Connected (${count ?? 0} articles in DB)`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: 'Supabase DB',
      status: 'fail',
      message: err instanceof Error ? err.message : 'Connection failed',
      durationMs: Date.now() - start,
    };
  }
}

// Test 3: Platform profile HTML generation
async function testPlatformGeneration(platformId: string, platformName: string): Promise<TestResult> {
  const start = Date.now();
  const profile = DEFAULT_PLATFORM_PROFILES.find((p) => p.id === platformId);

  if (!profile) {
    return { name: `HTML: ${platformName}`, status: 'fail', message: 'Profile not found', durationMs: 0 };
  }

  if (platformId === 'markdown-only') {
    return { name: `HTML: ${platformName}`, status: 'pass', message: 'Markdown-only (no HTML generation)', durationMs: 0 };
  }

  try {
    const anthropic = new Anthropic();

    // Build a minimal test prompt
    const testArticle = `# How to Set Up Two-Factor Authentication

## Summary
This guide walks you through enabling 2FA on your account for better security.

## Steps
1. Go to Settings > Security
2. Click "Enable 2FA"
3. Scan the QR code with your authenticator app
4. Enter the 6-digit verification code

> **Tip:** Store your backup codes somewhere safe!

## FAQ
**Q: What if I lose my phone?**
A: Use the backup codes provided during setup.`;

    let fullPrompt = profile.htmlPrompt;
    if (profile.htmlTemplate) {
      fullPrompt += `\n\n## Reference Template\n\`\`\`html\n${profile.htmlTemplate}\n\`\`\``;
    }
    fullPrompt += '\n\nOutput ONLY the HTML code.';

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: fullPrompt,
      messages: [{ role: 'user', content: `Convert this article to HTML:\n\n${testArticle}` }],
    });

    const html = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const durationMs = Date.now() - start;

    // Validate HTML output
    const checks: string[] = [];
    let status: 'pass' | 'warn' | 'fail' = 'pass';

    if (!html || html.length < 100) {
      return { name: `HTML: ${platformName}`, status: 'fail', message: 'Empty or too short output', durationMs };
    }

    // Check for placeholder text left in
    if (html.includes('[') && html.includes(']') && /\[(?:Title|Step|Question|Summary|Opening)/.test(html)) {
      checks.push('WARNING: Placeholder text found in output');
      status = 'warn';
    }

    // Platform-specific checks
    if (platformId === 'generic-html') {
      if (!html.includes('kb-article')) checks.push('Missing .kb-article class');
      if (!html.includes('<style>')) checks.push('Missing <style> block');
      if (!html.includes('kb-callout') && !html.includes('kb-steps')) checks.push('Missing component classes');
      if (checks.length > 0 && status === 'pass') status = 'warn';
    }

    if (platformId === 'notion') {
      if (html.includes('<style>') || html.includes('class=')) {
        checks.push('WARNING: Contains CSS/classes (Notion strips these)');
        status = 'warn';
      }
      if (!html.includes('<h1>') && !html.includes('<h2>')) checks.push('Missing headings');
      if (!html.includes('<blockquote>') && !html.includes('<details>')) {
        checks.push('Missing Notion-specific blocks (blockquote/details)');
      }
    }

    if (platformId === 'confluence') {
      if (!html.includes('confluenceTable') && !html.includes('confluence-information-macro')) {
        checks.push('Missing Confluence-specific classes');
        status = 'warn';
      }
    }

    if (platformId === 'helpjuice') {
      if (!html.includes('helpjuice-accordion') && !html.includes('data-toc')) {
        checks.push('Missing HelpJuice-specific patterns');
        status = 'warn';
      }
    }

    // Check for broken HTML
    const openTags = (html.match(/<(?!\/|!|br|hr|img|input)[a-z][a-z0-9]*/gi) ?? []).length;
    const closeTags = (html.match(/<\/[a-z][a-z0-9]*/gi) ?? []).length;
    if (Math.abs(openTags - closeTags) > 5) {
      checks.push(`WARNING: Tag mismatch (open: ${openTags}, close: ${closeTags})`);
      status = 'warn';
    }

    const message = status === 'pass'
      ? `OK (${html.length} chars, ${durationMs}ms)`
      : checks.join('; ');

    return {
      name: `HTML: ${platformName}`,
      status,
      message,
      durationMs,
      details: html.slice(0, 500),
    };
  } catch (err) {
    return {
      name: `HTML: ${platformName}`,
      status: 'fail',
      message: err instanceof Error ? err.message : 'Generation failed',
      durationMs: Date.now() - start,
    };
  }
}

// Test 4: Check for environment variables
function testEnvVars(): TestResult {
  const start = Date.now();
  const required = [
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const optional = [
    'ASSEMBLYAI_API_KEY',
  ];

  const missing = required.filter((v) => !process.env[v]);
  const missingOptional = optional.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required: ${missing.join(', ')}`,
      durationMs: Date.now() - start,
    };
  }

  if (missingOptional.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'warn',
      message: `Missing optional: ${missingOptional.join(', ')} (video transcription won't work)`,
      durationMs: Date.now() - start,
    };
  }

  return {
    name: 'Environment Variables',
    status: 'pass',
    message: 'All set',
    durationMs: Date.now() - start,
  };
}

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { runType = 'manual', quick = false } = await req.json().catch(() => ({}));

  const results: TestResult[] = [];

  // Always run fast checks
  results.push(testEnvVars());

  // Run connectivity tests in parallel
  const [claudeResult, supabaseResult] = await Promise.all([
    testClaudeAPI(),
    testSupabase(),
  ]);
  results.push(claudeResult, supabaseResult);

  // If Claude is down, skip generation tests
  if (claudeResult.status === 'fail') {
    results.push({
      name: 'HTML Generation',
      status: 'fail',
      message: 'Skipped — Claude API is down',
      durationMs: 0,
    });
  } else if (!quick) {
    // Run platform generation tests (sequentially to avoid rate limits)
    const platforms = [
      { id: 'generic-html', name: 'Generic HTML' },
      { id: 'notion', name: 'Notion' },
      { id: 'confluence', name: 'Confluence' },
      { id: 'helpjuice', name: 'HelpJuice' },
    ];

    for (const p of platforms) {
      results.push(await testPlatformGeneration(p.id, p.name));
    }
  }

  const totalTests = results.length;
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warn').length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  // Save test run to DB
  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await admin.from('qa_test_runs').insert({
      run_type: runType,
      total_tests: totalTests,
      passed,
      failed,
      warnings,
      results: JSON.stringify(results),
      duration_ms: totalDuration,
    });
  } catch {
    // Non-critical — log but don't fail
    console.error('Failed to save QA test run');
  }

  return NextResponse.json({
    summary: { totalTests, passed, failed, warnings, durationMs: totalDuration },
    results,
    overall: failed > 0 ? 'FAIL' : warnings > 0 ? 'WARN' : 'PASS',
  });
}

// GET endpoint to view recent test runs
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await admin
      .from('qa_test_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return NextResponse.json({ runs: data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch QA runs' }, { status: 500 });
  }
}
