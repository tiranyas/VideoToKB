import { describe, it, expect } from 'vitest';
import { DEFAULT_PLATFORM_PROFILES } from '../templates/agent4-html';

describe('Intercom template', () => {
  const intercom = DEFAULT_PLATFORM_PROFILES.find((p) => p.id === 'intercom');

  it('exists in DEFAULT_PLATFORM_PROFILES', () => {
    expect(intercom).toBeDefined();
  });

  it('has correct name', () => {
    expect(intercom!.name).toBe('Intercom');
  });

  it('is marked as default', () => {
    expect(intercom!.isDefault).toBe(true);
  });

  it('htmlPrompt contains Intercom', () => {
    expect(intercom!.htmlPrompt).toContain('Intercom');
  });

  it('htmlPrompt lists allowed elements explicitly', () => {
    const allowedElements = ['p', 'br', 'h1', 'h2', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li', 'img', 'a', 'iframe', 'pre', 'code', 'table', 'tr', 'td', 'hr'];
    for (const el of allowedElements) {
      expect(intercom!.htmlPrompt).toContain(el);
    }
  });

  it('htmlTemplate does NOT contain <div (except intercom-align-center)', () => {
    const template = intercom!.htmlTemplate;
    // Remove any allowed divs first, then check no divs remain
    const withoutAllowed = template.replace(/<div\s+class="intercom-align-center">/g, '');
    expect(withoutAllowed).not.toContain('<div');
  });

  it('htmlTemplate does NOT contain <span', () => {
    expect(intercom!.htmlTemplate).not.toContain('<span');
  });

  it('htmlTemplate does NOT contain style="', () => {
    expect(intercom!.htmlTemplate).not.toContain('style="');
  });

  it('htmlTemplate does NOT contain <h3 or <h4', () => {
    expect(intercom!.htmlTemplate).not.toContain('<h3');
    expect(intercom!.htmlTemplate).not.toContain('<h4');
  });

  it('htmlTemplate contains only allowed tags', () => {
    const template = intercom!.htmlTemplate;
    // Extract all opening tags from the template
    const tagMatches = template.match(/<([a-z][a-z0-9]*)/g) || [];
    const usedTags = new Set(tagMatches.map((t) => t.slice(1)));

    const allowedTags = new Set([
      'p', 'br', 'h1', 'h2', 'b', 'strong', 'i', 'em',
      'ul', 'ol', 'li', 'img', 'a', 'iframe', 'pre', 'code',
      'table', 'tr', 'td', 'hr', 'div', // div only with intercom-align-center
    ]);

    for (const tag of usedTags) {
      expect(allowedTags.has(tag)).toBe(true);
    }
  });

  it('htmlPrompt mentions special Intercom classes', () => {
    expect(intercom!.htmlPrompt).toContain('intercom-align-center');
    expect(intercom!.htmlPrompt).toContain('intercom-h2b-button');
  });

  it('htmlPrompt explicitly warns against thead/th/tbody', () => {
    const prompt = intercom!.htmlPrompt;
    // These should appear in a NEVER USE / restriction context
    expect(prompt).toContain('NEVER USE');
    expect(prompt).toContain('<thead>');
    expect(prompt).toContain('<th>');
    expect(prompt).toContain('<tbody>');
  });

  it('htmlPrompt documents strong-to-b conversion', () => {
    const prompt = intercom!.htmlPrompt;
    expect(prompt).toContain('<strong>');
    expect(prompt).toContain('<b>');
    // Verify the conversion relationship is documented
    expect(prompt).toMatch(/strong.*converted to.*b/i);
  });

  it('htmlTemplate has no branding placeholders', () => {
    expect(intercom!.htmlTemplate).not.toMatch(/\{\{.*?\}\}/);
  });

  it('htmlTemplate does NOT contain thead or th', () => {
    expect(intercom!.htmlTemplate).not.toContain('<thead');
    expect(intercom!.htmlTemplate).not.toContain('<th');
  });
});
