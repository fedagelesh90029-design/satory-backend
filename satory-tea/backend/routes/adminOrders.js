const router = require('express').Router();
const db = require('../db');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

// GET /api/admin/orders
router.get('/', adminAuth, async (req, res) => {
  const orders = await db.orders.find({});
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// PUT /api/admin/orders/:id
router.put('/:id', adminAuth, async (req, res) => {
  await db.orders.update({ _id: req.params.id }, { $set: req.body });
  const order = await db.orders.findOne({ _id: req.params.id });
  res.json(order);
});

// DELETE /api/admin/orders/:id
router.delete('/:id', adminAuth, async (req, res) => {
  await db.orders.remove({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
