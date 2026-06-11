import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';
import { setupDatabase, getDbPool } from './db.js';
import { startBot } from './bot.js';

const app = express();
const ai = config.aiApiKey ? new GoogleGenAI({ apiKey: config.aiApiKey }) : null;
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
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
    const pool = await getDbPool();
    const [revoked] = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = ?', [decoded.jti]);
    if (revoked.length > 0) {
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

  if (!phone_number || !pin || !role || !squad_id) {
    return res.status(400).json({ error: 'phone_number, pin, role, and squad_id are required' });
  }

  try {
    const pinHash = await argon2.hash(pin, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    const pool = await getDbPool();
    await pool.query(
      'INSERT INTO users (phone_number, pin_hash, role, squad_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE pin_hash = ?, role = ?, squad_id = ?',
      [phone_number, pinHash, role, squad_id, pinHash, role, squad_id]
    );

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error('[API] Register error:', err.message);
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

// 3. Login
app.post('/api/auth/login', async (req, res) => {
  const { phone_number, pin } = req.body;

  if (!phone_number || !pin) {
    return res.status(400).json({ error: 'phone_number and pin are required' });
  }

  try {
    const pool = await getDbPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE phone_number = ?', [phone_number]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const isPinValid = await argon2.verify(user.pin_hash, pin);

    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jti = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const token = jwt.sign(
      {
        userId: user.id,
        phoneNumber: user.phone_number,
        role: user.role,
        squadId: user.squad_id,
        jti,
      },
      config.jwtSecret,
      { expiresIn: '2h' } // 2 hours expiration as per lockscreen requirement
    );

    // Fetch additional fields for full user state
    const [alarmRows] = await pool.query(
      'SELECT alarm_active FROM commander_reports WHERE squad_id = ? ORDER BY updated_at DESC LIMIT 1',
      [user.squad_id]
    );
    const alarmActive = alarmRows.length > 0 ? Boolean(alarmRows[0].alarm_active) : false;

    const [readinessRows] = await pool.query(
      'SELECT weapons_ready, transport_ready, comms_ready, meds_ready, note FROM readiness_status WHERE user_id = ?',
      [user.id]
    );
    const readiness = readinessRows.length > 0 ? readinessRows[0] : null;

    res.json({
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        squad_id: user.squad_id,
        callsign: user.callsign,
        specialization: user.specialization,
        weaponry: user.weaponry,
        gear: user.gear,
        avatar_url: user.avatar_url,
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
    const pool = await getDbPool();
    const expiresAt = new Date(req.user.exp * 1000);

    await pool.query('INSERT INTO revoked_tokens (jti, expires_at) VALUES (?, ?)', [
      req.user.jti,
      expiresAt,
    ]);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('[API] Logout error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5. Get current profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const pool = await getDbPool();
    const [rows] = await pool.query(
      'SELECT id, phone_number, role, squad_id, callsign, specialization, weaponry, gear, avatar_url FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Fetch squad alarm status
    const [alarmRows] = await pool.query(
      'SELECT alarm_active FROM commander_reports WHERE squad_id = ? ORDER BY updated_at DESC LIMIT 1',
      [user.squad_id]
    );
    user.alarm_active = alarmRows.length > 0 ? Boolean(alarmRows[0].alarm_active) : false;

    // Fetch user readiness status
    const [readinessRows] = await pool.query(
      'SELECT weapons_ready, transport_ready, comms_ready, meds_ready, note FROM readiness_status WHERE user_id = ?',
      [user.id]
    );
    user.readiness = readinessRows.length > 0 ? readinessRows[0] : null;

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
    const pool = await getDbPool();

    // Save selections
    await pool.query('UPDATE users SET specialization = ?, weaponry = ?, gear = ? WHERE id = ?', [
      specialization,
      weaponry,
      gear,
      req.user.userId,
    ]);

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
          await pool.query('UPDATE users SET avatar_url = ? WHERE id = ?', [
            avatarUrl,
            req.user.userId,
          ]);
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
        callsign: req.user.callsign,
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
    const pool = await getDbPool();
    await pool.query(
      `INSERT INTO readiness_status (user_id, weapons_ready, transport_ready, comms_ready, meds_ready, note) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
       weapons_ready = VALUES(weapons_ready), 
       transport_ready = VALUES(transport_ready), 
       comms_ready = VALUES(comms_ready), 
       meds_ready = VALUES(meds_ready), 
       note = VALUES(note)`,
      [req.user.userId, weapons_ready, transport_ready, comms_ready, meds_ready, note || '']
    );

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
    const pool = await getDbPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.phone_number, u.role, u.squad_id, u.avatar_url,
              r.weapons_ready, r.transport_ready, r.comms_ready, r.meds_ready, r.note, r.updated_at
       FROM users u
       LEFT JOIN readiness_status r ON u.id = r.user_id
       WHERE u.squad_id = ? AND u.role = 'fighter'`,
      [req.user.squadId]
    );

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
    const pool = await getDbPool();
    await pool.query(
      'INSERT INTO commander_reports (user_id, squad_id, alarm_active) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE alarm_active = VALUES(alarm_active)',
      [req.user.userId, req.user.squadId, alarm_active]
    );

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
