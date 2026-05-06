const router = require('express').Router();
const db = require('../db');

// GET /api/gallery
router.get('/', async (req, res) => {
  const items = await db.gallery.find({ is_active: { $ne: false } });
  items.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  res.json(items);
});

module.exports = router;
