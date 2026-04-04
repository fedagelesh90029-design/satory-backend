const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { month } = req.query;
  let events = await db.events.find({});
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
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Не найдено' });
  res.json(event);
});

router.post('/:id/register', auth, async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (event.seats_taken >= event.seats_total)
    return res.status(400).json({ error: 'Мест нет' });

  const existing = await db.registrations.findOne({ user_id: req.user.id, event_id: req.params.id });
  if (existing) return res.status(400).json({ error: 'Вы уже записаны' });

  await db.registrations.insert({ user_id: req.user.id, event_id: req.params.id });
  await db.events.update({ _id: req.params.id }, { $set: { seats_taken: event.seats_taken + 1 } });
  res.json({ success: true });
});

module.exports = router;
