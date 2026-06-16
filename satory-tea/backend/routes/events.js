const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { month } = req.query;
  // Публично показываем только активные события
  let events = await db.events.find({ is_active: { $ne: false } });
  if (month) {
    events = events.filter(e => {
      const m = new Date(e.date).getMonth() + 1;
      return m === parseInt(month);
    });
  }
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(events);
});

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

router.get('/:id', async (req, res) => {
  try {
    const event = await db.events.findOne({ _id: req.params.id, is_active: { $ne: false } });
    if (!event) return res.status(404).json({ error: 'Не найдено' });

    let registered = false;
    let payment_status = null;

    const header = req.headers.authorization;
    if (header) {
      const token = header.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, SECRET);
          if (decoded && decoded.id) {
            const reg = await db.registrations.findOne({ user_id: decoded.id, event_id: req.params.id });
            if (reg) {
              registered = true;
              payment_status = reg.payment_status || 'unpaid';
            }
          }
        } catch (e) {
          // Игнорируем ошибки токена для публичного роута
        }
      }
    }

    res.json(Object.assign({}, event, { registered, payment_status }));
  } catch (error) {
    console.error('[events] Error fetching event details:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/register', auth, async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  // Проверяем лимит только если seats_total задан и больше 0
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total)
    return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  await db.registrations.insert({ user_id: req.user.id, event_id: req.params.id });
  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: event.seats_taken + 1 } });
  res.json({ success: true });
});

// ─── POST /api/events/:id/register/send-otp ──────────────────────────────────
// Шаг 1: отправить OTP для подтверждения записи на событие
router.post('/:id/register/send-otp', auth, async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total)
    return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  const user = await db.users.findOne({ _id: req.user.id });
  if (!user?.phone) return res.status(400).json({ error: 'Телефон не указан в профиле' });

  const OTP_TTL = 5 * 60 * 1000;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = Date.now() + OTP_TTL;

  // Сохраняем OTP с привязкой к событию
  const key = `reg_${req.params.id}_${req.user.id}`;
  const otpExisting = await db.otp_codes.findOne({ phone: key });
  if (otpExisting) {
    await db.otp_codes.update({ phone: key }, { $set: { code, expires_at, attempts: 0 } });
  } else {
    await db.otp_codes.insert({ phone: key, code, expires_at, attempts: 0 });
  }

  // Отправляем SMS
  const { sendSms } = require('./auth_helpers');
  await sendSms(user.phone, `Код подтверждения записи на "${event.title}": ${code}`);

  res.json({
    success: true,
    phone_masked: user.phone.slice(0, 3) + '***' + user.phone.slice(-4),
    dev_code: process.env.NODE_ENV !== 'production' ? code : undefined,
  });
});

// ─── POST /api/events/:id/register/confirm ───────────────────────────────────
// Шаг 2: подтвердить запись кодом из SMS
router.post('/:id/register/confirm', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Код обязателен' });

  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total)
    return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  const key = `reg_${req.params.id}_${req.user.id}`;
  const otpRecord = await db.otp_codes.findOne({ phone: key });
  if (!otpRecord) return res.status(400).json({ error: 'Сначала запросите код' });
  if (Date.now() > otpRecord.expires_at) return res.status(400).json({ error: 'Код истёк' });
  if (otpRecord.attempts >= 5) return res.status(429).json({ error: 'Слишком много попыток' });
  if (otpRecord.code !== String(code)) {
    await db.otp_codes.update({ phone: key }, { $set: { attempts: (otpRecord.attempts || 0) + 1 } });
    return res.status(400).json({ error: 'Неверный код' });
  }

  await db.otp_codes.remove({ phone: key });
  const now = new Date().toISOString();
  await db.registrations.insert({ user_id: req.user.id, event_id: req.params.id, confirmed_at: now });
  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: (event.seats_taken || 0) + 1 } });

  res.json({ success: true, event_title: event.title });
});

// POST /api/events/:id/unregister — отменить запись на событие
router.post('/:id/unregister', auth, async (req, res) => {
  try {
    const reg = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
    if (!reg) return res.status(400).json({ error: 'Вы не записаны на это событие' });

    if (reg.payment_status === 'paid') {
      return res.status(400).json({ error: 'Нельзя отменить оплаченную запись через приложение. Обратитесь к администратору.' });
    }

    await db.registrations.remove({ _id: reg._id });

    // Уменьшаем seats_taken на событии
    const event = await db.events.findOne({ _id: req.params.id });
    if (event) {
      const taken = Math.max(0, (event.seats_taken || 0) - 1);
      await db.events.update({ _id: req.params.id }, { $set: { seats_taken: taken } });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[events] Error unregistering:', error);
    res.status(500).json({ error: 'Ошибка сервера при отмене записи' });
  }
});

module.exports = router;
