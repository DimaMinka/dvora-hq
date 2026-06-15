import express from 'express';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { formatLoadoutForAIPrompt } from '../../shared/loadout-utils.js';
import { generateAndSaveAvatar } from '../services/avatar.js';

const router = express.Router();

// 5. Get current profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDoc.data();

    // Fetch squad alarm status
    const alarmDoc = await db.collection('commander_reports').doc(user.squad_id).get();
    user.alarm_active = alarmDoc.exists ? Boolean(alarmDoc.data().alarm_active) : false;

    // Fetch user readiness status
    const readinessDoc = await db.collection('readiness_status').doc(req.user.userId).get();
    user.readiness = readinessDoc.exists ? readinessDoc.data() : null;
    user.id = user.pin_code;

    res.json(user);
  } catch (err) {
    console.error('[API] Profile error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5.5 Onboarding (Fighter loadout selection & AI avatar generation)
router.post('/onboarding', authenticateToken, async (req, res) => {
  const { specialization, weaponry, gear, optics, accessories, meds, gender } = req.body;

  if (!specialization || !weaponry || !gear) {
    return res.status(400).json({ error: 'specialization, weaponry, and gear are required' });
  }

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(req.user.userId);

    const updateData = {
      specialization,
      weaponry,
      gear,
    };
    if (optics !== undefined) updateData.optics = optics;
    if (accessories !== undefined) updateData.accessories = accessories;
    if (meds !== undefined) updateData.meds = meds;
    if (gender !== undefined) updateData.gender = gender;

    // Save selections
    await userRef.update(updateData);

    // AI Avatar generation
    const formattedSpecData = formatLoadoutForAIPrompt({
      specialization,
      weaponry,
      optics,
      accessories,
      gear,
      meds,
      gender,
    });
    await generateAndSaveAvatar(userRef, req.user.userId, formattedSpecData);

    // Fetch complete updated user profile to return
    const userDoc = await userRef.get();
    const fullUserData = userDoc.data();

    // Fetch squad alarm status
    const alarmDoc = await db.collection('commander_reports').doc(fullUserData.squad_id).get();
    fullUserData.alarm_active = alarmDoc.exists ? Boolean(alarmDoc.data().alarm_active) : false;
    fullUserData.id = fullUserData.pin_code;
    fullUserData.readiness = null;

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: fullUserData,
    });
  } catch (err) {
    console.error('[API] Onboarding error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Update Readiness (Fighter)
router.post('/readiness', authenticateToken, async (req, res) => {
  const {
    weapons_ready,
    transport_ready,
    comms_ready,
    meds_ready,
    gear_ready,
    note,
    weapon_status,
    meds_status,
    gear_status,
  } = req.body;

  try {
    const db = getDb();
    await db
      .collection('readiness_status')
      .doc(req.user.userId)
      .set({
        weapons_ready: Number(weapons_ready),
        transport_ready: Number(transport_ready || 0),
        comms_ready: Number(comms_ready),
        meds_ready: Number(meds_ready),
        gear_ready: Number(gear_ready || 0),
        note: note || '',
        weapon_status: weapon_status || null,
        meds_status: meds_status || null,
        gear_status: gear_status || null,
        updated_at: new Date().toISOString(),
      });

    res.json({ success: true, message: 'Readiness status updated' });
  } catch (err) {
    console.error('[API] Update readiness error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
