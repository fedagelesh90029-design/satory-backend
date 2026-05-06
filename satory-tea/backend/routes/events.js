const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { sendSms } = require('./auth_helpers');

const OTP_TTL = 5 * 60 * 1000;

router.get('/', async (req, res) => {
  const { month } = req.query;
  const now = new Date();
  // Показываем только активные, опубликованные и не прошедшие события
  let events = await db.events.find({ 
    is_active: { $ne: false },
    is_published: { $ne: false }
  });
  // Фильтруем прошедшие — оставляем только сегодня и будущие
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  events = events.filter(e => new Date(e.date) >= today);
  if (month) {
    events = events.filter(e => {
      const m = new Date(e.date).getMonth() + 1;
      return m === parseInt(month);
    });
  }
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json(events);
});

router.get('/:id', async (req, res) => {
  const event = await db.events.findOne({ 
    _id: req.params.id, 
    is_active: { $ne: false },
    is_published: { $ne: false }
  });
  if (!event) return res.status(404).json({ error: 'Не найдено' });
  res.json(event);
});

router.post('/:id/register', auth, async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (event.is_published === false) return res.status(400).json({ error: 'Событие недоступно для регистрации' });
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total) return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  if (event.price > 0) {
    return res.status(400).json({ error: 'Для платных событий используйте /api/payments/events/:eventId/pay', price: event.price, payment_required: true });
  }

  const now = new Date().toISOString();
  await db.registrations.insert({ user_id: req.user.id, event_id: req.params.id, registered_at: now, payment_amount: 0, payment_status: 'free' });
  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: (event.seats_taken || 0) + 1 } });
  res.json({ success: true, event_title: event.title, payment_required: false, amount_paid: 0 });
});

// ─── POST /api/events/:id/register/send-otp ───────────────────────────────────
router.post('/:id/register/send-otp', auth, async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (event.is_published === false) return res.status(400).json({ error: 'Событие недоступно для регистрации' });
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total) return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  const user = await db.users.findOne({ _id: req.user.id });
  if (!user || !user.phone) return res.status(400).json({ error: 'Телефон не привязан к аккаунту' });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = Date.now() + OTP_TTL;
  const key = `event_${req.params.id}_${req.user.id}`;

  const existing_otp = await db.otp_codes.findOne({ phone: key });
  if (existing_otp) {
    await db.otp_codes.update({ phone: key }, { $set: { code, expires_at, attempts: 0 } });
  } else {
    await db.otp_codes.insert({ phone: key, code, expires_at, attempts: 0 });
  }

  const p = user.phone;
  const phone_masked = p.length >= 4 ? p.slice(0, 3) + '***' + p.slice(-2) : p;

  await sendSms(user.phone, `Код подтверждения записи на "${event.title}": ${code}`);

  res.json({ success: true, phone_masked, dev_code: process.env.NODE_ENV !== 'production' ? code : undefined });
});

// ─── POST /api/events/:id/register/confirm ────────────────────────────────────
router.post('/:id/register/confirm', auth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Код обязателен' });

  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  const key = `event_${req.params.id}_${req.user.id}`;
  const otpRecord = await db.otp_codes.findOne({ phone: key });
  if (!otpRecord) return res.status(400).json({ error: 'Сначала запросите код' });
  if (Date.now() > otpRecord.expires_at) return res.status(400).json({ error: 'Код истёк, запросите новый' });
  if (otpRecord.attempts >= 5) return res.status(429).json({ error: 'Слишком много попыток' });
  if (otpRecord.code !== String(code)) {
    await db.otp_codes.update({ phone: key }, { $set: { attempts: (otpRecord.attempts || 0) + 1 } });
    return res.status(400).json({ error: 'Неверный код' });
  }

  await db.otp_codes.remove({ phone: key });

  if (event.seats_total > 0 && event.seats_taken >= event.seats_total) return res.status(400).json({ error: 'Мест нет' });

  const now = new Date().toISOString();
  await db.registrations.insert({ user_id: req.user.id, event_id: req.params.id, registered_at: now, payment_amount: event.price || 0, payment_status: event.price > 0 ? 'pending' : 'free' });
  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: (event.seats_taken || 0) + 1 } });

  res.json({ success: true, event_title: event.title });
});

module.exports = router;
