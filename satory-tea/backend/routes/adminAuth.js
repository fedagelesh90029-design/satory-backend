const router = require('express').Router();
const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

// POST /api/admin/login
router.post('/', async (req, res) => {
  const { password, secret } = req.body;
  const provided = password || secret;
  if (provided !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

module.exports = router;
