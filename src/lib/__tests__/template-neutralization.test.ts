import { describe, it, expect } from 'vitest';
import { DEFAULT_PLATFORM_PROFILES, buildHtmlPrompt } from '@/lib/templates/agent4-html';

describe('Template neutralization — no FinBot purple', () => {
  it('no DEFAULT_PLATFORM_PROFILES entry contains #6d28d9 in htmlPrompt', () => {
    for (const profile of DEFAULT_PLATFORM_PROFILES) {
      expect(profile.htmlPrompt).not.toContain('#6d28d9');
    }
  });

  it('no DEFAULT_PLATFORM_PROFILES entry contains #6d28d9 in htmlTemplate', () => {
    for (const profile of DEFAULT_PLATFORM_PROFILES) {
      expect(profile.htmlTemplate).not.toContain('#6d28d9');
    }
  });
});

describe('Generic template placeholders', () => {
  it('GENERIC_TEMPLATE contains {{primaryColor}}', () => {
    const generic = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'generic-html')!;
    expect(generic.htmlTemplate).toContain('{{primaryColor}}');
  });

  it('GENERIC_TEMPLATE contains {{accentColor}}', () => {
    const generic = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'generic-html')!;
    expect(generic.htmlTemplate).toContain('{{accentColor}}');
  });

  it('GENERIC_TEMPLATE contains {{fontFamily}}', () => {
    const generic = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'generic-html')!;
    expect(generic.htmlTemplate).toContain('{{fontFamily}}');
  });

  it('GENERIC_TEMPLATE contains {{secondaryColor}}', () => {
    const generic = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'generic-html')!;
    expect(generic.htmlTemplate).toContain('{{secondaryColor}}');
  });
});

describe('HelpJuice template placeholders', () => {
  it('HELPJUICE_TEMPLATE contains {{primaryColor}} and not #6d28d9', () => {
    const helpjuice = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'helpjuice')!;
    expect(helpjuice.htmlTemplate).toContain('{{primaryColor}}');
    expect(helpjuice.htmlTemplate).not.toContain('#6d28d9');
  });

  it('HELPJUICE_PROMPT contains {{primaryColor}} and not #6d28d9', () => {
    const helpjuice = DEFAULT_PLATFORM_PROFILES.find(p => p.id === 'helpjuice')!;
    expect(helpjuice.htmlPrompt).toContain('{{primaryColor}}');
    expect(helpjuice.htmlPrompt).not.toContain('#6d28d9');
  });
});

describe('buildHtmlPrompt with branding', () => {
  it('resolves placeholders when branding is provided', () => {
    const result = buildHtmlPrompt(
      'Use color {{primaryColor}}',
      '<div style="color: {{primaryColor}}">test</div>',
      { primaryColor: '#ff0000' }
    );
    expect(result).toContain('#ff0000');
    expect(result).not.toContain('{{primaryColor}}');
  });

  it('works without branding (backward compatible)', () => {
    const result = buildHtmlPrompt(
      'Some prompt',
      '<div>template</div>'
    );
    expect(result).toContain('Some prompt');
    expect(result).toContain('<div>template</div>');
  });

  it('uses neutral defaults when branding is undefined (applyBranding=false path)', () => {
    const result = buildHtmlPrompt(
      'Use color {{primaryColor}}',
      '<div style="color: {{primaryColor}}">test</div>',
      undefined
    );
    // Should use default #2563eb, not any workspace color
    expect(result).toContain('#2563eb');
    expect(result).not.toContain('{{primaryColor}}');
  });

  it('works with no template (prompt-only mode)', () => {
    const result = buildHtmlPrompt('Just a prompt {{primaryColor}}', '', { primaryColor: '#abc123' });
    expect(result).toContain('#abc123');
    expect(result).not.toContain('{{primaryColor}}');
  });
});
