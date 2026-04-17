/**
 * routes/adminEvents.js
 * CRUD для событий — только для администратора.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { broadcastPush } = require('../services/pushService');

router.use(adminAuth);

function validate(body, res) {
  if (!body.title || !String(body.title).trim())
    return res.status(400).json({ error: 'title обязателен' });
  if (!body.date)
    return res.status(400).json({ error: 'date обязателен' });
  return null;
}

function sanitize(body) {
  return {
    title:       String(body.title || '').trim(),
    description: String(body.description || ''),
    image_url:   String(body.image_url || ''),
    date:        body.date,
    price:       Number(body.price) || 0,
    seats_total: Number(body.seats_total) || 0,
    conditions:  String(body.conditions || ''),
    is_active:   body.is_active !== undefined ? Boolean(body.is_active) : true,
  };
}

// GET /api/admin/events
router.get('/', async (_req, res) => {
  const events = await db.events.find({});
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(events);
});

// POST /api/admin/events
router.post('/', async (req, res) => {
  if (validate(req.body, res)) return;
  const now = new Date().toISOString();
  const event = await db.events.insert({
    ...sanitize(req.body),
    seats_taken: 0,
    created_at: now,
    updated_at: now,
  });

  // Push всем у кого включены уведомления о событиях
  if (event.is_active !== false) {
    broadcastPush(db,
      '🍵 Новое мероприятие',
      event.title,
      { screen: 'event', id: event._id },
      'push_events'
    ).catch(() => {});
  }

  res.status(201).json(event);
});

// GET /api/admin/events/:id
router.get('/:id', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  res.json(event);
});

// PUT /api/admin/events/:id
router.put('/:id', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  if (validate(req.body, res)) return;

  await db.events.update({ _id: req.params.id }, {
    $set: { ...sanitize(req.body), updated_at: new Date().toISOString() },
  });
  res.json(await db.events.findOne({ _id: req.params.id }));
});

// PATCH /api/admin/events/:id/toggle — быстрое вкл/выкл
router.patch('/:id/toggle', async (req, res) => {
  const event = await db.events.findOne({ _id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Событие не найдено' });
  await db.events.update({ _id: req.params.id }, {
    $set: { is_active: !event.is_active, updated_at: new Date().toISOString() },
  });
  res.json({ is_active: !event.is_active });
});

// DELETE /api/admin/events/:id
router.delete('/:id', async (req, res) => {
  const n = await db.events.remove({ _id: req.params.id });
  if (!n) return res.status(404).json({ error: 'Событие не найдено' });
  res.json({ success: true });
});

module.exports = router;
