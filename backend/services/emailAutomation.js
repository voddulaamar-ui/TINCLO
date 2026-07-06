/**
 * Email Automation Service
 * Sends lifecycle emails for application, interview, and offer events.
 * Uses the existing emailService for delivery.
 * 
 * Usage:
 *   import emailAutomation from '../services/emailAutomation.js';
 *   await emailAutomation.applicationSubmitted({ candidateName, jobTitle, company, email });
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BRAND_COLOR  = '#667eea';

// ── Base HTML template ───────────────────────────────────────────────────────
const wrap = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f7fa;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,${BRAND_COLOR},#764ba2);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800;">💼 TINCLO</h1>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        You're receiving this because you have an account on TINCLO.
        <br><a href="${FRONTEND_URL}" style="color:${BRAND_COLOR};">Visit TINCLO</a>
      </p>
    </div>
  </div>
</body>
</html>`;

// ── Helper: send email (non-blocking, never throws) ──────────────────────────
const sendEmail = async (to, subject, html) => {
  try {
    const { default: emailService } = await import('./emailService.js');
    if (emailService?.sendEmail) await emailService.sendEmail({ to, subject, html });
    else if (emailService?.send)  await emailService.send({ to, subject, html });
  } catch (err) {
    console.warn(`[EMAIL-AUTO] Failed to send "${subject}" to ${to}:`, err.message);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// Email Templates
// ══════════════════════════════════════════════════════════════════════════════

const emailAutomation = {

  // ── Application lifecycle ──────────────────────────────────────────────────

  async applicationSubmitted({ email, candidateName, jobTitle, company }) {
    await sendEmail(email, `Application Submitted — ${jobTitle} at ${company}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Application Submitted! 🎉</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${candidateName}</strong>,<br><br>
        Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been submitted successfully.
      </p>
      <p style="color:#4b5563;">The recruiter will review your profile and get back to you soon.</p>
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;margin-top:16px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Dashboard</a>
    `));
  },

  async applicationStatusUpdated({ email, candidateName, jobTitle, company, status }) {
    const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    await sendEmail(email, `Application Update — ${jobTitle}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Application Status Updated 📋</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${candidateName}</strong>,<br><br>
        Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated to:
      </p>
      <div style="margin:16px 0;padding:12px 20px;background:#f0f4ff;border-radius:8px;border-left:4px solid ${BRAND_COLOR};">
        <strong style="color:${BRAND_COLOR};font-size:16px;">${statusText}</strong>
      </div>
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;margin-top:12px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Details</a>
    `));
  },

  // ── Interview lifecycle ────────────────────────────────────────────────────

  async interviewScheduled({ email, candidateName, jobTitle, company, date, time, mode, meetingLink }) {
    await sendEmail(email, `Interview Scheduled — ${jobTitle} at ${company}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Interview Scheduled! 📅</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${candidateName}</strong>,<br><br>
        Great news! Your interview for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been scheduled.
      </p>
      <div style="margin:16px 0;padding:16px 20px;background:#faf5ff;border-radius:8px;border-left:4px solid #805ad5;">
        <p style="margin:0;color:#1f2937;"><strong>📅 Date:</strong> ${date}</p>
        ${time ? `<p style="margin:4px 0 0;color:#1f2937;"><strong>⏰ Time:</strong> ${time}</p>` : ''}
        <p style="margin:4px 0 0;color:#1f2937;"><strong>📍 Mode:</strong> ${mode || 'Online'}</p>
        ${meetingLink ? `<p style="margin:8px 0 0;"><a href="${meetingLink}" style="color:${BRAND_COLOR};font-weight:700;">Join Meeting →</a></p>` : ''}
      </div>
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;margin-top:12px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View in Dashboard</a>
    `));
  },

  async interviewReminder({ email, candidateName, jobTitle, company, date, time, meetingLink }) {
    await sendEmail(email, `Reminder: Interview Tomorrow — ${jobTitle}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Interview Reminder ⏰</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${candidateName}</strong>,<br><br>
        This is a reminder that your interview for <strong>${jobTitle}</strong> at <strong>${company}</strong> is coming up.
      </p>
      <div style="margin:16px 0;padding:16px 20px;background:#fff7ed;border-radius:8px;border-left:4px solid #f59e0b;">
        <p style="margin:0;color:#1f2937;"><strong>📅 ${date}</strong> ${time ? `at <strong>${time}</strong>` : ''}</p>
        ${meetingLink ? `<p style="margin:8px 0 0;"><a href="${meetingLink}" style="color:${BRAND_COLOR};font-weight:700;">Join Meeting →</a></p>` : ''}
      </div>
      <p style="color:#6b7280;font-size:14px;">Good luck! 🍀</p>
    `));
  },

  // ── Offer lifecycle ────────────────────────────────────────────────────────

  async offerReleased({ email, candidateName, jobTitle, company, salary }) {
    await sendEmail(email, `🎉 Offer Received — ${jobTitle} at ${company}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Congratulations! 🎉🎊</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${candidateName}</strong>,<br><br>
        <strong>${company}</strong> has extended an offer for <strong>${jobTitle}</strong>!
      </p>
      ${salary ? `<div style="margin:16px 0;padding:16px 20px;background:#f0fff4;border-radius:8px;border-left:4px solid #38a169;">
        <p style="margin:0;color:#1f2937;"><strong>💰 Package:</strong> ${salary}</p>
      </div>` : ''}
      <p style="color:#4b5563;">Please review the offer and respond from your dashboard.</p>
      <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;margin-top:12px;padding:12px 28px;background:#38a169;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Offer</a>
    `));
  },

  async offerAccepted({ email, recruiterName, candidateName, jobTitle, company }) {
    await sendEmail(email, `Offer Accepted — ${candidateName} for ${jobTitle}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Offer Accepted! ✅</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${recruiterName}</strong>,<br><br>
        <strong>${candidateName}</strong> has accepted the offer for <strong>${jobTitle}</strong> at <strong>${company}</strong>.
      </p>
      <p style="color:#4b5563;">You can now proceed with the onboarding process.</p>
      <a href="${FRONTEND_URL}/recruiter" style="display:inline-block;margin-top:12px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">View Dashboard</a>
    `));
  },

  // ── Recruiter notifications ────────────────────────────────────────────────

  async newCandidateApplied({ email, recruiterName, candidateName, jobTitle }) {
    await sendEmail(email, `New Application — ${jobTitle}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">New Application Received 📧</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${recruiterName}</strong>,<br><br>
        <strong>${candidateName}</strong> has applied for <strong>${jobTitle}</strong>.
      </p>
      <a href="${FRONTEND_URL}/recruiter" style="display:inline-block;margin-top:16px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Review Application</a>
    `));
  },

  async jobClosed({ email, recruiterName, jobTitle, company }) {
    await sendEmail(email, `Job Closed — ${jobTitle}`, wrap(`
      <h2 style="color:#1f2937;margin:0 0 12px;">Job Closed 🔒</h2>
      <p style="color:#4b5563;line-height:1.7;">
        Hi <strong>${recruiterName}</strong>,<br><br>
        The posting for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been closed.
        Candidates will no longer see this job in their feed.
      </p>
      <a href="${FRONTEND_URL}/recruiter" style="display:inline-block;margin-top:16px;padding:12px 28px;background:${BRAND_COLOR};color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Manage Jobs</a>
    `));
  },
};

export default emailAutomation;
