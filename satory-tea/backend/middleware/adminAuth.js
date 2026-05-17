const jwt = require('jsonwebtoken');

// Берем секреты из переменных окружения
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin'; 
const JWT_SECRET   = process.env.JWT_SECRET   || 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // 1. Проверка по секретному хедеру (для надежности)
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) {
    return next();
  }

  // 2. Проверка по JWT токену
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.admin = payload;
      return next();
    } catch (err) {
      console.error('[AdminAuth] Token verification failed:', err.message);
      
      // Попробуем декодировать без проверки подписи для диагностики
      const decoded = jwt.decode(token);
      if (decoded && (decoded.login === 'admin' || decoded.is_admin === true)) {
        console.log('[AdminAuth] Valid payload but WRONG SIGNATURE. Check JWT_SECRET in .env');
      }
    }
  }

  console.log('[AdminAuth] ACCESS DENIED to:', req.method, req.url);
  res.status(403).json({ error: 'Необходима авторизация администратора' });
};
