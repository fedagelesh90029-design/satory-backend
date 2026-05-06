const router = require('express').Router();
const db = require('../db');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

// GET /api/sync/status
router.get('/status', adminAuth, async (req, res) => {
  const logs = await db.sync_log.find({});
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({ logs: logs.slice(0, 20) });
});

// GET /api/sync/logs
router.get('/logs', adminAuth, async (req, res) => {
  const logs = await db.sync_log.find({});
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(logs.slice(0, 50));
});

module.exports = router;
