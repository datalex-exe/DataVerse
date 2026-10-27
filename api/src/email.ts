/**
 * Email notifications helper using MailChannels API for Cloudflare Workers.
 */
interface SendEmailOptions {
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
}

export async function sendSecurityEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const payload = {
      personalizations: [
        {
          to: [{ email: options.toEmail, name: options.toName || options.toEmail }]
        }
      ],
      from: {
        email: 'dataverse-security@datalexcloud.tech',
        name: 'DataVerse Security'
      },
      subject: options.subject,
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#040b0d;color:#e0f2f1;border-radius:16px;border:1px solid #15303a;">
              <div style="margin-bottom:24px;">
                <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:1px;">Data<span style="color:#2dd4bf;">Verse</span></span>
              </div>
              <div style="background:#09151a;border:1px solid #15303a;border-radius:12px;padding:24px;margin-bottom:24px;">
                ${options.html}
              </div>
              <p style="font-size:12px;color:#7fa3aa;line-height:1.5;margin:0;">
                If you did not initiate this action, please secure your account immediately or contact support at <a href="mailto:dataverse@datalexcloud.tech" style="color:#2dd4bf;text-decoration:none;">dataverse@datalexcloud.tech</a>.
              </p>
            </div>
          `
        }
      ]
    };

    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.status === 202 || res.ok;
  } catch (err) {
    console.error('MailChannels email delivery error:', err);
    return false;
  }
}
