const router = require('express').Router();
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');

const QR_SECRET = process.env.QR_SECRET || 'satory_qr_secret_2026';
const QR_TTL = 300; // 5 минут в секундах

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function makeSignature(userId, phone, timestamp) {
  return crypto.createHmac('sha256', QR_SECRET)
    .update(`${userId}:${phone}:${timestamp}`)
    .digest('hex');
}

// ─── GET /api/bonus/balance ───────────────────────────────────────────────────
router.get('/balance', auth, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Последние 10 транзакций
  const allTx = await db.bonus_transactions.find({ phone: user.phone || '' });
  allTx.sort((a, b) => new Date(b.date) - new Date(a.date));
  const history = allTx.slice(0, 10);

  res.json({
    bonus_balance: user.bonus_balance ?? null,
    loyalty_status: user.loyalty_status || 'Бронза',
    last_updated: user.bonus_updated_at || null,
    history,
  });
});

// ─── GET /api/bonus/transactions ─────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const txs = await db.bonus_transactions.find({ phone: user.phone || '' });
  txs.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(txs);
});

// ─── GET /api/bonus/qr ───────────────────────────────────────────────────────
router.get('/qr', auth, async (req, res) => {
  const user = await db.users.findOne({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!user.phone) return res.status(400).json({ error: 'Телефон не указан в профиле' });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = makeSignature(user._id, user.phone, timestamp);

  const payload = { userId: user._id, phone: user.phone, timestamp, signature };
  const qr_data = JSON.stringify(payload);
  const expires_at = new Date((timestamp + QR_TTL) * 1000).toISOString();

  res.json({ qr_data, expires_at, user_name: user.name, phone_last4: user.phone.slice(-4) });
});

// ─── POST /api/bonus/qr/verify ───────────────────────────────────────────────
router.post('/qr/verify', async (req, res) => {
  const { qr_data } = req.body;
  if (!qr_data) return res.status(400).json({ error: 'qr_data обязателен' });

  let payload;
  try {
    payload = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
  } catch {
    return res.json({ valid: false, reason: 'invalid_json' });
  }

  const { userId, phone, timestamp, signature } = payload;
  if (!userId || !phone || !timestamp || !signature) {
    return res.json({ valid: false, reason: 'missing_fields' });
  }

  // Проверка TTL
  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > QR_TTL) return res.json({ valid: false, reason: 'expired' });

  // Проверка подписи
  const expected = makeSignature(userId, phone, timestamp);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.json({ valid: false, reason: 'invalid_signature' });
  }

  // Получаем данные пользователя
  const user = await db.users.findOne({ _id: userId });
  res.json({
    valid: true,
    userId,
    phone,
    userName: user ? user.name : 'Неизвестный',
    bonus_balance: user ? (user.bonus_balance ?? 0) : 0,
    loyalty_status: user ? (user.loyalty_status || 'Бронза') : 'Бронза',
    expires_at: new Date((timestamp + QR_TTL) * 1000).toISOString(),
  });
});

// ─── POST /api/bonus/accrue — начисление бонусов кассиром ────────────────────
router.post('/accrue', async (req, res) => {
  const { userId, purchaseAmount } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId обязателен' });

  const amount = Number(purchaseAmount);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Укажите корректную сумму покупки' });

  const bonusAmount = Math.floor(amount * 0.03);
  if (bonusAmount < 1) return res.status(400).json({ error: 'Сумма слишком мала (минимум 34 ₽)' });

  const user = await db.users.findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const current = user.bonus_balance ?? 0;
  const newBalance = current + bonusAmount;
  const { calcLoyaltyStatus } = require('../services/iikoFileParser');
  const newStatus = calcLoyaltyStatus(newBalance);
  const now = new Date().toISOString();

  await db.users.update({ _id: userId }, {
    $set: { bonus_balance: newBalance, loyalty_status: newStatus, bonus_updated_at: now },
  });

  await db.bonus_transactions.insert({
    user_id: userId,
    phone: user.phone || '',
    guest_name: user.name || '',
    date: now,
    operation_type: 'accrual',
    accrued: bonusAmount,
    spent: 0,
    balance: newBalance,
    description: `Начисление за покупку на ${amount} ₽`,
    created_at: now,
  });

  // Push уведомление пользователю
  const { sendPushToUser } = require('../services/pushService');
  sendPushToUser(db, userId,
    '🎁 Бонусы начислены',
    `+${bonusAmount} баллов за покупку на ${amount} ₽. Баланс: ${newBalance}`,
    { screen: 'loyalty' }
  ).catch(() => {});

  res.json({ success: true, accrued: bonusAmount, newBalance, loyalty_status: newStatus });
});

module.exports = router;
