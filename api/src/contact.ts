import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { checkRateLimit } from './rateLimit';

const contactApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper to escape HTML in emails
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

contactApp.post('/', async (c) => {
  try {
    // Rate limit: 5 contact submissions per 10 minutes per IP
    const rl = await checkRateLimit(c, { prefix: 'contact_form', limit: 5, windowSeconds: 600 });
    if (!rl.allowed) {
      c.header('Retry-After', rl.retryAfter.toString());
      return c.json({ error: 'Too many contact messages submitted. Please wait a few minutes before trying again.' }, 429);
    }

    const { name, email, topic, subject, message } = await c.req.json();

    if (!name || !email || !subject || !message) {
      return c.json({ error: 'Please provide all required fields (name, email, subject, and message).' }, 400);
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanTopic = String(topic || 'General Inquiry').trim();
    const cleanSubject = String(subject).trim();
    const cleanMessage = String(message).trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 255) {
      return c.json({ error: 'Please provide a valid email address.' }, 400);
    }

    if (cleanName.length < 2 || cleanName.length > 100) {
      return c.json({ error: 'Name must be between 2 and 100 characters.' }, 400);
    }

    if (cleanSubject.length < 3 || cleanSubject.length > 200) {
      return c.json({ error: 'Subject must be between 3 and 200 characters.' }, 400);
    }

    if (cleanMessage.length < 10 || cleanMessage.length > 4000) {
      return c.json({ error: 'Message must be between 10 and 4,000 characters.' }, 400);
    }

    const inquiryId = crypto.randomUUID();
    const createdAt = Date.now();
    const dateStr = new Date(createdAt).toUTCString();

    // Store in D1 database
    try {
      await c.env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS contact_inquiries (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          topic TEXT NOT NULL,
          subject TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `).run();

      await c.env.DB.prepare(`
        INSERT INTO contact_inquiries (id, name, email, topic, subject, message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(inquiryId, cleanName, cleanEmail, cleanTopic, cleanSubject, cleanMessage, createdAt).run();
    } catch (dbErr) {
      console.error('Failed to log contact inquiry into D1:', dbErr);
    }

    // Send email to dataverse@datalexcloud.tech via MailChannels
    try {
      const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: 'dataverse@datalexcloud.tech', name: 'DataVerse Team' }]
          }],
          from: {
            email: 'dataverse@datalexcloud.tech',
            name: 'DataVerse Web App Contact'
          },
          reply_to: {
            email: cleanEmail,
            name: cleanName
          },
          subject: `[DataVerse Contact] [${escapeHtml(cleanTopic)}] ${escapeHtml(cleanSubject)}`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#040b0d;color:#e2e8f0;border-radius:12px;border:1px solid #134e4a;">
                <h2 style="color:#2dd4bf;margin:0 0 4px;">📬 New Contact Form Submission</h2>
                <p style="color:#7fa3aa;font-size:12px;margin:0 0 24px;">Submitted via DataVerse Web App Contact Form</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:8px 0;color:#7fa3aa;width:120px;">Inquiry ID</td><td style="padding:8px 0;color:#e2e8f0;font-family:monospace;">${escapeHtml(inquiryId)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7fa3aa;">Sender Name</td><td style="padding:8px 0;color:#e2e8f0;font-weight:bold;">${escapeHtml(cleanName)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7fa3aa;">Sender Email</td><td style="padding:8px 0;color:#2dd4bf;"><a href="mailto:${escapeHtml(cleanEmail)}" style="color:#2dd4bf;text-decoration:none;">${escapeHtml(cleanEmail)}</a></td></tr>
                  <tr><td style="padding:8px 0;color:#7fa3aa;">Topic</td><td style="padding:8px 0;color:#f59e0b;font-weight:bold;">${escapeHtml(cleanTopic)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7fa3aa;">Subject</td><td style="padding:8px 0;color:#e2e8f0;">${escapeHtml(cleanSubject)}</td></tr>
                  <tr><td style="padding:8px 0;color:#7fa3aa;">Date</td><td style="padding:8px 0;color:#e2e8f0;">${escapeHtml(dateStr)}</td></tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#0b1d22;border-radius:8px;border-left:3px solid #2dd4bf;">
                  <p style="color:#7fa3aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Message Content</p>
                  <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</p>
                </div>
                <p style="margin-top:24px;font-size:11px;color:#7fa3aa;">You can directly reply to this email to respond to ${escapeHtml(cleanName)} at <code>${escapeHtml(cleanEmail)}</code>.</p>
              </div>
            `
          }]
        })
      });

      if (!mailRes.ok) {
        const errText = await mailRes.text();
        console.error('MailChannels response not OK for contact form:', mailRes.status, errText);
      }
    } catch (mailErr) {
      console.error('MailChannels contact send failed:', mailErr);
    }

    return c.json({
      success: true,
      message: 'Your message has been sent to dataverse@datalexcloud.tech. We will get back to you shortly!'
    }, 200);
  } catch (err: any) {
    console.error('Contact handler error:', err);
    return c.json({ error: err.message || 'Failed to submit contact message' }, 500);
  }
});

export default contactApp;
