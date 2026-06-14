import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

function Router() {
  return express.Router();
}

// 7. Get Squad Status (Commander)
router.get('/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'commander') {
    return res.status(403).json({ error: 'Access forbidden: Commander role required' });
  }

  try {
    const db = getDb();
    const usersSnapshot = await db
      .collection('users')
      .where('squad_id', '==', req.user.squadId)
      .get();

    const rows = [];
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.role === 'commander') {
        continue;
      }
      const readinessDoc = await db.collection('readiness_status').doc(userDoc.id).get();
      const readiness = readinessDoc.exists ? readinessDoc.data() : {};
      rows.push({
        id: userDoc.id,
        phone_number: userData.phone_number || null,
        role: userData.role,
        squad_id: userData.squad_id,
        avatar_url: userData.avatar_url || null,
        tg_username: userData.tg_username || null,
        specialization: userData.specialization || null,
        weaponry: userData.weaponry || null,
        gear: userData.gear || null,
        optics: userData.optics || null,
        accessories: userData.accessories || null,
        meds: userData.meds || null,
        weapons_ready: readiness.weapons_ready || 0,
        transport_ready: readiness.transport_ready || 0,
        comms_ready: readiness.comms_ready || 0,
        meds_ready: readiness.meds_ready || 0,
        gear_ready: readiness.gear_ready || 0,
        weapon_status: readiness.weapon_status || null,
        meds_status: readiness.meds_status || null,
        gear_status: readiness.gear_status || null,
        note: readiness.note || null,
        updated_at: readiness.updated_at || null,
      });
    }

    res.json(rows);
  } catch (err) {
    console.error('[API] Get squad status error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Toggle Squad Alarm (Commander)
router.post('/alarm', authenticateToken, async (req, res) => {
  if (req.user.role !== 'commander') {
    return res.status(403).json({ error: 'Access forbidden: Commander role required' });
  }

  const { alarm_active } = req.body;

  if (typeof alarm_active !== 'boolean') {
    return res.status(400).json({ error: 'alarm_active boolean is required' });
  }

  try {
    const db = getDb();
    await db.collection('commander_reports').doc(req.user.squadId).set({
      user_id: req.user.userId,
      squad_id: req.user.squadId,
      alarm_active,
      updated_at: new Date().toISOString(),
    });

    if (!alarm_active) {
      const usersSnapshot = await db
        .collection('users')
        .where('squad_id', '==', req.user.squadId)
        .get();

      const batch = db.batch();
      for (const userDoc of usersSnapshot.docs) {
        const readinessRef = db.collection('readiness_status').doc(userDoc.id);
        batch.set(readinessRef, {
          weapons_ready: 0,
          transport_ready: 0,
          comms_ready: 0,
          meds_ready: 0,
          gear_ready: 0,
          weapon_status: {},
          meds_status: {},
          gear_status: {},
          note: '',
          updated_at: new Date().toISOString(),
        });
      }
      await batch.commit();
    }

    res.json({ success: true, alarm_active, message: `Squad alarm set to ${alarm_active}` });
  } catch (err) {
    console.error('[API] Squad alarm error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
