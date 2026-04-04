const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/me', auth, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const orders_count = await db.orders.count({ user_id: req.user.id });
  const { password, ...safeUser } = user;
  res.json({ ...safeUser, orders_count });
});

router.put('/me', auth, async (req, res) => {
  const { name } = req.body;
  await db.users.update({ _id: req.user.id }, { $set: { name, name_set: true } });
  res.json({ success: true });
});

router.get('/orders', auth, async (req, res) => {
  const orders = await db.orders.find({ user_id: req.user.id });
  res.json(orders);
});

module.exports = router;
