/**
 * routes/adminCategories.js
 * CRUD справочника категорий.
 */
const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');

router.use(adminAuth);

// GET /api/admin/categories
router.get('/', async (_req, res) => {
  const cats = await db.categories.find({});
  cats.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  res.json(cats);
});

// POST /api/admin/categories
router.post('/', async (req, res) => {
  const { name, is_active, sort_order } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name обязателен' });
  const existing = await db.categories.findOne({ name: name.trim() });
  if (existing) return res.status(400).json({ error: 'Категория с таким именем уже существует' });
  const count = await db.categories.count({});
  const cat = await db.categories.insert({
    name:       name.trim(),
    is_active:  is_active !== false,
    sort_order: sort_order !== undefined ? Number(sort_order) : count,
    created_at: new Date().toISOString(),
  });
  res.status(201).json(cat);
});

// PUT /api/admin/categories/:id
router.put('/:id', async (req, res) => {
  const cat = await db.categories.findOne({ _id: req.params.id });
  if (!cat) return res.status(404).json({ error: 'Не найдено' });
  const { name, is_active, sort_order } = req.body;
  await db.categories.update({ _id: req.params.id }, { $set: {
    ...(name !== undefined       ? { name: name.trim() }          : {}),
    ...(is_active !== undefined  ? { is_active: Boolean(is_active) } : {}),
    ...(sort_order !== undefined ? { sort_order: Number(sort_order) } : {}),
  }});
  res.json(await db.categories.findOne({ _id: req.params.id }));
});

// DELETE /api/admin/categories/:id
router.delete('/:id', async (req, res) => {
  const cat = await db.categories.findOne({ _id: req.params.id });
  if (!cat) return res.status(404).json({ error: 'Не найдено' });
  // Проверяем есть ли товары с этой категорией
  const count = await db.products.count({ category: cat.name });
  if (count > 0) return res.status(400).json({ error: `Нельзя удалить: ${count} товаров используют эту категорию` });
  await db.categories.remove({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
