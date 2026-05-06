/**
 * routes/adminNews.js
 * CRUD для новостей — только для администратора.
 * Та же логика что и adminEvents: отложенная публикация + push.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { broadcastPush } = require('../services/pushService');

router.use(adminAuth);

function sanitize(body) {
  return {
    title:       String(body.title || '').trim(),
    description: String(body.description || ''),
    image_url:   String(body.image_url || ''),
    is_active:   body.is_active !== undefined ? Boolean(body.is_active) : true,
    is_published: body.is_published !== undefined ? Boolean(body.is_published) : true,
    auto_publish: body.auto_publish !== undefined ? Boolean(body.auto_publish) : false,
    scheduled_publish_time: body.scheduled_publish_time || null,
    push_template: String(body.push_template || '').trim(),
    push_target:   String(body.push_target || 'all'),
    push_sent:     body.push_sent || false,
    scheduled_push_time: body.scheduled_push_time || null,
  };
}

// GET /api/admin/news
router.get('/', async (_req, res) => {
  const news = await db.news.find({});
  news.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(news);
});

// POST /api/admin/news
router.post('/', async (req, res) => {
  if (!req.body.title?.trim()) return res.status(400).json({ error: 'title обязателен' });
  const now = new Date().toISOString();
  const item = await db.news.insert({ ...sanitize(req.body), created_at: now, updated_at: now });

  // Push при создании если нет отложенного времени
  if (item.is_active !== false && item.push_template && !item.scheduled_push_time) {
    try {
      await broadcastPush(db, '📰 Satori Tea', item.push_template, { screen: 'news', id: item._id }, 'push_events');
      await db.news.update({ _id: item._id }, { $set: { push_sent: true, last_push_sent: now } });
    } catch {}
  }

  res.status(201).json(item);
});

// GET /api/admin/news/:id
router.get('/:id', async (req, res) => {
  const item = await db.news.findOne({ _id: req.params.id });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  res.json(item);
});

// PUT /api/admin/news/:id
router.put('/:id', async (req, res) => {
  const item = await db.news.findOne({ _id: req.params.id });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  await db.news.update({ _id: req.params.id }, { $set: { ...sanitize(req.body), updated_at: new Date().toISOString() } });
  res.json(await db.news.findOne({ _id: req.params.id }));
});

// DELETE /api/admin/news/:id
router.delete('/:id', async (req, res) => {
  const n = await db.news.remove({ _id: req.params.id });
  if (!n) return res.status(404).json({ error: 'Не найдено' });
  res.json({ success: true });
});

// POST /api/admin/news/:id/publish-now
router.post('/:id/publish-now', async (req, res) => {
  await db.news.update({ _id: req.params.id }, {
    $set: { is_published: true, scheduled_publish_time: null, auto_publish: false, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  });
  res.json({ success: true });
});

// POST /api/admin/news/:id/schedule-publish
router.post('/:id/schedule-publish', async (req, res) => {
  const { scheduled_publish_time } = req.body;
  if (!scheduled_publish_time) return res.status(400).json({ error: 'Время обязательно' });
  await db.news.update({ _id: req.params.id }, {
    $set: { scheduled_publish_time, is_published: false, auto_publish: true, updated_at: new Date().toISOString() }
  });
  res.json({ success: true });
});

// POST /api/admin/news/:id/send-push-now
router.post('/:id/send-push-now', async (req, res) => {
  const item = await db.news.findOne({ _id: req.params.id });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  const template = req.body.push_template || item.push_template || `📰 ${item.title}`;
  try {
    await broadcastPush(db, '📰 Satori Tea', template, { screen: 'news', id: item._id }, 'push_events');
    await db.news.update({ _id: req.params.id }, { $set: { push_sent: true, last_push_sent: new Date().toISOString(), updated_at: new Date().toISOString() } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/news/:id/schedule-push
router.post('/:id/schedule-push', async (req, res) => {
  const { scheduled_push_time, push_template, push_target } = req.body;
  if (!scheduled_push_time) return res.status(400).json({ error: 'Время обязательно' });
  await db.news.update({ _id: req.params.id }, {
    $set: { scheduled_push_time, push_template: push_template || '', push_target: push_target || 'all', push_sent: false, updated_at: new Date().toISOString() }
  });
  res.json({ success: true });
});

module.exports = router;
