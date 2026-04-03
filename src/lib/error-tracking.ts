/**
 * Centralized error tracking.
 * Currently logs to console; swap internals for Sentry/Datadog when ready.
 *
 * Usage:
 *   import { captureError } from '@/lib/error-tracking';
 *   captureError(err, { context: 'webhook-handler', userId });
 */

interface ErrorContext {
  context?: string;
  userId?: string;
  [key: string]: unknown;
}

/** Capture and log an error with optional context. */
export function captureError(error: unknown, meta?: ErrorContext): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    `[Error] ${meta?.context ?? 'unknown'}:`,
    message,
    meta ? JSON.stringify(meta) : '',
    stack ? `\n${stack}` : ''
  );

  // TODO: Replace with Sentry.captureException(error, { extra: meta }) when integrated
}

/** Capture a warning (non-critical issue worth monitoring). */
export function captureWarning(message: string, meta?: ErrorContext): void {
  console.warn(
    `[Warning] ${meta?.context ?? 'unknown'}:`,
    message,
    meta ? JSON.stringify(meta) : ''
  );
}
