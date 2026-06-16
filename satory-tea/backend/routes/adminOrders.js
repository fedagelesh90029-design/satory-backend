/**
 * routes/adminOrders.js
 * Управление заказами — только для администратора.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { sendPushToUser } = require('../services/pushService');

router.use(adminAuth);

const STATUS_LABELS = {
  pending:   'Ожидает',
  confirmed: 'Подтверждён',
  ready:     'Готов',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

// GET /api/admin/orders — все заказы с данными пользователей
router.get('/', async (req, res) => {
  const orders = await db.orders.find({});
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Подтягиваем имена и телефоны пользователей
  const enriched = await Promise.all(orders.map(async o => {
    const user = await db.users.findOne({ _id: o.user_id });
    return {
      ...o,
      user_name:  user?.name  || o.user_name || '—',
      user_phone: user?.phone || o.user_phone || o.phone || '—',
    };
  }));

  res.json(enriched);
});

// PUT /api/admin/orders/:id/status — изменить статус заказа
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!STATUS_LABELS[status]) return res.status(400).json({ error: 'Неверный статус' });

  const order = await db.orders.findOne({ _id: req.params.id });
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  await db.orders.update({ _id: req.params.id }, { $set: { status, updated_at: new Date().toISOString() } });

  // Push пользователю об изменении статуса
  if (order.user_id && status !== 'pending') {
    sendPushToUser(db, order.user_id,
      '📦 Статус заказа изменён',
      `Заказ #${req.params.id.slice(-6).toUpperCase()}: ${STATUS_LABELS[status]}`,
      { screen: 'orders' }
    ).catch(() => {});
  }

  res.json({ success: true, status });
});

// PUT /api/admin/orders/:id/payment — изменить статус оплаты заказа
router.put('/:id/payment', async (req, res) => {
  const { payment_status } = req.body;
  if (payment_status !== 'paid' && payment_status !== 'unpaid') {
    return res.status(400).json({ error: 'Неверный статус оплаты' });
  }

  const order = await db.orders.findOne({ _id: req.params.id });
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  await db.orders.update(
    { _id: req.params.id },
    { $set: { payment_status, updated_at: new Date().toISOString() } }
  );

  res.json({ success: true, payment_status });
});

module.exports = router;
