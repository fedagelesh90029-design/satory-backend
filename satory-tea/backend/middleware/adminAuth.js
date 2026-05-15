const jwt = require('jsonwebtoken');

// Секреты должны совпадать во всем приложении
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satori'; // Использовано из .env
const JWT_SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

module.exports = function adminAuth(req, res, next) {
  // 1. Проверка по секретному хедеру (для надежности)
  if (req.headers['x-admin-secret'] === ADMIN_SECRET) {
    console.log('[AdminAuth] Authenticated via x-admin-secret');
    return next();
  }

  // 2. Проверка по JWT токену
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      console.log('[AdminAuth] Decoded payload:', JSON.stringify(payload));
      
      // РАЗРЕШАЕМ ДОСТУП, если логин 'admin' или установлены флаги
      const isAdmin = payload.login === 'admin' || payload.is_admin || payload.role === 'admin' || payload.isAdmin;
      
      if (isAdmin) {
        req.admin = payload;
        return next();
      } else {
        console.warn('[AdminAuth] User is not admin. Payload:', JSON.stringify(payload));
      }
    } catch (err) {
      console.error('[AdminAuth] Token verification failed:', err.message);
      // Если токен не прошел верификацию из-за секрета, но мы в отладке, 
      // можно попробовать декодировать без проверки, чтобы понять что внутри
      const decoded = jwt.decode(token);
      console.log('[AdminAuth] Decoded (unverified):', JSON.stringify(decoded));
    }
  }

  // 3. Последний шанс: если мы видим, что это запрос от админки и что-то идет не так
  console.log('[AdminAuth] Denied access to:', req.method, req.url);
  res.status(403).json({ error: 'Необходима авторизация администратора' });
};
