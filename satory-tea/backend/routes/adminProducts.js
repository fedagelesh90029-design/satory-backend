/**
 * routes/adminProducts.js
 * Управление товарами и мета-данными — только для администратора.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { broadcastPush } = require('../services/pushService');

router.use(adminAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function withMeta(product) {
  const meta = await db.products_meta.findOne({ product_id: product._id }) || {};
  return { ...product, meta: {
    full_description: meta.full_description || '',
    images:           meta.images           || [],
    brewing_tips:     meta.brewing_tips     || '',
    origin:           meta.origin           || '',
    is_handmade:      meta.is_handmade      || false,
  }};
}

// ─── GET /api/admin/products ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { category, search } = req.query;
  const query = {};
  if (category && category !== 'Все') query.category = category;
  if (search) query.name = new RegExp(search, 'i');

  const products = await db.products.find(query);
  products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
  res.json(products);
});

// ─── POST /api/admin/products/manual ─────────────────────────────────────────
router.post('/manual', async (req, res) => {
  const { name, price, category, stock, description, unit,
          full_description, images, brewing_tips, origin, is_handmade } = req.body;

  if (!name || !String(name).trim())
    return res.status(400).json({ error: 'name обязателен' });

  const now = new Date().toISOString();
  const product = await db.products.insert({
    name:        String(name).trim(),
    price:       Number(price) || 0,
    category:    String(category || 'Прочее').trim(),
    stock:       stock !== undefined ? Number(stock) : null,
    description: String(description || ''),
    unit:        String(unit || ''),
    active:      true,
    is_manual:   true,
    rating:      0,
    reviews_count: 0,
    badge:       null,
    year:        null,
    updated_at:  now,
    created_at:  now,
  });

  await db.products_meta.insert({
    product_id:       product._id,
    full_description: String(full_description || ''),
    images:           Array.isArray(images) ? images : [],
    brewing_tips:     String(brewing_tips || ''),
    origin:           String(origin || ''),
    is_handmade:      Boolean(is_handmade),
    updated_at:       now,
  });

  res.status(201).json(await withMeta(product));

  // Push о новом товаре
  broadcastPush(db,
    '🆕 Новый товар в каталоге',
    product.name,
    { screen: 'product', id: product._id },
    'push_news'
  ).catch(() => {});
});

// ─── PUT /api/admin/products/:id/override ────────────────────────────────────
router.put('/:id/override', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const { price_override, category_override } = req.body;
  const now = new Date().toISOString();
  await db.products.update({ _id: req.params.id }, {
    $set: {
      price_override:    price_override    !== undefined ? (price_override    === '' ? null : Number(price_override))    : product.price_override,
      category_override: category_override !== undefined ? (category_override === '' ? null : String(category_override)) : product.category_override,
      updated_at: now,
    },
  });
  res.json(await withMeta(await db.products.findOne({ _id: req.params.id })));
});

// ─── PUT /api/admin/products/manual/:id ──────────────────────────────────────
// Обновляет базовые поля только ручного товара
router.put('/manual/:id', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id, is_manual: true });
  if (!product) return res.status(404).json({ error: 'Ручной товар не найден' });

  const { name, price, category, stock } = req.body;
  const now = new Date().toISOString();
  await db.products.update({ _id: req.params.id }, {
    $set: {
      ...(name     ? { name: String(name).trim() }         : {}),
      ...(price !== undefined ? { price: Number(price) || 0 } : {}),
      ...(category  ? { category: String(category).trim() } : {}),
      ...(stock !== undefined ? { stock: Number(stock) }    : {}),
      updated_at: now,
    },
  });
  res.json(await withMeta(await db.products.findOne({ _id: req.params.id })));
});


router.get('/:id', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Товар не найден' });
  res.json(await withMeta(product));
});

// ─── PUT /api/admin/products/:id/meta ────────────────────────────────────────
router.put('/:id/meta', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const { full_description, images, brewing_tips, origin, is_handmade } = req.body;
  const now = new Date().toISOString();

  const existing = await db.products_meta.findOne({ product_id: req.params.id });
  const metaData = {
    product_id:       req.params.id,
    full_description: String(full_description || ''),
    images:           Array.isArray(images) ? images : (existing?.images || []),
    brewing_tips:     String(brewing_tips || ''),
    origin:           String(origin || ''),
    is_handmade:      Boolean(is_handmade),
    updated_at:       now,
  };

  if (existing) {
    await db.products_meta.update({ product_id: req.params.id }, { $set: metaData });
  } else {
    await db.products_meta.insert(metaData);
  }

  res.json(await withMeta(product));
});

// ─── POST /api/admin/products/:id/images ─────────────────────────────────────
// Принимает { url: '/uploads/products/...' } — URL уже загруженного файла
router.post('/:id/images', async (req, res) => {
  const product = await db.products.findOne({ _id: req.params.id });
  if (!product) return res.status(404).json({ error: 'Товар не найден' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url обязателен' });

  const now = new Date().toISOString();
  const existing = await db.products_meta.findOne({ product_id: req.params.id });
  const imageEntry = { id: `img_${Date.now()}`, url };

  if (existing) {
    const images = [...(existing.images || []), imageEntry];
    await db.products_meta.update({ product_id: req.params.id }, { $set: { images, updated_at: now } });
  } else {
    await db.products_meta.insert({ product_id: req.params.id, images: [imageEntry], full_description: '', brewing_tips: '', origin: '', is_handmade: false, updated_at: now });
  }

  res.json(await withMeta(product));
});

// ─── PUT /api/admin/products/:id/images/reorder ──────────────────────────────
router.put('/:id/images/reorder', async (req, res) => {
  const meta = await db.products_meta.findOne({ product_id: req.params.id });
  if (!meta) return res.status(404).json({ error: 'Мета-данные не найдены' });

  const order = req.body; // [{ id, url }, ...]
  if (!Array.isArray(order)) return res.status(400).json({ error: 'Ожидается массив' });

  const now = new Date().toISOString();
  await db.products_meta.update({ product_id: req.params.id }, { $set: { images: order, updated_at: now } });
  res.json({ success: true, images: order });
});

// ─── DELETE /api/admin/products/:id/images/:imageId ──────────────────────────
router.delete('/:id/images/:imageId', async (req, res) => {
  const meta = await db.products_meta.findOne({ product_id: req.params.id });
  if (!meta) return res.status(404).json({ error: 'Мета-данные не найдены' });

  const images = (meta.images || []).filter(img => img.id !== req.params.imageId);
  await db.products_meta.update({ product_id: req.params.id }, {
    $set: { images, updated_at: new Date().toISOString() },
  });
  res.json({ success: true, images });
});

module.exports = router;
