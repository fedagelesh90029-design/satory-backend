const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { items, total, delivery_type, delivery_address, phone } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'Корзина пуста' });

  const user = await db.users.findOne({ _id: req.user.id });
  const userPhone = user ? user.phone : '';
  const userName = user ? user.name : '';

  const orderData = {
    user_id: req.user.id,
    items,
    total,
    status: 'pending',
    delivery_type: delivery_type || 'pickup',
    delivery_address: delivery_type === 'delivery' ? (delivery_address || '') : '',
    payment_status: 'unpaid',
    user_name: userName || '',
    user_phone: userPhone || '',
    created_at: new Date().toISOString(),
  };

  if (delivery_type === 'delivery' && phone) {
    orderData.phone = phone;
    if (user && !user.phone) {
      await db.users.update({ _id: req.user.id }, { $set: { phone } });
      orderData.user_phone = phone;
    }
  }

  const order = await db.orders.insert(orderData);

  res.json(order);
});

router.get('/', auth, async (req, res) => {
  const orders = await db.orders.find({ user_id: req.user.id });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

module.exports = router;

