const router = require('express').Router();
const db = require('../db');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

// GET /api/admin/gallery
router.get('/', adminAuth, async (req, res) => {
  const items = await db.gallery.find({});
  items.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  res.json(items);
});

// POST /api/admin/gallery
router.post('/', adminAuth, async (req, res) => {
  const item = await db.gallery.insert({ ...req.body, created_at: new Date().toISOString() });
  res.json(item);
});

// PUT /api/admin/gallery/:id
router.put('/:id', adminAuth, async (req, res) => {
  await db.gallery.update({ _id: req.params.id }, { $set: req.body });
  const item = await db.gallery.findOne({ _id: req.params.id });
  res.json(item);
});

// DELETE /api/admin/gallery/:id
router.delete('/:id', adminAuth, async (req, res) => {
  await db.gallery.remove({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
