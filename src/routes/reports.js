import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { getWeekRange, formatDateISO } from '../bot/helpers.js';

const router = express.Router();

router.get('/current', authenticateToken, async (req, res) => {
  const db = getDb();
  const userId = req.user.userId;
  const role = req.user.role;
  const squadId = req.user.squadId;

  try {
    // 1. Fetch user doc to check can_report permission
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(403).json({ error: 'Operator not found in database.' });
    }

    const userData = userDoc.data();
    const isAuthorized = role === 'commander' || role === 'admin' || userData.can_report === true;

    if (!isAuthorized) {
      return res
        .status(403)
        .json({ error: 'Access denied: operator lacks report view signature.' });
    }

    // 2. Fetch current week's report
    const weekStartDate = formatDateISO(getWeekRange(new Date()).monday);
    const docId = `${squadId.toUpperCase()}_${weekStartDate}`;

    const reportDoc = await db.collection('reports').doc(docId).get();
    if (!reportDoc.exists) {
      return res.json({ found: false });
    }

    res.json({ found: true, report: reportDoc.data() });
  } catch (err) {
    console.error('[API] Fetch report error:', err.message);
    res.status(500).json({ error: 'Internal database query failure.' });
  }
});

export default router;
