/**
 * routes/news.js
 * Публичные роуты для новостей
 */
const router = require('express').Router();
const db = require('../db');

// GET /api/news — список опубликованных новостей
router.get('/', async (req, res) => {
  let news = await db.news.find({
    is_active: { $ne: false },
    is_published: { $ne: false },
  });
  news.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(news);
});

// GET /api/news/:id — одна новость
router.get('/:id', async (req, res) => {
  const item = await db.news.findOne({
    _id: req.params.id,
    is_active: { $ne: false },
    is_published: { $ne: false },
  });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  res.json(item);
});

module.exports = router;
