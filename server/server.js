const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const rateLimit = require('express-rate-limit');
const store = require('./lib/store');
const { sendContactEmail } = require('./lib/mailer');

const app = express();
const PORT = process.env.PORT || 8791;
const ROOT_DIR = path.join(__dirname, '..');

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// ---------- Helpers ----------
// Strips control characters (but keeps \n and \t) without embedding any
// literal control bytes in this source file.
var CONTROL_CHARS = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(8) +
  String.fromCharCode(11) + String.fromCharCode(12) +
  String.fromCharCode(14) + '-' + String.fromCharCode(31) + ']',
  'g'
);

function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, max);
}
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Applies to the public write endpoints only — reading the guestbook or
// hit count is unlimited, submitting to them is throttled per IP.
const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests — please try again in a bit.' },
});

// ---------- API: shared hit counter ----------
app.post('/api/hits', (req, res) => {
  res.json({ count: store.incrementHits() });
});
app.get('/api/hits', (req, res) => {
  res.json({ count: store.getHits() });
});

// ---------- API: shared guestbook ----------
app.get('/api/guestbook', (req, res) => {
  res.json({ entries: store.getGuestbookEntries().slice().reverse() });
});

app.post('/api/guestbook', postLimiter, (req, res) => {
  const body = req.body || {};
  if (body.hp) return res.status(400).json({ ok: false, error: 'Rejected.' }); // honeypot field

  const name = clean(body.name, 60);
  const message = clean(body.message, 280);
  if (!name || !message) {
    return res.status(400).json({ ok: false, error: 'Name and message are required.' });
  }

  const entries = store.addGuestbookEntry({ name, message, time: new Date().toISOString() });
  res.status(201).json({ ok: true, entries: entries.slice().reverse() });
});

// ---------- API: contact form (real email delivery) ----------
app.post('/api/contact', postLimiter, async (req, res) => {
  const body = req.body || {};
  if (body.hp) return res.status(400).json({ ok: false, error: 'Rejected.' }); // honeypot field

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const message = clean(body.message, 4000);

  if (!name || !email || !message || !isEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Please fill in a valid name, email, and message.' });
  }

  try {
    const result = await sendContactEmail({ name, email, message });
    res.json({ ok: true, dryRun: !!result.dryRun });
  } catch (err) {
    console.error('[contact] send failed:', err.message);
    res.status(502).json({ ok: false, error: 'Message could not be sent right now — please try again later.' });
  }
});

// ---------- Static site ----------
// extensions:['html'] lets a stray extensionless request (e.g. a cached
// redirect from an old dev server, or a manually typed /guestbook) still
// resolve — real links in the site always use the explicit .html path.
app.use(express.static(ROOT_DIR, { extensions: ['html'] }));

// Anything unmatched (including bad routes under /api/*) gets the retro 404 page / JSON.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, error: 'Not found.' });
  }
  res.status(404).sendFile(path.join(ROOT_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`Portfolio server running at http://localhost:${PORT}`);
});
