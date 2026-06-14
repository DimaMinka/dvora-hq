import express from 'express';
import { config } from './config.js';
import { setupDatabase } from './db.js';
import { startBot } from './bot.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import squadRoutes from './routes/squad.js';

const app = express();

// Logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// CORS middleware: only allow origins from ALLOWED_ORIGINS env (comma-separated)
// Falls back to localhost:5173 for local development
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
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

// Route registration
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/squad', squadRoutes);

// Start Express Server
const port = config.port;
app.listen(port, () => {
  console.log(`[Server] Live on port ${port} in ${config.env} environment`);
});
