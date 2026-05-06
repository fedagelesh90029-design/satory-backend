const router = require('express').Router();
const db = require('../db');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

// GET /api/admin/categories
router.get('/', adminAuth, async (req, res) => {
  const cats = await db.categories.find({});
  cats.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  res.json(cats);
});

// POST /api/admin/categories
router.post('/', adminAuth, async (req, res) => {
  const cat = await db.categories.insert({
    ...req.body,
    is_active: req.body.is_active !== false,
    created_at: new Date().toISOString(),
  });
  res.json(cat);
});

// PUT /api/admin/categories/:id
router.put('/:id', adminAuth, async (req, res) => {
  await db.categories.update({ _id: req.params.id }, { $set: req.body });
  const cat = await db.categories.findOne({ _id: req.params.id });
  res.json(cat);
});

// DELETE /api/admin/categories/:id
router.delete('/:id', adminAuth, async (req, res) => {
  await db.categories.remove({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
