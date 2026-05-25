require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const connectDB = require('./db/connect');

const app = express();

// ─── Connect MongoDB ───────────────────────
connectDB();

// ─── CORS ──────────────────────────────────
const allowed = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// ─── Body parsing ──────────────────────────
app.use(express.json());

// ─── Health ────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: 'mongodb', timestamp: new Date().toISOString() });
});

// ─── Routes ────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/posts',   require('./routes/posts'));
app.use('/api/posts/:postId/comments', require('./routes/comments'));

// ─── 404 ───────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ─────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ─────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Inkwell API [MongoDB] running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});
