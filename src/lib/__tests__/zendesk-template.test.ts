import { describe, it, expect } from 'vitest';
import { DEFAULT_PLATFORM_PROFILES } from '../templates/agent4-html';

describe('Zendesk Help Center template', () => {
  const zendesk = DEFAULT_PLATFORM_PROFILES.find((p) => p.id === 'zendesk');

  it('exists in DEFAULT_PLATFORM_PROFILES', () => {
    expect(zendesk).toBeDefined();
  });

  it('has correct name', () => {
    expect(zendesk!.name).toBe('Zendesk Help Center');
  });

  it('is marked as default', () => {
    expect(zendesk!.isDefault).toBe(true);
  });

  it('htmlPrompt contains Zendesk Help Center', () => {
    expect(zendesk!.htmlPrompt).toContain('Zendesk Help Center');
  });

  it('htmlPrompt references COMPONENT_BASE content (component identification)', () => {
    expect(zendesk!.htmlPrompt).toContain('Component Identification');
    expect(zendesk!.htmlPrompt).toContain('Summary/Opening');
    expect(zendesk!.htmlPrompt).toContain('Step-by-Step Instructions');
  });

  it('htmlTemplate contains c-callout CSS class', () => {
    expect(zendesk!.htmlTemplate).toContain('c-callout');
  });

  it('htmlTemplate uses semantic HTML (h1, h2, table, details)', () => {
    expect(zendesk!.htmlTemplate).toContain('<h1>');
    expect(zendesk!.htmlTemplate).toContain('<h2>');
    expect(zendesk!.htmlTemplate).toContain('<table>');
    expect(zendesk!.htmlTemplate).toContain('<details>');
    expect(zendesk!.htmlTemplate).toContain('<summary>');
  });

  it('htmlTemplate does not contain inline style attributes', () => {
    // Zendesk uses CSS classes, not inline styles
    expect(zendesk!.htmlTemplate).not.toContain('style="');
  });

  it('htmlTemplate contains article-intro class', () => {
    expect(zendesk!.htmlTemplate).toContain('article-intro');
  });

  it('htmlPrompt mentions CSS classes over inline styles', () => {
    expect(zendesk!.htmlPrompt).toContain('CSS classes');
    expect(zendesk!.htmlPrompt).toContain('No `<style>` block needed');
  });
});
