import nodemailer from 'nodemailer';

/**
 * Mailer service for sending notification alerts.
 * Uses Ethereal Email (mock SMTP) for development/testing.
 */
class MailerService {
  constructor() {
    this.transporter = null;
    this.testAccount = null;
  }

  async init() {
    if (this.transporter) return;

    // Create test account for Ethereal Email
    this.testAccount = await nodemailer.createTestAccount();

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.testAccount.user,
        pass: this.testAccount.pass,
      },
    });

    console.log('--- Mailer Service Initialized ---');
    console.log(`Test account: ${this.testAccount.user}`);
  }

  async sendNotificationEmail(to, subject, text, html) {
    await this.init();

    const info = await this.transporter.sendMail({
      from: '"Subly Alerts" <alerts@subly.app>',
      to: to || 'user@example.com', // fallback for testing
      subject: subject,
      text: text,
      html: html,
    });

    console.log(`Message sent: ${info.messageId}`);
    console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    return info;
  }
}

const mailer = new MailerService();
export default mailer;
