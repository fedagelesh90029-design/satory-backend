const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');
const db = require('../db');
const { normalizePhone } = require('../services/iikoFileParser');

const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';
const OTP_TTL = 5 * 60 * 1000;

// ─── Отправка SMS через МТС Exolve ───────────────────────────────────────────
function sendSmsMts(phone, text) {
  return new Promise((resolve) => {
    const key = (process.env.MTS_API_KEY || '').trim();
    console.log(`[mts-direct] key=${key ? key.slice(0,8)+'...' : 'НЕТ'}, phone=${phone}`);

    if (!key) {
      console.log(`[dev] SMS: ${text}`);
      return resolve();
    }

    const cleanPhone = phone.replace(/^\+/, ''); // МТС ожидает без +
    const payload = JSON.stringify({ number: cleanPhone, destination: cleanPhone, text });
    const options = {
      hostname: 'api.exolve.ru',
      port: 443,
      path: '/messaging/v1/SendSMS',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        console.log(`[mts-direct] status=${res.statusCode}, body=${raw.slice(0, 200)}`);
        resolve();
      });
    });
    req.on('error', e => { console.error(`[mts-direct] error: ${e.message}`); resolve(); });
    req.setTimeout(15000, () => { console.error('[mts-direct] timeout'); req.destroy(); resolve(); });
    req.write(payload);
    req.end();
  });
}

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

  await sendSmsMts(normalized, `Ваш код Satori: ${code}`);
  res.json({ success: true, phone: normalized, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
});

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
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
  const user = await db.users.findOne({ email });
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, { expiresIn: '30d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
