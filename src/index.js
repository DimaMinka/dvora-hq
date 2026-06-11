import express from 'express';
import cors from 'cors';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { setupDatabase, getDbPool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Database connection and run setup
setupDatabase()
  .then(() => {
    console.log('[System] Database initialization complete.');
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

    res.json({
      token,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        role: user.role,
        squad_id: user.squad_id,
        avatar_url: user.avatar_url,
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
      'SELECT id, phone_number, role, squad_id, specialization, weaponry, gear, avatar_url FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[API] Profile error:', err.message);
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
