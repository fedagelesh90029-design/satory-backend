const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // Способ 1: x-admin-secret header
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) return next();

  // Способ 2: JWT Bearer токен с is_admin флагом
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      if (payload.is_admin || payload.role === 'admin') {
        req.admin = payload;
        return next();
      }
    } catch {}
  }

  return res.status(403).json({ error: 'Доступ запрещён' });
};
