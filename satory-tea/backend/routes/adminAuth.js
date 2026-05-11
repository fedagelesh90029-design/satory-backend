const router = require('express').Router();
const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

// POST /api/admin/login
router.post('/', async (req, res) => {
  const { login, password, secret } = req.body;
  
  // Принимаем либо secret (для старых запросов), либо связку login+password
  const isAdminSecret = (secret === ADMIN_SECRET || password === ADMIN_SECRET);
  const isSatoriLogin = (login === 'satori' && password === 'satori');

  if (!isAdminSecret && !isSatoriLogin) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ role: 'admin', is_admin: true }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

module.exports = router;
