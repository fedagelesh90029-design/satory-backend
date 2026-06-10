const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const { normalizePhone } = require('../services/iikoFileParser');
const { sendSms } = require('./auth_helpers');

const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';
const OTP_TTL = 5 * 60 * 1000; // 5 минут
const REVIEW_TEST_PHONE = process.env.REVIEW_TEST_PHONE
  ? normalizePhone(String(process.env.REVIEW_TEST_PHONE))
  : '';
const REVIEW_TEST_CODE = process.env.REVIEW_TEST_CODE || '';
const REVIEW_TEST_NAME = process.env.REVIEW_TEST_NAME || 'App Review';
const REVIEW_TEST_EMAIL = (process.env.REVIEW_TEST_EMAIL || 'test@satory.ru').toLowerCase();
const REVIEW_TEST_PASSWORD = process.env.REVIEW_TEST_PASSWORD || '123456';

function isReviewPhone(phone) {
  return Boolean(REVIEW_TEST_PHONE && REVIEW_TEST_CODE && phone === REVIEW_TEST_PHONE);
}

async function ensureReviewUser(phone) {
  let user = await db.users.findOne({ phone });
  if (!user) {
    user = await db.users.insert({
      name: REVIEW_TEST_NAME,
      phone,
      email: null,
      password: null,
      bonus_points: 0,
      bonus_balance: 0,
      visits: 0,
      loyalty_status: 'Бронза',
      name_set: true,
      created_at: new Date().toISOString(),
      is_review_user: true,
    });
  } else if (user.name !== REVIEW_TEST_NAME || !user.name_set || !user.is_review_user) {
    await db.users.update(
      { _id: user._id },
      { $set: { name: REVIEW_TEST_NAME, name_set: true, is_review_user: true } }
    );
    user = await db.users.findOne({ _id: user._id });
  }

  return user;
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера телефона' });

  if (isReviewPhone(normalized)) {
    return res.json({
      success: true,
      phone: normalized,
      method: 'review',
      is_review_user: true,
      dev_code: REVIEW_TEST_CODE,
    });
  }

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

// ─── POST /api/auth/send-otp-telegram ─────────────────────────────────────────
router.post('/send-otp-telegram', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера телефона' });

  if (isReviewPhone(normalized)) {
    return res.json({
      success: true,
      phone: normalized,
      method: 'review',
      is_review_user: true,
      dev_code: REVIEW_TEST_CODE,
    });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = crypto.randomBytes(16).toString('hex');
  const expires_at = Date.now() + OTP_TTL;

  // Сохраняем OTP с hash для привязки
  const existing = await db.otp_codes.findOne({ phone: normalized });
  if (existing) {
    await db.otp_codes.update({ phone: normalized }, { $set: { code, expires_at, attempts: 0, tg_link_hash: hash } });
  } else {
    await db.otp_codes.insert({ phone: normalized, code, expires_at, attempts: 0, tg_link_hash: hash });
  }

  const { getBotUsername, sendOtpViaTelegram } = require('../services/telegramBot');
  const botUsername = await getBotUsername();
  
  // Пробуем отправить напрямую если уже привязан
  const sent = await sendOtpViaTelegram(normalized, `Ваш код подтверждения Satori Tea: ${code}`);
  if (sent) {
    return res.json({ success: true, method: 'direct', phone: normalized, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
  }

  // Если не привязан — даём ссылку
  const tg_link = `https://t.me/${botUsername}?start=${hash}`;
  res.json({ success: true, method: 'link', tg_link, bot_username: botUsername, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  const { phone, code, name } = req.body;
  if (!phone || !code) return res.status(400).json({ error: 'phone и code обязательны' });

  const normalized = normalizePhone(String(phone));
  if (!normalized) return res.status(400).json({ error: 'Неверный формат номера' });

  if (isReviewPhone(normalized)) {
    if (String(code) !== String(REVIEW_TEST_CODE)) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    const user = await ensureReviewUser(normalized);
    const token = jwt.sign({ id: user._id, phone: normalized }, SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    return res.json({ token, user: safeUser, is_new: false, is_review_user: true });
  }

  const otpRecord = await db.otp_codes.findOne({ phone: normalized });
  if (!otpRecord) return res.status(400).json({ error: 'Сначала запросите код' });
  if (Date.now() > otpRecord.expires_at) return res.status(400).json({ error: 'Код истёк, запросите новый' });

  // Защита от брутфорса
  if (otpRecord.attempts >= 5) return res.status(429).json({ error: 'Слишком много попыток, запросите новый код' });
  if (otpRecord.code !== String(code)) {
    await db.otp_codes.update({ phone: normalized }, { $set: { attempts: (otpRecord.attempts || 0) + 1 } });
    return res.status(400).json({ error: 'Неверный код' });
  }

  // Удаляем использованный OTP
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
      created_at: new Date().toISOString(),
    });
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
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  const normEmail = String(email).trim().toLowerCase();

  // Автоматический вход для тестового аккаунта модератора
  if (normEmail === REVIEW_TEST_EMAIL && String(password) === REVIEW_TEST_PASSWORD) {
    let user = await db.users.findOne({ email: REVIEW_TEST_EMAIL });
    if (!user) {
      user = await db.users.insert({
        name: 'Test Reviewer',
        email: REVIEW_TEST_EMAIL,
        password: bcrypt.hashSync(REVIEW_TEST_PASSWORD, 10),
        bonus_points: 0,
        bonus_balance: 0,
        visits: 0,
        loyalty_status: 'Бронза',
        created_at: new Date().toISOString(),
      });
    }
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '30d' });
    const { password: _, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  }

  const user = await db.users.findOne({ email: normEmail });
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
