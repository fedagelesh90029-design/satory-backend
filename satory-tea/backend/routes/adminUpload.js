/**
 * routes/adminUpload.js
 * POST /api/admin/upload/image — загрузка изображений для событий и товаров.
 */
const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const adminAuth = require('../middleware/adminAuth');

const EVENTS_DIR   = path.join(__dirname, '..', 'uploads', 'events');
const PRODUCTS_DIR = path.join(__dirname, '..', 'uploads', 'products');

[EVENTS_DIR, PRODUCTS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, req.query.type === 'product' ? PRODUCTS_DIR : EVENTS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Допустимые форматы: JPEG, PNG, WebP, GIF'), { status: 400 }));
  },
});

// POST /api/admin/upload/image?type=event|product
router.post('/image', adminAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Файл превышает 5 МБ' });
      return res.status(err.status || 400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Файл не передан (поле: image)' });

    const folder = req.query.type === 'product' ? 'products' : 'events';
    const url = `/uploads/${folder}/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});

module.exports = router;
