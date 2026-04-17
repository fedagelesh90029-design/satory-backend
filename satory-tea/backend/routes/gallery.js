/**
 * routes/gallery.js
 * Публичные эндпоинты галереи заведения.
 */
const router = require('express').Router();
const db = require('../db');

// GET /api/gallery
router.get('/', async (_req, res) => {
  const items = await db.gallery.find({});
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  res.json(items);
});

// GET /api/gallery/banner — первое фото для баннера
router.get('/banner', async (_req, res) => {
  const items = await db.gallery.find({});
  if (!items.length) return res.json(null);
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  res.json(items[0]);
});

module.exports = router;
