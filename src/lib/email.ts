import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

const FROM = 'KBPipe Support <support@kbpipe.io>';

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug Report',
  quality: 'Content Quality',
  styling: 'Styling Issue',
  feature: 'Feature Request',
  other: 'Other',
};

interface FeedbackData {
  id: string;
  category: string;
  description: string;
  expectedBehavior?: string | null;
  severity: string;
  platformName?: string | null;
  articleTitle?: string | null;
  consoleErrors?: string[];
  networkErrors?: string[];
}

/**
 * Send notification email to support@kbpipe.io when new feedback is submitted.
 */
export async function sendFeedbackNotification(
  feedback: FeedbackData,
  userEmail: string
) {
  const categoryLabel = CATEGORY_LABELS[feedback.category] ?? feedback.category;
  const severityBadge = feedback.severity === 'critical' ? '🔴 CRITICAL'
    : feedback.severity === 'high' ? '🟠 HIGH'
    : feedback.severity === 'medium' ? '🟡 MEDIUM'
    : '🟢 LOW';

  let errorSection = '';
  if (feedback.consoleErrors?.length || feedback.networkErrors?.length) {
    errorSection = `
    <div style="margin-top:20px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <h3 style="margin:0 0 12px;color:#991b1b;font-size:14px;">Captured Error Logs</h3>
      ${feedback.consoleErrors?.length ? `
        <div style="margin-bottom:12px;">
          <strong style="font-size:12px;color:#666;">Console Errors (${feedback.consoleErrors.length}):</strong>
          <pre style="margin:6px 0 0;padding:10px;background:#1f2937;color:#f9fafb;border-radius:6px;font-size:11px;overflow-x:auto;white-space:pre-wrap;max-height:300px;overflow-y:auto;">${escapeHtml(feedback.consoleErrors.join('\n'))}</pre>
        </div>
      ` : ''}
      ${feedback.networkErrors?.length ? `
        <div>
          <strong style="font-size:12px;color:#666;">Failed Network Requests (${feedback.networkErrors.length}):</strong>
          <pre style="margin:6px 0 0;padding:10px;background:#1f2937;color:#f9fafb;border-radius:6px;font-size:11px;overflow-x:auto;white-space:pre-wrap;max-height:300px;overflow-y:auto;">${escapeHtml(feedback.networkErrors.join('\n'))}</pre>
        </div>
      ` : ''}
    </div>`;
  }

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:20px 24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:white;font-size:18px;">New ${categoryLabel}</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${severityBadge}</p>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <table style="width:100%;font-size:13px;color:#374151;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#6b7280;width:100px;">From:</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(userEmail)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Ticket ID:</td><td style="padding:6px 0;"><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:11px;">${feedback.id.slice(0, 8)}</code></td></tr>
          ${feedback.platformName ? `<tr><td style="padding:6px 0;color:#6b7280;">Platform:</td><td style="padding:6px 0;">${escapeHtml(feedback.platformName)}</td></tr>` : ''}
          ${feedback.articleTitle ? `<tr><td style="padding:6px 0;color:#6b7280;">Article:</td><td style="padding:6px 0;">${escapeHtml(feedback.articleTitle)}</td></tr>` : ''}
        </table>

        <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 8px;font-size:13px;color:#6b7280;">Description</h3>
          <p style="margin:0;font-size:14px;color:#111827;white-space:pre-wrap;">${escapeHtml(feedback.description)}</p>
        </div>

        ${feedback.expectedBehavior ? `
        <div style="margin-top:12px;padding:16px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 8px;font-size:13px;color:#6b7280;">Expected Behavior</h3>
          <p style="margin:0;font-size:14px;color:#111827;white-space:pre-wrap;">${escapeHtml(feedback.expectedBehavior)}</p>
        </div>
        ` : ''}

        ${errorSection}
      </div>
    </div>
  `;

  await getResend().emails.send({
    from: FROM,
    to: 'support@kbpipe.io',
    subject: `[${categoryLabel}] ${feedback.description.slice(0, 80)}`,
    html,
  });
}

/**
 * Send confirmation email to the user who submitted feedback.
 */
export async function sendFeedbackConfirmation(
  userEmail: string,
  category: string,
  ticketId: string
) {
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);padding:20px 24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:white;font-size:18px;">We received your feedback</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          Thank you for reaching out! We've received your <strong>${categoryLabel.toLowerCase()}</strong> report and our team will review it shortly.
        </p>
        <div style="padding:12px 16px;background:#f9fafb;border-radius:8px;margin-bottom:16px;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Ticket ID: <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${ticketId.slice(0, 8)}</code>
          </p>
        </div>
        <p style="font-size:13px;color:#6b7280;margin:0;">
          If you need to add more details, reply to this email or contact us at
          <a href="mailto:support@kbpipe.io" style="color:#7c3aed;">support@kbpipe.io</a>.
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;">
        KBPipe &mdash; AI-Powered Knowledge Base Generator
      </p>
    </div>
  `;

  await getResend().emails.send({
    from: FROM,
    to: userEmail,
    subject: `We received your ${categoryLabel.toLowerCase()} report`,
    html,
    replyTo: 'support@kbpipe.io',
  });
}

/**
 * Send alert email when a subscription payment fails.
 */
export async function sendPaymentFailedAlert(userEmail: string, portalUrl?: string | null) {
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:20px 24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:white;font-size:18px;">Payment Failed</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          We were unable to process your latest subscription payment for KBPipe. Your account has been marked as <strong>past due</strong>.
        </p>
        <p style="font-size:14px;color:#374151;margin:0 0 16px;">
          Please update your payment method to continue using KBPipe without interruption.
        </p>
        ${portalUrl ? `
        <a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:white;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Update Payment Method
        </a>
        ` : ''}
        <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">
          If you need help, contact us at <a href="mailto:support@kbpipe.io" style="color:#7c3aed;">support@kbpipe.io</a>.
        </p>
      </div>
    </div>
  `;

  try {
    await getResend().emails.send({
      from: FROM,
      to: userEmail,
      subject: 'Action required: Payment failed for your KBPipe subscription',
      html,
      replyTo: 'support@kbpipe.io',
    });

    // Also notify admin
    await getResend().emails.send({
      from: FROM,
      to: 'support@kbpipe.io',
      subject: `[Payment Failed] ${userEmail}`,
      html: `<p>Payment failed for <strong>${escapeHtml(userEmail)}</strong>. Subscription set to past_due.</p>`,
    });
  } catch (err) {
    console.error('[Email] Failed to send payment alert:', err);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
