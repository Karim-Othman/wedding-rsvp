const express = require('express');
const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database setup ────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rsvp.db');
const db = sqlite3(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    attending   TEXT    NOT NULL CHECK(attending IN ('yes','no')),
    guests      INTEGER NOT NULL DEFAULT 1,
    message     TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── RSVP Submission ──────────────────────────────────────────────────────────
app.post('/api/rsvp', (req, res) => {
  const { name, attending, guests, message } = req.body;

  if (!name || !attending) {
    return res.status(400).json({ error: 'Name and attendance are required.' });
  }
  if (!['yes', 'no'].includes(attending)) {
    return res.status(400).json({ error: 'Invalid attendance value.' });
  }
  const guestCount = parseInt(guests) || 1;
  if (guestCount < 1 || guestCount > 20) {
    return res.status(400).json({ error: 'Guests must be between 1 and 20.' });
  }

  try {
    db.prepare(`
      INSERT INTO rsvps (name, attending, guests, message)
      VALUES (?, ?, ?, ?)
    `).run(name, attending, guestCount, message || null);

    res.json({ success: true, updated: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── Admin endpoint (basic protection via env token) ──────────────────────────
app.get('/api/admin/rsvps', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const rows = db.prepare('SELECT * FROM rsvps ORDER BY created_at DESC').all();
  const summary = {
    total: rows.length,
    attending: rows.filter(r => r.attending === 'yes').reduce((s, r) => s + r.guests, 0),
    declined: rows.filter(r => r.attending === 'no').length,
  };
  res.json({ summary, rsvps: rows });
});


// ── Delete RSVP ──────────────────────────────────────────────────────────────
app.delete('/api/admin/rsvps/:id', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { id } = req.params;
  const result = db.prepare('DELETE FROM rsvps WHERE id = ?').run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Entry not found' });
  }
  res.json({ success: true, deleted: id });
});

// ── Serve frontend ────────────────────────────────────────────────────────────
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🌸 Wedding RSVP server running on port ${PORT}`));
