const router = require('express').Router();
const db = require('../db');
const { calcLoyaltyStatus, normalizePhone } = require('../services/iikoFileParser');
const { sendPushToUser } = require('../services/pushService');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminOnly(req, res, next) {
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  next();
}

// POST /api/admin/bonus/adjust
router.post('/bonus/adjust', adminOnly, async (req, res) => {
  const { phone, delta, comment } = req.body;
  if (!phone || delta === undefined) {
    return res.status(400).json({ error: 'phone и delta обязательны' });
  }

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат телефона' });

  const user = await db.users.findOne({ phone: normalized });
  if (!user) return res.status(404).json({ error: `Пользователь с телефоном ${normalized} не найден` });

  const current = user.bonus_balance ?? 0;
  const d = Number(delta);
  const newBalance = d < 0 ? Math.max(0, current + d) : current + d;
  const newStatus = calcLoyaltyStatus(newBalance);
  const now = new Date().toISOString();

  await db.users.update({ phone: normalized }, {
    $set: { bonus_balance: newBalance, loyalty_status: newStatus, bonus_updated_at: now },
  });

  const tx = await db.bonus_transactions.insert({
    user_id: user._id,
    phone: normalized,
    guest_name: user.name,
    date: now,
    operation_type: d >= 0 ? 'manual_accrual' : 'manual_deduction',
    accrued: d >= 0 ? d : 0,
    spent: d < 0 ? Math.abs(d) : 0,
    balance: newBalance,
    description: comment || (d >= 0 ? `Ручное начисление +${d}` : `Ручное списание ${d}`),
    created_at: now,
  });

  res.json({ new_balance: newBalance, loyalty_status: newStatus, transaction_id: tx._id });

  // Push пользователю об изменении бонусов
  const msg = d >= 0
    ? `Начислено ${d} бонусов. Баланс: ${newBalance}`
    : `Списано ${Math.abs(d)} бонусов. Баланс: ${newBalance}`;
  sendPushToUser(db, user._id, d >= 0 ? '🎁 Бонусы начислены' : '💳 Бонусы списаны', msg, { screen: 'loyalty' }).catch(() => {});
});

// GET /api/admin/sync/status — расширенный статус для админа
router.get('/sync/status', adminOnly, async (req, res) => {
  const logs = await db.sync_log.find({});
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(logs.slice(0, 20));
});

module.exports = router;
