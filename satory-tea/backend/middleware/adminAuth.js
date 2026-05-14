const jwt = require('jsonwebtoken');

// Секреты должны совпадать во всем приложении
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // 1. Проверка по секретному хедеру (для надежности)
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) return next();

  // 2. Проверка по JWT токену
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      console.log('[AdminAuth] Decoded payload:', payload);
      // Принимаем и role: admin, и is_admin: true для совместимости
      if (payload.is_admin || payload.role === 'admin' || payload.isAdmin) {
        req.admin = payload;
        return next();
      } else {
        console.warn('[AdminAuth] Payload missing admin flags:', payload);
      }
    } catch (err) {
      console.error('[AdminAuth] Token error:', err.message);
    }
  } else {
    console.warn('[AdminAuth] No valid Authorization header found');
  }

  // Если ничего не подошло
  res.status(403).json({ error: 'Необходима авторизация администратора' });
};
