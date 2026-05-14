/**
 * routes/adminGallery.js
 * CRUD галереи заведения — только для администратора.
 */
const router    = require('express').Router();
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');

const GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');
if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: GALLERY_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Допустимые форматы: JPEG, PNG, WebP'), { status: 400 }));
  },
});

router.use(adminAuth);

// PUT /api/admin/gallery/reorder — [{ id, order }, ...]
router.put('/reorder', async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Ожидается массив' });
  for (const { id, order } of items) {
    await db.gallery.update({ _id: id }, { $set: { order: Number(order) } });
  }
  res.json({ success: true });
});

// GET /api/admin/gallery
router.get('/', async (_req, res) => {
  const items = await db.gallery.find({});
  items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  res.json(items);
});

// POST /api/admin/gallery — multipart: image + caption
router.post('/', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(err.status || 400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Файл не передан (поле: image)' });

    const count = await db.gallery.count({});
    const now = new Date().toISOString();
    const item = await db.gallery.insert({
      image_url:  `/uploads/gallery/${req.file.filename}`,
      caption:    String(req.body.caption || ''),
      order:      count,
      created_at: now,
    });
    res.status(201).json(item);
  });
});

// PUT /api/admin/gallery/:id — обновить caption
router.put('/:id', async (req, res) => {
  const item = await db.gallery.findOne({ _id: req.params.id });
  if (!item) return res.status(404).json({ error: 'Не найдено' });
  await db.gallery.update({ _id: req.params.id }, { $set: { caption: String(req.body.caption || '') } });
  res.json(await db.gallery.findOne({ _id: req.params.id }));
});

// DELETE /api/admin/gallery/:id
router.delete('/:id', async (req, res) => {
  const item = await db.gallery.findOne({ _id: req.params.id });
  if (!item) return res.status(404).json({ error: 'Не найдено' });

  // Удаляем файл с диска
  const filePath = path.join(__dirname, '..', item.image_url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db.gallery.remove({ _id: req.params.id });
  res.json({ success: true });
});

module.exports = router;
