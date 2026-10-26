require('dotenv').config();

const express = require('express');
const path = require('path');
const { Client } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 4000,
  query_timeout: 4000,
};

// Use a fresh connection per query instead of a pool. On Vercel the function is
// frozen between requests, so pooled sockets go stale (the DB closes them while
// the idle timer can't run) and the next query hangs until the function is killed.
async function query(text, params) {
  const client = new Client(dbConfig);
  client.on('error', (err) => console.error('pg client error:', err.message));
  try {
    await client.connect();
    return await client.query(text, params);
  } finally {
    client.end().catch(() => {});
  }
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id               SERIAL PRIMARY KEY,
      name             TEXT NOT NULL,
      email            TEXT NOT NULL,
      phone            TEXT DEFAULT '',
      muhurtham        BOOLEAN DEFAULT FALSE,
      muhurtham_guests INTEGER DEFAULT 0,
      notes            TEXT DEFAULT '',
      submitted_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    ALTER TABLE rsvps
      ADD COLUMN IF NOT EXISTS event            TEXT DEFAULT 'wedding',
      ADD COLUMN IF NOT EXISTS reception        BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS reception_guests INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS submission_id    TEXT
  `);
  await query('CREATE UNIQUE INDEX IF NOT EXISTS rsvps_submission_id_key ON rsvps (submission_id)');
}

// Schema setup is kept off the request path (ALTER TABLE takes a lock and adds
// round-trips on every cold start). It only runs if an insert hits a missing
// table/column.
const SCHEMA_ERRORS = new Set(['42P01', '42703', '42P10']);

// Retry transient failures, but stay well inside the function's time limit so
// the browser gets a real response and can retry itself.
async function withRetry(fn, { attempts = 3, budgetMs = 5000 } = {}) {
  const start = Date.now();
  let migrated = false;
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (SCHEMA_ERRORS.has(err.code) && !migrated) {
        migrated = true;
        await initDb();
      } else if (i >= attempts || Date.now() - start > budgetMs) {
        throw err;
      } else {
        console.error(`DB attempt ${i} failed, retrying:`, err.message);
        await new Promise((r) => setTimeout(r, 300 * i));
      }
    }
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.post('/api/rsvp', async (req, res) => {
  const { name, email, phone, muhurtham, muhurthamGuests, reception, receptionGuests, notes, submissionId } = req.body;
  const event = req.body.event === 'reception' ? 'reception' : 'wedding';

  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });

  try {
    // submissionId makes retries and resubmits idempotent: a repeat of an
    // insert that already succeeded is a no-op instead of a duplicate row.
    const result = await withRetry(() => query(
      `INSERT INTO rsvps (name, email, phone, event, muhurtham, muhurtham_guests, reception, reception_guests, notes, submission_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (submission_id) DO NOTHING RETURNING id`,
      [
        name.trim(),
        (email || '').trim(),
        (phone || '').trim(),
        event,
        !!muhurtham,
        muhurtham ? (parseInt(muhurthamGuests) || 1) : 0,
        !!reception,
        reception ? (parseInt(receptionGuests) || 1) : 0,
        (notes || '').trim(),
        typeof submissionId === 'string' && submissionId ? submissionId.slice(0, 64) : null,
      ]
    ));
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save RSVP. Please try again.' });
  }
});

app.get('/api/admin/rsvps', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM rsvps ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch RSVPs.' });
  }
});

app.get('/api/admin/export', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM rsvps ORDER BY id DESC');
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Event', 'Attending Muhurtham', 'Muhurtham Guests', 'Attending Reception', 'Reception Guests', 'Notes', 'Submitted At'];
    const csv = [
      headers.map(esc).join(','),
      ...rows.map((r) => [
        r.id, r.name, r.email, r.phone, r.event,
        r.event === 'reception' ? '' : (r.muhurtham ? 'Yes' : 'No'), r.muhurtham_guests,
        r.event === 'reception' ? (r.reception ? 'Yes' : 'No') : '', r.reception_guests,
        r.notes, r.submitted_at,
      ].map(esc).join(',')),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="srivaths-sulakshana-rsvps-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export RSVPs.' });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { fund, amount } = req.body;
  const returnTo = req.body.returnTo === '/' ? '/' : '/wedding';
  const amountCents = Math.round(parseFloat(amount) * 100);

  if (!fund || !amountCents || amountCents < 100) {
    return res.status(400).json({ error: 'Invalid amount.' });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const base = `${protocol}://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${fund} — Sulakshana & Srivaths` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${base}${returnTo}?payment=success&fund=${encodeURIComponent(fund)}`,
      cancel_url:  `${base}${returnTo}#registry`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message, err.type, err.code);
    res.status(500).json({ error: err.message || 'Failed to create checkout session.' });
  }
});

if (!process.env.VERCEL) {
  initDb().catch(console.error);
  app.listen(PORT, () => {
    console.log(`\n  Wedding website  →  http://localhost:${PORT}`);
    console.log(`  Admin dashboard  →  http://localhost:${PORT}/admin.html\n`);
  });
}

module.exports = app;
