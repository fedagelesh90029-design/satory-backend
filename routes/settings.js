const router = require('express').Router();
const db = require('../db');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

// GET /api/settings — публичные настройки приложения
router.get('/', async (req, res) => {
  const settings = await db.app_settings.find({});
  const result = {};
  for (const s of settings) {
    if (!s.is_private) result[s.key] = s.value;
  }
  res.json(result);
});

// GET /api/admin/settings — все настройки (для админа)
router.get('/admin', adminAuth, async (req, res) => {
  const settings = await db.app_settings.find({});
  res.json(settings);
});

// PUT /api/admin/settings/:key
router.put('/:key', adminAuth, async (req, res) => {
  const { key } = req.params;
  const { value, is_private } = req.body;
  const existing = await db.app_settings.findOne({ key });
  if (existing) {
    await db.app_settings.update({ key }, { $set: { value, is_private: is_private || false, updated_at: new Date().toISOString() } });
  } else {
    await db.app_settings.insert({ key, value, is_private: is_private || false, created_at: new Date().toISOString() });
  }
  res.json({ success: true, key, value });
});

// POST /api/admin/settings — bulk update
router.post('/', adminAuth, async (req, res) => {
  const updates = req.body; // { key: value, ... }
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.app_settings.findOne({ key });
    if (existing) {
      await db.app_settings.update({ key }, { $set: { value, updated_at: new Date().toISOString() } });
    } else {
      await db.app_settings.insert({ key, value, created_at: new Date().toISOString() });
    }
  }
  res.json({ success: true });
});

module.exports = router;
