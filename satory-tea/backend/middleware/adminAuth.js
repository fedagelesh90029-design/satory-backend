const jwt = require('jsonwebtoken');

// Секреты должны совпадать во всем приложении
const ADMIN_SECRET = 'satori'; 
const JWT_SECRET = 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // 1. Проверка по секретному хедеру (для надежности)
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) {
    return next();
  }

  // 2. Проверка по JWT токену
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    
    // ТЕМПОРАЛЬНЫЙ ХАК ДЛЯ ОТЛАДКИ: 
    // Если токен декодируется и там написано 'admin', пускаем без проверки подписи
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.login === 'admin' || decoded.is_admin)) {
        console.log('[AdminAuth] Emergency bypass for admin:', decoded.login);
        req.admin = decoded;
        return next();
      }
    } catch (e) {
      console.error('[AdminAuth] Decode failed:', e.message);
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.admin = payload;
      return next();
    } catch (err) {
      console.error('[AdminAuth] Token verification failed:', err.message);
    }
  }

  // Если ничего не подошло
  console.log('[AdminAuth] Denied access to:', req.method, req.url);
  res.status(403).json({ error: 'Необходима авторизация администратора' });
};
