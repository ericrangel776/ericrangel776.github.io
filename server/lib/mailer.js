// Sends the contact-form email via SMTP (nodemailer). If SMTP credentials
// aren't configured (no .env yet), falls back to logging the message to
// the console instead of throwing — lets the whole flow be developed and
// tested locally before real credentials exist.
const nodemailer = require('nodemailer');

function createTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const transporter = createTransport();

async function sendContactEmail({ name, email, message }) {
  const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
  const subject = `Portfolio contact form — ${name}`;
  const text = `From: ${name} <${email}>\n\n${message}`;

  if (!transporter) {
    console.log('[mailer] DRY RUN — SMTP not configured (see server/.env.example). Would have sent:');
    console.log(`  To:      ${to || '(CONTACT_TO_EMAIL not set)'}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${text}`);
    return { dryRun: true };
  }

  await transporter.sendMail({
    from: `"Portfolio Contact Form" <${process.env.SMTP_USER}>`,
    replyTo: `"${name}" <${email}>`,
    to,
    subject,
    text,
  });
  return { dryRun: false };
}

module.exports = { sendContactEmail };
