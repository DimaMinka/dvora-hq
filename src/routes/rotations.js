import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

function Router() {
  return express.Router();
}

// Helper: Format date to ISO YYYY-MM-DD
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Get Sunday of a week
function getSunday(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day;
  const sunday = new Date(tempDate.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

// GET /api/rotations
router.get('/', authenticateToken, async (req, res) => {
  let { from, to } = req.query;

  // Default parameters: today - 7 days to today + 30 days
  if (!from) {
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 365);
    from = formatDateISO(defaultFrom);
  }
  if (!to) {
    const defaultTo = new Date();
    defaultTo.setDate(defaultTo.getDate() + 90);
    to = formatDateISO(defaultTo);
  }

  try {
    const db = getDb();
    const snapshot = await db
      .collection('rotations')
      .where('start_date', '>=', from)
      .where('start_date', '<=', to)
      .get();

    const rotations = [];
    snapshot.forEach((doc) => {
      rotations.push(doc.data());
    });

    // Sort by start_date ascending
    rotations.sort((a, b) => a.start_date.localeCompare(b.start_date));

    res.json(rotations);
  } catch (err) {
    console.error('[API] Get rotations error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/rotations/current
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const today = new Date();
    const todayStr = formatDateISO(today);

    const snapshot = await db
      .collection('rotations')
      .where('start_date', '<=', todayStr)
      .orderBy('start_date', 'desc')
      .limit(3)
      .get();

    let currentRotation = null;
    snapshot.forEach((doc) => {
      if (currentRotation) return;
      const r = doc.data();
      const start = r.actual_start_date || r.start_date;
      const end = r.actual_end_date || r.end_date;
      if (todayStr >= start && todayStr <= end) {
        currentRotation = r;
      }
    });

    if (!currentRotation) {
      const sunday = getSunday(today);
      const docId = formatDateISO(sunday);
      const doc = await db.collection('rotations').doc(docId).get();
      if (doc.exists) {
        currentRotation = doc.data();
      }
    }

    res.json(currentRotation || null);
  } catch (err) {
    console.error('[API] Get current rotation error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
