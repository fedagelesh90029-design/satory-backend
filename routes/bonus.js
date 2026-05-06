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

// GET /api/bonus/balance
router.get('/balance', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({
    balance: user.bonus_balance || 0,
    points: user.bonus_points || 0,
    loyalty_status: user.loyalty_status || 'Бронза',
  });
});

// GET /api/bonus/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  const transactions = await db.bonus_transactions.find({ user_id: req.user.id });
  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(transactions);
});

// POST /api/bonus/add (admin only)
router.post('/add', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (adminSecret !== (process.env.ADMIN_SECRET || 'satory_admin_2026')) {
    return res.status(403).json({ error: 'Нет доступа' });
  }
  const { user_id, amount, description } = req.body;
  if (!user_id || !amount) return res.status(400).json({ error: 'user_id и amount обязательны' });

  await db.users.update({ _id: user_id }, { $inc: { bonus_balance: amount, bonus_points: amount } });
  await db.bonus_transactions.insert({
    user_id,
    amount,
    type: 'credit',
    description: description || 'Начисление бонусов',
    created_at: new Date().toISOString(),
  });
  res.json({ success: true });
});

module.exports = router;
