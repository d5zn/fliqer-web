import { Resend } from 'resend';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize Resend with API key from environment
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Check if API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return res.status(500).json({ error: 'Email service is not configured' });
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectType, companyName, email, message, attachment } = req.body;

    // Validate required fields
    if (!projectType || !companyName || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Prepare email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF9B04 0%, #FA4D06 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-top: 5px; color: #333; }
            .message-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #FF9B04; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Project Request</h2>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Project Type:</div>
                <div class="value">${escapeHtml(projectType)}</div>
              </div>
              <div class="field">
                <div class="label">Company Name:</div>
                <div class="value">${escapeHtml(companyName)}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></div>
              </div>
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
              </div>
              ${attachment ? `<div class="field"><div class="label">Attachment:</div><div class="value">File attached (${escapeHtml(attachment.name)})</div></div>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
New Project Request

Project Type: ${projectType}
Company Name: ${companyName}
Email: ${email}

Message:
${message}

${attachment ? `Attachment: ${attachment.name}` : ''}
    `;

    // Prepare confirmation email for the sender
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.6; 
              color: #000; 
              background: #fff;
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 40px 20px; 
            }
            h1 {
              font-size: 24px;
              font-weight: 600;
              margin: 0 0 20px 0;
              color: #000;
            }
            p {
              margin: 0 0 16px 0;
              color: #000;
            }
            .summary {
              margin: 24px 0;
              padding: 0;
            }
            .summary-title {
              font-weight: 600;
              margin-bottom: 12px;
              color: #000;
            }
            ul {
              margin: 0;
              padding-left: 20px;
              color: #000;
            }
            li {
              margin-bottom: 8px;
            }
            a {
              color: #000;
              text-decoration: underline;
            }
            .signature {
              margin-top: 32px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Thank you — your request is in.</h1>
            
            <p>Hi ${escapeHtml(companyName)},</p>
            
            <p>We've received your project request and added it to our queue.</p>
            
            <p>Our team will review the details and get back to you within 24–48 hours to plan the next steps.</p>
            
            <div class="summary">
              <p class="summary-title">Request summary</p>
              <ul>
                <li>Project Type: ${escapeHtml(projectType)}</li>
                <li>Company: ${escapeHtml(companyName)}</li>
              </ul>
            </div>
            
            <p>If something is time-sensitive or you want to share extra context, you can always reach us directly at <a href="mailto:my@addicted.design">my@addicted.design</a>.</p>
            
            <div class="signature">
              <p>Best,</p>
              <p>addicted</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const confirmationText = `
Thank you — your request is in.

Hi ${companyName},

We've received your project request and added it to our queue.

Our team will review the details and get back to you within 24–48 hours to plan the next steps.

Request summary
- Project Type: ${projectType}
- Company: ${companyName}

If something is time-sensitive or you want to share extra context, you can always reach us directly at my@addicted.design.

Best,

addicted
    `;

    // Send two emails: one to you, one confirmation to the sender
    const [adminEmail, confirmationEmail] = await Promise.all([
      // Email to you (Proton)
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Addicted Studio <noreply@Addicted.design>',
        to: process.env.PROTON_EMAIL || 'my@addicted.design',
        replyTo: email,
        subject: `New Project Request from ${companyName}`,
        html: emailHtml,
        text: emailText,
        ...(attachment && attachment.data && {
          attachments: [
            {
              filename: attachment.name || 'attachment',
              content: Buffer.from(attachment.data, 'base64'),
            },
          ],
        }),
      }),
      // Confirmation email to sender
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Addicted Studio <noreply@Addicted.design>',
        to: email,
        subject: 'Thank you for your project request - Addicted Studio',
        html: confirmationHtml,
        text: confirmationText,
      }),
    ]);

    // Check for errors
    if (adminEmail.error) {
      console.error('Resend error (admin email):', adminEmail.error);
      return res.status(500).json({ error: 'Failed to send email', details: adminEmail.error.message });
    }

    if (confirmationEmail.error) {
      console.error('Resend error (confirmation email):', confirmationEmail.error);
      // Don't fail the request if confirmation email fails, but log it
      console.warn('Confirmation email failed, but admin email was sent successfully');
    }

    return res.status(200).json({ 
      success: true, 
      messageId: adminEmail.data?.id,
      confirmationSent: !confirmationEmail.error 
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

