const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { normalizePhone } = require('../services/iikoFileParser');
const { sendSms } = require('./auth_helpers');

const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';
const OTP_TTL = 5 * 60 * 1000;

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера телефона' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = Date.now() + OTP_TTL;

  // Сохраняем OTP (upsert по телефону)
  const existing = await db.otp_codes.findOne({ phone: normalized });
  if (existing) {
    await db.otp_codes.update({ phone: normalized }, { $set: { code, expires_at, attempts: 0 } });
  } else {
    await db.otp_codes.insert({ phone: normalized, code, expires_at, attempts: 0 });
  }

  await sendSms(normalized, `Ваш код Satori: ${code}`);
  res.json({ success: true, phone: normalized, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
});

// ─── POST /api/auth/send-otp-telegram ────────────────────────────────────────
router.post('/send-otp-telegram', async (req, res) => {
  if (!process.env.TG_BOT_TOKEN) {
    return res.status(503).json({ error: 'Telegram не настроен на сервере' });
  }

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера телефона' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = Date.now() + OTP_TTL;
  const hash = crypto.randomBytes(16).toString('hex');

  const existing = await db.otp_codes.findOne({ phone: normalized });
  if (existing) {
    await db.otp_codes.update({ phone: normalized }, { $set: { code, expires_at, attempts: 0, tg_link_hash: hash } });
  } else {
    await db.otp_codes.insert({ phone: normalized, code, expires_at, attempts: 0, tg_link_hash: hash });
  }

  const { getBotUsername, sendTelegramMessage } = require('../services/telegramBot');

  // Если у пользователя уже привязан Telegram — отправляем напрямую
  const user = await db.users.findOne({ phone: normalized });
  if (user && user.telegram_chat_id) {
    await sendTelegramMessage(user.telegram_chat_id,
      `🔐 Ваш код подтверждения Satori Tea:\n\n<b>${code}</b>\n\n⏱ Действителен 5 минут.`
    );
    const p = normalized;
    const phone_masked = p.length >= 4 ? p.slice(0, 3) + '***' + p.slice(-2) : p;
    return res.json({ success: true, method: 'telegram_direct', phone_masked });
  }

  // Иначе — ссылка для первичной привязки
  const botUsername = await getBotUsername();
  if (!botUsername) return res.status(500).json({ error: 'Не удалось получить имя бота' });

  const tg_link = `https://t.me/${botUsername}?start=${hash}`;
  res.json({ success: true, method: 'telegram_link', tg_link, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
});


router.post('/verify-otp', async (req, res) => {
  const { phone, code, name } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone и code обязательны' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера' });

  const otpRecord = await db.otp_codes.findOne({ phone: normalized });
  if (!otpRecord) return res.status(400).json({ error: 'Сначала запросите код' });
  if (Date.now() > otpRecord.expires_at) return res.status(400).json({ error: 'Код истёк, запросите новый' });

  // Защита от брутфорса
  if (otpRecord.attempts >= 5) return res.status(429).json({ error: 'Слишком много попыток, запросите новый код' });
  if (otpRecord.code !== String(code)) {
    await db.otp_codes.update({ phone: normalized }, { $set: { attempts: (otpRecord.attempts || 0) + 1 } });
    return res.status(400).json({ error: 'Неверный код' });
  }

  // Удаляем использованный OTP (сохраняем данные Telegram перед удалением)
  const tgChatId = otpRecord.tg_chat_id || null;
  const tgUsername = otpRecord.tg_username || null;
  await db.otp_codes.remove({ phone: normalized });

  // Ищем или создаём пользователя
  let user = await db.users.findOne({ phone: normalized });
  const isNew = !user;

  if (!user) {
    user = await db.users.insert({
      name: '',
      phone: normalized,
      email: null,
      password: null,
      bonus_points: 0,
      bonus_balance: 0,
      visits: 0,
      loyalty_status: 'Бронза',
      name_set: false,
      // Привязываем Telegram если пользователь входил через бота
      ...(tgChatId ? { telegram_chat_id: tgChatId, telegram_username: tgUsername } : {}),
      created_at: new Date().toISOString(),
    });
    if (tgChatId) {
      console.log(`[auth] Новый пользователь ${normalized} — Telegram chat_id=${tgChatId} сохранён`);
    }
  }

  const token = jwt.sign({ id: user._id, phone: normalized }, SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  // is_new = true если имя ещё не задано
  res.json({ token, user: safeUser, is_new: isNew || !user.name_set });
});

// ─── POST /api/auth/register (email — оставляем для совместимости) ────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });

  const existing = await db.users.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email уже используется' });

  const hash = bcrypt.hashSync(password, 10);
  const user = await db.users.insert({
    name, email, password: hash,
    bonus_points: 0, bonus_balance: 0, visits: 0, loyalty_status: 'Бронза',
    created_at: new Date().toISOString(),
  });

  const token = jwt.sign({ id: user._id, email }, SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
