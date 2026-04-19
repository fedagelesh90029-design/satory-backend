const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { month } = req.query;
  // Публично показываем только активные И опубликованные события
  let events = await db.events.find({ 
    is_active: { $ne: false },
    is_published: { $ne: false }
  });
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
  
  // Проверяем, что событие опубликовано
  if (event.is_published === false) {
    return res.status(400).json({ error: 'Событие недоступно для регистрации' });
  }
  
  // Проверяем лимит только если seats_total задан и больше 0
  if (event.seats_total > 0 && event.seats_taken >= event.seats_total) {
    return res.status(400).json({ error: 'Мест нет' });
  }

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  // Если событие платное, требуем оплату
  if (event.price > 0) {
    return res.status(400).json({ 
      error: 'Для платных событий используйте /api/payments/events/:eventId/pay', 
      price: event.price,
      payment_required: true 
    });
  } else {
    // Бесплатное событие - регистрируем сразу
    const now = new Date().toISOString();
    await db.registrations.insert({ 
      user_id: req.user.id, 
      event_id: req.params.id,
      registered_at: now,
      payment_amount: 0,
      payment_status: 'free'
    });
  }

  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: (event.seats_taken || 0) + 1 } });
  
  res.json({ 
    success: true, 
    event_title: event.title,
    payment_required: false,
    amount_paid: 0
  });
});

module.exports = router;
