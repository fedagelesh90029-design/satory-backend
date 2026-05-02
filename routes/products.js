const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

async function withMeta(product) {
  const meta = await db.products_meta.findOne({ product_id: product._id }) || {};
  // Применяем override поля
  const effectivePrice    = product.price_override    ?? product.price;
  const effectiveCategory = product.category_override ?? product.category;
  return {
    ...product,
    price:    effectivePrice,
    category: effectiveCategory,
    meta: {
      full_description: meta.full_description || '',
      images:           meta.images           || [],
      brewing_tips:     meta.brewing_tips     || '',
      origin:           meta.origin           || '',
      is_handmade:      meta.is_handmade      || false,
    },
  };
}

router.get('/', async (req, res) => {
  const { category, search, excludeCategory, teaOnly } = req.query;
  const query = { active: { $ne: false } };
  if (search) query.name = new RegExp(search, 'i');

  let products = await db.products.find(query);

  // Скрываем товары с нулевым или отрицательным остатком (кроме ручных товаров без остатка)
  products = products.filter(p => p.is_manual || p.stock === null || p.stock === undefined || p.stock > 0);

  // Чайные категории
  const nonTea = ['Посуда', 'Аксессуары', 'Еда', 'Услуги'];

  if (teaOnly === '1') {
    products = products.filter(p => !nonTea.includes(p.category_override ?? p.category));
  } else if (category && category !== 'Все') {
    products = products.filter(p => (p.category_override ?? p.category) === category);
  }
  if (excludeCategory) {
    products = products.filter(p => (p.category_override ?? p.category) !== excludeCategory);
  }

  res.json(products.map(p => ({
    ...p,
    price:    p.price_override    ?? p.price,
    category: p.category_override ?? p.category,
  })));
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
  res.json(await withMeta(product));
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
