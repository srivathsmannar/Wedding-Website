require('dotenv').config();

const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
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
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/rsvp', async (req, res) => {
  const { name, email, phone, muhurtham, muhurthamGuests, notes } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await pool.query(
      `INSERT INTO rsvps (name, email, phone, muhurtham, muhurtham_guests, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        name.trim(),
        email.trim(),
        (phone || '').trim(),
        !!muhurtham,
        muhurtham ? (parseInt(muhurthamGuests) || 1) : 0,
        (notes || '').trim(),
      ]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save RSVP. Please try again.' });
  }
});

app.get('/api/admin/rsvps', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rsvps ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch RSVPs.' });
  }
});

app.get('/api/admin/export', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rsvps ORDER BY id DESC');
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Attending Muhurtham', 'Muhurtham Guests', 'Notes', 'Submitted At'];
    const csv = [
      headers.map(esc).join(','),
      ...rows.map((r) => [
        r.id, r.name, r.email, r.phone,
        r.muhurtham ? 'Yes' : 'No', r.muhurtham_guests,
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
          product_data: { name: `${fund} — Srivaths & Sulakshana` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${base}/?payment=success&fund=${encodeURIComponent(fund)}`,
      cancel_url:  `${base}/#registry`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

initDb()
  .then(() => {
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`\n  Wedding website  →  http://localhost:${PORT}`);
        console.log(`  Admin dashboard  →  http://localhost:${PORT}/admin.html\n`);
      });
    }
  })
  .catch(console.error);

module.exports = app;
