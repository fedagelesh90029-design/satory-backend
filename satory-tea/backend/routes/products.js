const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { category, search, excludeCategory } = req.query;
  const query = {};
  if (category && category !== 'Все') query.category = category;
  if (excludeCategory) query.category = { $ne: excludeCategory };
  if (search) query.name = new RegExp(search, 'i');
  const products = await db.products.find(query);
  res.json(products);
});

router.get('/favorites/list', auth, async (req, res) => {
  const favs = await db.favorites.find({ user_id: req.user.id });
  const ids = favs.map(f => f.product_id);
  const products = await db.products.find({ _id: { $in: ids } });
  res.json(products);
});

router.get('/:id', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Не найдено' });
  res.json(product);
});

router.post('/:id/favorite', auth, async (req, res) => {
  const existing = await db.favorites.findOne({ user_id: req.user.id, product_id: req.params.id });
  if (existing) {
    await db.favorites.remove({ _id: existing._id });
    res.json({ favorited: false });
  } else {
    await db.favorites.insert({ user_id: req.user.id, product_id: req.params.id });
    res.json({ favorited: true });
  }
});

module.exports = router;
