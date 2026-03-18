import { describe, it, expect } from 'vitest';
import { replacePlaceholders, BRANDING_DEFAULTS } from '@/lib/branding';

describe('BRANDING_DEFAULTS', () => {
  it('has primaryColor as #2563eb', () => {
    expect(BRANDING_DEFAULTS.primaryColor).toBe('#2563eb');
  });

  it('has accentColor as #2563eb', () => {
    expect(BRANDING_DEFAULTS.accentColor).toBe('#2563eb');
  });

  it('has fontFamily as system-ui, -apple-system, sans-serif', () => {
    expect(BRANDING_DEFAULTS.fontFamily).toBe('system-ui, -apple-system, sans-serif');
  });

  it('has secondaryColor as #e5e7eb', () => {
    expect(BRANDING_DEFAULTS.secondaryColor).toBe('#e5e7eb');
  });

  it('has textColor as #1f2937', () => {
    expect(BRANDING_DEFAULTS.textColor).toBe('#1f2937');
  });

  it('has mutedColor as #6b7280', () => {
    expect(BRANDING_DEFAULTS.mutedColor).toBe('#6b7280');
  });
});

describe('replacePlaceholders', () => {
  it('replaces placeholder with provided branding value', () => {
    expect(replacePlaceholders('color: {{primaryColor}}', { primaryColor: '#ff0000' }))
      .toBe('color: #ff0000');
  });

  it('uses default when branding is undefined', () => {
    expect(replacePlaceholders('color: {{primaryColor}}', undefined))
      .toBe('color: #2563eb');
  });

  it('uses defaults for missing fields in partial branding', () => {
    expect(replacePlaceholders('{{primaryColor}} {{accentColor}}', { primaryColor: '#ff0000' }))
      .toBe('#ff0000 #2563eb');
  });

  it('passes through strings with no placeholders', () => {
    expect(replacePlaceholders('no placeholders here', {}))
      .toBe('no placeholders here');
  });

  it('leaves unknown variables as-is', () => {
    expect(replacePlaceholders('{{unknownVar}}', {}))
      .toBe('{{unknownVar}}');
  });

  it('replaces multiple known placeholders', () => {
    const template = '--primary: {{primaryColor}}; --font: {{fontFamily}};';
    const result = replacePlaceholders(template, { primaryColor: '#ff0000', fontFamily: 'Arial' });
    expect(result).toBe('--primary: #ff0000; --font: Arial;');
  });

  it('uses all defaults when branding is empty object', () => {
    const template = '{{primaryColor}} {{secondaryColor}} {{accentColor}}';
    const result = replacePlaceholders(template, {});
    expect(result).toBe('#2563eb #e5e7eb #2563eb');
  });
});
