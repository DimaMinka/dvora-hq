import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 1. Healthcheck
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 2. Register (Invoked by Telegram Bot CLI or admin scripts)
router.post('/register', async (req, res) => {
  const { phone_number, pin, role, squad_id } = req.body;

  if (!pin || !role || !squad_id) {
    return res.status(400).json({ error: 'pin, role, and squad_id are required' });
  }

  try {
    const pinHash = await argon2.hash(pin, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const db = getDb();
    await db
      .collection('users')
      // TODO: [Security] Migrate to UUID as document ID, move PIN to document field
      // Current pattern leaks PIN structure via Firestore document enumeration.
      // Migration script required before changing this.
      .doc(pin)
      .set({
        phone_number: phone_number || null,
        pin_hash: pinHash,
        pin_code: pin,
        role,
        squad_id,
        created_at: new Date().toISOString(),
      });

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('[API] Register error:', err.message);
    res.status(500).json({ error: 'Database operations failed' });
  }
});

// 3. Login
router.post('/login', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'pin is required' });
  }

  try {
    const db = getDb();
    // TODO: [Security] Migrate to UUID as document ID, move PIN to dedicated field.
    // Current pattern leaks PIN structure via Firestore document enumeration.
    // Migration script required before changing this.
    const userDoc = await db.collection('users').doc(pin).get();

    if (!userDoc.exists) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userDoc.data();
    const isPinValid = await argon2.verify(user.pin_hash, pin);

    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const token = jwt.sign(
      {
        userId: user.pin_code,
        phoneNumber: user.phone_number || null,
        role: user.role,
        squadId: user.squad_id,
        tgUsername: user.tg_username || null,
        jti,
      },
      config.jwtSecret,
      { expiresIn: '2h' }
    );

    // Fetch squad alarm status
    const alarmDoc = await db.collection('commander_reports').doc(user.squad_id).get();
    const alarmActive = alarmDoc.exists ? Boolean(alarmDoc.data().alarm_active) : false;

    // Fetch user readiness status
    const readinessDoc = await db.collection('readiness_status').doc(user.pin_code).get();
    const readiness = readinessDoc.exists ? readinessDoc.data() : null;

    res.json({
      token,
      user: {
        id: user.pin_code,
        phone_number: user.phone_number,
        role: user.role,
        squad_id: user.squad_id,
        tg_username: user.tg_username || null,
        specialization: user.specialization || null,
        weaponry: user.weaponry || null,
        gear: user.gear || null,
        optics: user.optics || null,
        accessories: user.accessories || null,
        meds: user.meds || null,
        avatar_url: user.avatar_url || null,
        alarm_active: alarmActive,
        readiness,
      },
    });
  } catch (err) {
    console.error('[API] Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const expiresAt = new Date(req.user.exp * 1000).toISOString();

    await db.collection('revoked_tokens').doc(req.user.jti).set({
      expires_at: expiresAt,
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[API] Logout error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
