/**
 * Centralized admin access control.
 * Single source of truth for admin email list — never duplicate in individual routes.
 */

const ADMIN_EMAILS: readonly string[] = [
  'tiran@kbpipe.com',
  'tiranyas@gmail.com',
];

/** Check if an email belongs to an admin user (server-side only). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}
