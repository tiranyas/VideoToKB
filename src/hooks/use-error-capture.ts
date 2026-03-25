'use client';

import { useEffect, useRef, useCallback } from 'react';

const MAX_ENTRIES = 20;

interface ErrorLogs {
  consoleErrors: string[];
  networkErrors: string[];
}

/** Ring buffer that keeps the last N entries */
function createRingBuffer(max: number) {
  const buffer: string[] = [];
  return {
    push(entry: string) {
      if (buffer.length >= max) buffer.shift();
      buffer.push(entry);
    },
    getAll(): string[] {
      return [...buffer];
    },
    clear() {
      buffer.length = 0;
    },
  };
}

// Module-level buffers so they persist across re-renders
const consoleBuffer = createRingBuffer(MAX_ENTRIES);
const networkBuffer = createRingBuffer(MAX_ENTRIES);
let isPatched = false;

function patchGlobals() {
  if (isPatched || typeof window === 'undefined') return;
  isPatched = true;

  // --- Patch console.error and console.warn ---
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const message = args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === 'object') {
        try { return JSON.stringify(a).slice(0, 500); } catch { return String(a); }
      }
      return String(a);
    }).join(' ');
    consoleBuffer.push(`[${timestamp}] ERROR: ${message.slice(0, 1000)}`);
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const timestamp = new Date().toISOString();
    const message = args.map(a => typeof a === 'object' ? String(a) : String(a)).join(' ');
    consoleBuffer.push(`[${timestamp}] WARN: ${message.slice(0, 1000)}`);
    originalWarn.apply(console, args);
  };

  // --- Patch fetch to log failed requests ---
  const originalFetch = window.fetch;

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const url = typeof args[0] === 'string'
      ? args[0]
      : args[0] instanceof Request
        ? args[0].url
        : String(args[0]);

    // Don't capture our own feedback calls to avoid recursion
    if (url.includes('/api/feedback')) {
      return originalFetch.apply(window, args);
    }

    try {
      const response = await originalFetch.apply(window, args);
      if (response.status >= 400) {
        const timestamp = new Date().toISOString();
        let body = '';
        try {
          const cloned = response.clone();
          body = (await cloned.text()).slice(0, 300);
        } catch { /* ignore */ }
        const method = (args[1]?.method ?? 'GET').toUpperCase();
        networkBuffer.push(
          `[${timestamp}] ${method} ${url} -> ${response.status} ${response.statusText}${body ? ` | ${body}` : ''}`
        );
      }
      return response;
    } catch (err) {
      const timestamp = new Date().toISOString();
      const method = (args[1]?.method ?? 'GET').toUpperCase();
      networkBuffer.push(
        `[${timestamp}] ${method} ${url} -> NETWORK ERROR: ${err instanceof Error ? err.message : String(err)}`
      );
      throw err;
    }
  };

  // --- Uncaught errors ---
  window.addEventListener('error', (event) => {
    const timestamp = new Date().toISOString();
    consoleBuffer.push(
      `[${timestamp}] UNCAUGHT: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const timestamp = new Date().toISOString();
    const reason = event.reason instanceof Error
      ? `${event.reason.name}: ${event.reason.message}`
      : String(event.reason);
    consoleBuffer.push(`[${timestamp}] UNHANDLED REJECTION: ${reason.slice(0, 1000)}`);
  });
}

/**
 * Hook that silently captures console errors, warnings, failed fetch requests,
 * and uncaught exceptions. Call `getErrorLogs()` to retrieve them.
 *
 * Place this in a top-level layout component so it patches globals once.
 */
export function useErrorCapture() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      patchGlobals();
      initialized.current = true;
    }
  }, []);

  const getErrorLogs = useCallback((): ErrorLogs => ({
    consoleErrors: consoleBuffer.getAll(),
    networkErrors: networkBuffer.getAll(),
  }), []);

  return { getErrorLogs };
}
