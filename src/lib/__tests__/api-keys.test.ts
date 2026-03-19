import { describe, it, expect } from 'vitest';
import { generateApiKey, hashApiKey, keyPrefix } from '@/lib/api-keys';

describe('generateApiKey', () => {
  it('returns a string starting with "vtk_"', () => {
    const key = generateApiKey();
    expect(key.startsWith('vtk_')).toBe(true);
  });

  it('returns a 52-character string (vtk_ + 48 hex chars)', () => {
    const key = generateApiKey();
    expect(key).toHaveLength(52);
  });

  it('returns unique values on consecutive calls', () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).not.toBe(key2);
  });
});

describe('hashApiKey', () => {
  it('returns a consistent SHA-256 hex digest for the same input', () => {
    const key = 'vtk_abc123';
    const hash1 = hashApiKey(key);
    const hash2 = hashApiKey(key);
    expect(hash1).toBe(hash2);
    // SHA-256 hex = 64 chars
    expect(hash1).toHaveLength(64);
  });

  it('returns different hashes for different inputs', () => {
    const hash1 = hashApiKey('vtk_key_one');
    const hash2 = hashApiKey('vtk_key_two');
    expect(hash1).not.toBe(hash2);
  });
});

describe('keyPrefix', () => {
  it('returns the first 12 characters of a key', () => {
    const key = 'vtk_abcdefgh1234567890';
    expect(keyPrefix(key)).toBe('vtk_abcdefgh');
    expect(keyPrefix(key)).toHaveLength(12);
  });
});
