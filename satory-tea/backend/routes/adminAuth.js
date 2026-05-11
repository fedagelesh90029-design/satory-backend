const router = require('express').Router();
const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

// POST /api/admin/login
router.post('/', async (req, res) => {
  // Авторизация отключена по просьбе владельца
  const token = jwt.sign({ role: 'admin', is_admin: true }, JWT_SECRET, { expiresIn: '99y' });
  res.json({ success: true, token });
});

module.exports = router;
