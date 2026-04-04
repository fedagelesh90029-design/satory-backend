const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Нет токена' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
};
