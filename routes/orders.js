const router = require('express').Router();
const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// GET /api/orders — список заказов пользователя
router.get('/', authMiddleware, async (req, res) => {
  const orders = await db.orders.find({ user_id: req.user.id });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// POST /api/orders — создать заказ
router.post('/', authMiddleware, async (req, res) => {
  const { items, total, address, comment, payment_method, use_bonus } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Корзина пуста' });

  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  let bonus_used = 0;
  if (use_bonus && user.bonus_balance > 0) {
    bonus_used = Math.min(user.bonus_balance, Math.floor(total * 0.3));
  }

  const order = await db.orders.insert({
    user_id: req.user.id,
    user_phone: user.phone,
    user_name: user.name,
    items,
    total,
    bonus_used,
    address: address || '',
    comment: comment || '',
    payment_method: payment_method || 'cash',
    status: 'new',
    created_at: new Date().toISOString(),
  });

  // Начисляем бонусы (5% от суммы)
  const bonus_earned = Math.floor((total - bonus_used) * 0.05);
  if (bonus_earned > 0) {
    await db.users.update({ _id: req.user.id }, {
      $inc: { bonus_balance: bonus_earned - bonus_used, bonus_points: bonus_earned, visits: 1 },
    });
    await db.bonus_transactions.insert({
      user_id: req.user.id,
      amount: bonus_earned,
      type: 'credit',
      description: `Бонусы за заказ #${order._id.slice(-6)}`,
      order_id: order._id,
      created_at: new Date().toISOString(),
    });
  } else if (bonus_used > 0) {
    await db.users.update({ _id: req.user.id }, {
      $inc: { bonus_balance: -bonus_used, visits: 1 },
    });
  }

  res.json(order);
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const order = await db.orders.findOne({ _id: req.params.id, user_id: req.user.id });
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  res.json(order);
});

module.exports = router;
