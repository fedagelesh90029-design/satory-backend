/**
 * routes/adminAuth.js
 * POST /api/admin/login — выдаёт JWT для администратора.
 */
const router = require('express').Router();
const jwt = require('jsonwebtoken');

const ADMIN_LOGIN    = process.env.ADMIN_LOGIN    || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const JWT_SECRET     = process.env.JWT_SECRET     || 'satory_secret_2026';

router.post('/', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.status(400).json({ error: 'login и password обязательны' });

  if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = jwt.sign({ is_admin: true, login }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, expires_in: '30d' });
});

module.exports = router;
