import { describe, it, expect } from 'vitest';
import { DEFAULT_PLATFORM_PROFILES } from '../templates/agent4-html';

describe('All platforms registry', () => {
  it('all 7 platform profiles are registered', () => {
    expect(DEFAULT_PLATFORM_PROFILES).toHaveLength(7);
    const ids = DEFAULT_PLATFORM_PROFILES.map((p) => p.id);
    expect(ids).toContain('generic-html');
    expect(ids).toContain('notion');
    expect(ids).toContain('confluence');
    expect(ids).toContain('helpjuice');
    expect(ids).toContain('zendesk');
    expect(ids).toContain('intercom');
    expect(ids).toContain('markdown-only');
  });

  it('every profile has non-empty htmlPrompt', () => {
    for (const profile of DEFAULT_PLATFORM_PROFILES) {
      expect(profile.htmlPrompt.length, `${profile.id} should have non-empty htmlPrompt`).toBeGreaterThan(0);
    }
  });

  it('every profile except markdown-only has non-empty htmlTemplate', () => {
    for (const profile of DEFAULT_PLATFORM_PROFILES) {
      if (profile.id === 'markdown-only') {
        expect(profile.htmlTemplate, 'markdown-only should have empty htmlTemplate').toBe('');
      } else {
        expect(profile.htmlTemplate.length, `${profile.id} should have non-empty htmlTemplate`).toBeGreaterThan(0);
      }
    }
  });

  it('no two profiles share the same id', () => {
    const ids = DEFAULT_PLATFORM_PROFILES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('platform names match expected display names', () => {
    const expectedNames: Record<string, string> = {
      'generic-html': 'Generic Clean HTML',
      'helpjuice': 'HelpJuice',
      'zendesk': 'Zendesk Help Center',
      'intercom': 'Intercom',
      'notion': 'Notion',
      'confluence': 'Confluence',
      'markdown-only': 'Markdown Only',
    };

    for (const [id, expectedName] of Object.entries(expectedNames)) {
      const profile = DEFAULT_PLATFORM_PROFILES.find((p) => p.id === id);
      expect(profile, `Profile with id '${id}' should exist`).toBeDefined();
      expect(profile!.name).toBe(expectedName);
    }
  });
});
