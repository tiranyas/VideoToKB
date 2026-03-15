import { describe, it, expect } from 'vitest';
import { validateUrl } from '@/lib/url-validation';

describe('validateUrl', () => {
  // Valid public URLs
  it.each([
    'https://example.com',
    'https://docs.google.com/document/d/123',
    'http://www.helpjuice.com/article/test',
  ])('accepts valid public URL: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(true);
  });

  // Protocol check
  it.each([
    'ftp://example.com',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<h1>hi</h1>',
  ])('rejects non-http/https protocol: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // Localhost variants
  it.each([
    'http://localhost',
    'http://127.0.0.1',
    'http://0.0.0.0',
  ])('rejects localhost variant: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv4 private ranges
  it.each([
    'http://10.0.0.1',
    'http://10.255.255.255',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.1.1',
    'http://192.168.0.1',
    'http://169.254.169.254', // AWS metadata
  ])('rejects IPv4 private address: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv6 loopback
  it.each([
    'http://[::1]',
    'http://[::1]:8080',
  ])('rejects IPv6 loopback: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv6 unspecified
  it('rejects IPv6 unspecified address (::)', () => {
    const result = validateUrl('http://[::]');
    expect(result.ok).toBe(false);
  });

  // IPv6 unique local (fc00::/7)
  it.each([
    'http://[fc00::1]',
    'http://[fd12::1]',
    'http://[fdab:cdef::1]',
  ])('rejects IPv6 unique local: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv6 link-local (fe80::/10)
  it.each([
    'http://[fe80::1]',
    'http://[fe80::1%25eth0]',
  ])('rejects IPv6 link-local: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv4-mapped IPv6
  it.each([
    'http://[::ffff:127.0.0.1]',
    'http://[::ffff:10.0.0.1]',
    'http://[::ffff:192.168.1.1]',
    'http://[::ffff:172.16.0.1]',
  ])('rejects IPv4-mapped IPv6: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // IPv6 documentation range (2001:db8::/32)
  it.each([
    'http://[2001:db8::1]',
    'http://[2001:0db8::1]',
  ])('rejects IPv6 documentation address: %s', (url) => {
    const result = validateUrl(url);
    expect(result.ok).toBe(false);
  });

  // Valid public IPv6
  it('accepts valid public IPv6 (Google)', () => {
    const result = validateUrl('http://[2607:f8b0:4004:800::200e]');
    expect(result.ok).toBe(true);
  });

  // Invalid URL format
  it('rejects malformed URLs', () => {
    const result = validateUrl('not-a-url');
    expect(result.ok).toBe(false);
  });
});
