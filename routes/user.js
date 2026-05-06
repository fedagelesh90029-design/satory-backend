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

// GET /api/user/profile
router.get('/profile', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// PUT /api/user/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email, birth_date } = req.body;
  const update = {};
  if (name !== undefined) { update.name = name; update.name_set = true; }
  if (email !== undefined) update.email = email;
  if (birth_date !== undefined) update.birth_date = birth_date;
  update.updated_at = new Date().toISOString();

  await db.users.update({ _id: req.user.id }, { $set: update });
  const user = await db.users.findOne({ _id: req.user.id });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// GET /api/user/favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  const favs = await db.favorites.find({ user_id: req.user.id });
  const ids = favs.map(f => f.product_id);
  res.json(ids);
});

// POST /api/user/favorites/:id
router.post('/favorites/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const existing = await db.favorites.findOne({ user_id: req.user.id, product_id: id });
  if (!existing) {
    await db.favorites.insert({ user_id: req.user.id, product_id: id, created_at: new Date().toISOString() });
  }
  res.json({ success: true });
});

// DELETE /api/user/favorites/:id
router.delete('/favorites/:id', authMiddleware, async (req, res) => {
  await db.favorites.remove({ user_id: req.user.id, product_id: req.params.id });
  res.json({ success: true });
});

// GET /api/user/orders
router.get('/orders', authMiddleware, async (req, res) => {
  const orders = await db.orders.find({ user_id: req.user.id });
  orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(orders);
});

// GET /api/user/bonus
router.get('/bonus', authMiddleware, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const transactions = await db.bonus_transactions.find({ user_id: req.user.id });
  transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({
    balance: user.bonus_balance || 0,
    points: user.bonus_points || 0,
    loyalty_status: user.loyalty_status || 'Бронза',
    transactions,
  });
});

// POST /api/user/push-token
router.post('/push-token', authMiddleware, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Токен обязателен' });
  await db.users.update({ _id: req.user.id }, { $set: { push_token: token } });
  res.json({ success: true });
});

module.exports = router;
