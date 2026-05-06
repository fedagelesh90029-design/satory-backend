const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminAuth(req, res, next) {
  const secret = req.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Нет доступа' });
  next();
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subdir = req.query.folder || 'misc';
    const dir = path.join(uploadsDir, subdir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения'));
    }
  },
});

// POST /api/admin/upload
router.post('/', adminAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const subdir = req.query.folder || 'misc';
  const url = `/uploads/${subdir}/${req.file.filename}`;
  res.json({ success: true, url });
});

module.exports = router;
