/**
 * Shared URL validation with SSRF protection.
 *
 * Blocks private/internal IPv4 and IPv6 addresses to prevent
 * server-side request forgery attacks.
 */

type ValidResult = { ok: true; url: URL };
type InvalidResult = { ok: false; reason: string };

/**
 * Check if an IPv4 address (as 4 octets) is private/reserved.
 */
function isPrivateIPv4(a: number, b: number): boolean {
  return (
    a === 10 ||                          // 10.0.0.0/8
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
    (a === 192 && b === 168) ||          // 192.168.0.0/16
    (a === 169 && b === 254) ||          // 169.254.0.0/16 (link-local)
    a === 127 ||                          // 127.0.0.0/8
    a === 0                               // 0.0.0.0/8
  );
}

/**
 * Check if a hostname is a private/reserved IPv6 address.
 * Handles bracket-wrapped addresses from URLs.
 */
function isPrivateIPv6(hostname: string): boolean {
  // Strip brackets if present
  let addr = hostname.replace(/^\[|\]$/g, '');

  // Strip zone ID (e.g., %25eth0 or %eth0)
  const zoneIdx = addr.indexOf('%');
  if (zoneIdx !== -1) {
    addr = addr.slice(0, zoneIdx);
  }

  const lower = addr.toLowerCase();

  // Loopback ::1
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // Unspecified ::
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // Unique local fc00::/7 (fc00:: through fdff::)
  if (lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }

  // Link-local fe80::/10
  if (lower.startsWith('fe80')) {
    return true;
  }

  // IPv4-mapped IPv6 ::ffff:x.x.x.x or ::ffff:HHHH:HHHH (hex form)
  if (lower.startsWith('::ffff:')) {
    const ipv4Part = lower.slice(7); // after "::ffff:"

    // Dotted decimal form: ::ffff:10.0.0.1
    const ipv4Match = ipv4Part.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      return isPrivateIPv4(a, b);
    }

    // Hex form (Node.js normalizes to this): ::ffff:7f00:1
    const hexMatch = ipv4Part.match(/^([0-9a-f]+):([0-9a-f]+)$/);
    if (hexMatch) {
      const high = parseInt(hexMatch[1], 16);
      const low = parseInt(hexMatch[2], 16);
      const a = (high >> 8) & 0xff;
      const b = high & 0xff;
      return isPrivateIPv4(a, b);
    }
  }

  // Documentation 2001:db8::/32
  if (lower.startsWith('2001:db8:') || lower.startsWith('2001:0db8:') ||
      lower === '2001:db8' || lower === '2001:0db8') {
    return true;
  }

  // Discard prefix 100::/64
  if (lower.startsWith('100::') || lower === '100:') {
    return true;
  }

  return false;
}

/**
 * Validate a URL for safe external fetching.
 * Blocks non-http(s) protocols and private/internal addresses.
 */
export function validateUrl(raw: string): ValidResult | InvalidResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs are allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost variants
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '0.0.0.0'
  ) {
    return { ok: false, reason: 'Internal addresses are not allowed' };
  }

  // Block private IPv4 ranges
  const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (isPrivateIPv4(a, b)) {
      return { ok: false, reason: 'Internal addresses are not allowed' };
    }
  }

  // Block private IPv6 ranges (hostname contains : if IPv6)
  if (hostname.includes(':')) {
    if (isPrivateIPv6(hostname)) {
      return { ok: false, reason: 'Internal addresses are not allowed' };
    }
  }

  return { ok: true, url };
}
