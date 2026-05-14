const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { items, total } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Корзина пуста' });

  const order = await db.orders.insert({
    user_id: req.user.id,
    items,
    total,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  // Push кассиру не нужен — заказ появится в админке
  res.json(order);
});

router.get('/', auth, async (req, res) => {
  const orders = await db.orders.find({ user_id: req.user.id });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

module.exports = router;
