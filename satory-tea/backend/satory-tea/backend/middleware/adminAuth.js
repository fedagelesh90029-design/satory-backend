/**
 * middleware/adminAuth.js
 * JWT-аутентификация администратора.
 * Поддерживает два способа: заголовок Authorization: Bearer <token>
 * и заголовок x-admin-secret (обратная совместимость).
 */
const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET   = process.env.JWT_SECRET    || 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // Обратная совместимость — x-admin-secret
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) return next();

  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Требуется авторизация' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.is_admin) return res.status(403).json({ error: 'Нет прав администратора' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный или истёкший токен' });
  }
};
