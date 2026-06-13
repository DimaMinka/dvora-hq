import express from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { setupDatabase, getDb } from './db.js';
import { startBot } from './bot.js';

const app = express();

// Initialize Google Gen AI SDK if key is configured
const ai =
  config.aiApiKey && config.aiApiKey !== 'your_api_key'
    ? new GoogleGenAI({ apiKey: config.aiApiKey })
    : null;

if (!ai) {
  console.log('[System] Gemini API Key not configured. AI avatar generation disabled.');
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Basic CORS middleware (highly restricted for production, local allowed for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.status(200).json({});
  }
  next();
});
app.use(express.json());

// Initialize Database connection and run setup
setupDatabase()
  .then(() => {
    console.log('[System] Database initialization complete.');
    startBot();
  })
  .catch((err) => {
    console.error('[System] Database initialization failed:', err.message);
  });

// Authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Check if token is revoked
    const db = getDb();
    const revokedDoc = await db.collection('revoked_tokens').doc(decoded.jti).get();
    if (revokedDoc.exists) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// REST APIs

// 1. Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 2. Register (Invoked by Telegram Bot CLI or admin scripts)
app.post('/api/auth/register', async (req, res) => {
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
app.post('/api/auth/login', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'pin is required' });
  }

  try {
    const db = getDb();
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
        callsign: user.callsign || null,
        specialization: user.specialization || null,
        weaponry: user.weaponry || null,
        gear: user.gear || null,
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
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
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

// 5. Get current profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
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
app.post('/api/user/onboarding', authenticateToken, async (req, res) => {
  const { specialization, weaponry, gear } = req.body;

  if (!specialization || !weaponry || !gear) {
    return res.status(400).json({ error: 'specialization, weaponry, and gear are required' });
  }

  try {
    const db = getDb();
    const userRef = db.collection('users').doc(req.user.userId);

    // Save selections
    await userRef.update({
      specialization,
      weaponry,
      gear,
    });

    let avatarUrl = null;
    if (ai) {
      try {
        console.log(`[API] Generating AI avatar for user ${req.user.userId}...`);
        const prompt = `Ultra-realistic 3D render, photorealistic textures, diffuse soft overcast daylight. A high-fidelity tactical modern military special operations soldier avatar.
Role/Specialization: ${specialization}.
Primary weapon: ${weaponry} (highly customized, tan collapsible stock, extended M-LOK handguard, ACOG magnified optic, suppressor).
Gear & Loadout: ${gear} (Ranger Green plate carrier, Ops-Core style high-cut tactical helmet with Wilcox-style NVG shroud, balaclava face mask, blue/white Israeli flag patch on right shoulder, low-profile belt rig).
Pose: Tactically standing on a rocky hill looking forward. Background: Distant damaged village on a hillside. Professional studio quality game asset.`;
        const aiResponse = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });

        if (aiResponse?.generatedImages?.[0]?.image?.imageBytes) {
          const base64Bytes = aiResponse.generatedImages[0].image.imageBytes;
          avatarUrl = `data:image/jpeg;base64,${base64Bytes}`;
          await userRef.update({
            avatar_url: avatarUrl,
          });
          console.log(
            `[API] AI avatar successfully generated and saved for user ${req.user.userId}`
          );
        }
      } catch (aiErr) {
        console.error('[API] AI Avatar generation failed:', aiErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: {
        id: req.user.userId,
        phone_number: req.user.phoneNumber,
        role: req.user.role,
        squad_id: req.user.squadId,
        callsign: req.user.callsign || null,
        specialization,
        weaponry,
        gear,
        avatar_url: avatarUrl,
        alarm_active: false,
        readiness: null,
      },
    });
  } catch (err) {
    console.error('[API] Onboarding error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Update Readiness (Fighter)
app.post('/api/user/readiness', authenticateToken, async (req, res) => {
  const { weapons_ready, transport_ready, comms_ready, meds_ready, note } = req.body;

  try {
    const db = getDb();
    await db
      .collection('readiness_status')
      .doc(req.user.userId)
      .set({
        weapons_ready: Number(weapons_ready),
        transport_ready: Number(transport_ready),
        comms_ready: Number(comms_ready),
        meds_ready: Number(meds_ready),
        note: note || '',
        updated_at: new Date().toISOString(),
      });

    res.json({ success: true, message: 'Readiness status updated' });
  } catch (err) {
    console.error('[API] Update readiness error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 7. Get Squad Status (Commander)
app.get('/api/squad/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'commander') {
    return res.status(403).json({ error: 'Access forbidden: Commander role required' });
  }

  try {
    const db = getDb();
    const usersSnapshot = await db
      .collection('users')
      .where('squad_id', '==', req.user.squadId)
      .where('role', '==', 'fighter')
      .get();

    const rows = [];
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const readinessDoc = await db.collection('readiness_status').doc(userDoc.id).get();
      const readiness = readinessDoc.exists ? readinessDoc.data() : {};
      rows.push({
        id: userDoc.id,
        phone_number: userData.phone_number || null,
        role: userData.role,
        squad_id: userData.squad_id,
        avatar_url: userData.avatar_url || null,
        weapons_ready: readiness.weapons_ready || 0,
        transport_ready: readiness.transport_ready || 0,
        comms_ready: readiness.comms_ready || 0,
        meds_ready: readiness.meds_ready || 0,
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
app.post('/api/squad/alarm', authenticateToken, async (req, res) => {
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

    res.json({ success: true, alarm_active, message: `Squad alarm set to ${alarm_active}` });
  } catch (err) {
    console.error('[API] Squad alarm error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Express Server
const port = config.port;
app.listen(port, () => {
  console.log(`[Server] Live on port ${port} in ${config.env} environment`);
});
