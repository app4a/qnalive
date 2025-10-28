/**
 * Email Configuration and Utilities
 * 
 * Easily switch between development (console) and production (Resend) modes
 */

import { Resend } from 'resend'

// Email configuration
const EMAIL_CONFIG = {
  // Set to 'console' for development, 'resend' for production
  // Can be controlled via environment variable
  mode: (process.env.EMAIL_MODE || process.env.NODE_ENV === 'production' ? 'resend' : 'console') as 'console' | 'resend',
  
  // Email settings
  from: process.env.EMAIL_FROM || 'QnALive <noreply@qnalive.com>',
  replyTo: process.env.EMAIL_REPLY_TO,
}

// Initialize Resend client (only if API key exists)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Send an email using configured method (console or Resend)
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  // Development mode: log to console
  if (EMAIL_CONFIG.mode === 'console') {
    console.log('\n=== EMAIL (Development Mode) ===')
    console.log(`From: ${EMAIL_CONFIG.from}`)
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('---')
    console.log(html)
    console.log('================================\n')
    return { success: true, mode: 'console' }
  }

  // Production mode: send via Resend
  if (EMAIL_CONFIG.mode === 'resend') {
    if (!resend) {
      throw new Error('Resend API key not configured. Set RESEND_API_KEY in environment variables.')
    }

    try {
      const result = await resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject,
        html,
        text: text || stripHtml(html),
        ...(EMAIL_CONFIG.replyTo && { replyTo: EMAIL_CONFIG.replyTo }),
      })

      return { success: true, mode: 'resend', messageId: result.data?.id }
    } catch (error) {
      console.error('Failed to send email via Resend:', error)
      throw new Error('Failed to send email')
    }
  }

  throw new Error(`Invalid email mode: ${EMAIL_CONFIG.mode}`)
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #333; font-size: 28px;">Reset Your Password</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 20px 0; color: #666; font-size: 16px; line-height: 24px;">
                      We received a request to reset your password for your QnALive account.
                    </p>
                    <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 24px;">
                      Click the button below to reset your password:
                    </p>
                    
                    <!-- Button -->
                    <table role="presentation" style="margin: 0 auto;">
                      <tr>
                        <td style="border-radius: 6px; background-color: #2563eb;">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 20px 0; color: #666; font-size: 14px; line-height: 20px;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 20px 0; color: #2563eb; font-size: 14px; word-break: break-all;">
                      ${resetUrl}
                    </p>
                    
                    <p style="margin: 20px 0 0 0; color: #999; font-size: 14px; line-height: 20px;">
                      <strong>This link will expire in 1 hour.</strong>
                    </p>
                    <p style="margin: 10px 0 0 0; color: #999; font-size: 14px; line-height: 20px;">
                      If you didn't request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #999; font-size: 12px;">
                      © ${new Date().getFullYear()} QnALive. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const text = `
Reset Your Password

We received a request to reset your password for your QnALive account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} QnALive. All rights reserved.
  `.trim()

  return sendEmail({
    to: email,
    subject: 'Reset your QnALive password',
    html,
    text,
  })
}

/**
 * Strip HTML tags from a string (simple implementation)
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get current email configuration
 */
export function getEmailConfig() {
  return {
    mode: EMAIL_CONFIG.mode,
    from: EMAIL_CONFIG.from,
    hasApiKey: !!process.env.RESEND_API_KEY,
  }
}

