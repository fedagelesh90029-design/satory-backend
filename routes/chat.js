const router = require('express').Router();
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'satory_secret_2026';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

// POST /api/chat/message
router.post('/message', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Сообщение обязательно' });

  // Пробуем Groq AI
  if (process.env.GROQ_API_KEY) {
    try {
      const Groq = require('groq-sdk');
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты — помощник чайного магазина Satori Tea. Отвечай кратко и по делу на русском языке. Помогай с выбором чая, рассказывай о сортах, ценах и заказах.',
          },
          { role: 'user', content: message },
        ],
        model: 'llama3-8b-8192',
        max_tokens: 500,
      });
      return res.json({ reply: completion.choices[0]?.message?.content || 'Не могу ответить' });
    } catch (e) {
      console.error('[chat] Groq error:', e.message);
    }
  }

  // Fallback ответ
  res.json({ reply: 'Здравствуйте! Я помощник Satori Tea. Чем могу помочь? Вы можете спросить о нашем ассортименте, ценах или сделать заказ.' });
});

module.exports = router;
