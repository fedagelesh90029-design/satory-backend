const router = require('express').Router();
const https = require('https');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

// Опциональная авторизация — чат доступен всем
function authOptional(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ') && SECRET) {
    try {
      req.user = jwt.verify(auth.slice(7), SECRET);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

const SYSTEM_PROMPT = `Ты — помощник чайного магазина Satori Tea в Адлере (ул. Кирова, 26).

Твоя задача:
- Помогать выбрать чай (у нас китайский чай: пуэр, улун, зелёный, белый, красный)
- Рассказывать о сортах и способах заварки
- Отвечать на вопросы о программе лояльности и бонусах
- Помогать с оформлением заказов

Отвечай кратко, дружелюбно и по делу на русском языке. Используй эмодзи 🍵 где уместно.`;

// ─── Запрос к Cerebras AI ────────────────────────────────────────────────────

function cerebrasRequest(message) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama3.1-8b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const req = https.request({
      hostname: 'api.cerebras.ai',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`Cerebras ${res.statusCode}: ${json.error?.message || data.slice(0, 100)}`));
            return;
          }
          const reply = json.choices?.[0]?.message?.content;
          resolve(reply || null);
        } catch (e) {
          reject(new Error(`Cerebras parse error: ${data.slice(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Cerebras timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── POST /api/chat/message ───────────────────────────────────────────────────

router.post('/message', authOptional, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Сообщение обязательно' });

  // ── Cerebras AI ───────────────────────────────────────────────────────────
  if (CEREBRAS_API_KEY) {
    try {
      console.log('[chat] Cerebras запрос:', message.slice(0, 80));
      const reply = await cerebrasRequest(message);
      if (reply) {
        console.log('[chat] Cerebras ответ, длина:', reply.length);
        return res.json({ reply });
      }
      console.error('[chat] Cerebras: пустой ответ, используем fallback');
    } catch (e) {
      console.error('[chat] Cerebras error:', e.message);
    }
  } else {
    console.warn('[chat] CEREBRAS_API_KEY не задан — keyword fallback');
  }

  // ── Fallback — ответы по ключевым словам ─────────────────────────────────
  const lw = message.toLowerCase();

  if (lw.includes('привет') || lw.includes('здравств')) {
    return res.json({ reply: 'Здравствуйте! 🍵 Я помощник Satori Tea. Помогу выбрать чай, расскажу о сортах или отвечу на вопросы о программе лояльности. Чем могу помочь?' });
  }
  if (lw.includes('цен') || lw.includes('стоимость') || lw.includes('сколько')) {
    return res.json({ reply: 'Цены на наш чай варьируются от 300₽ до 3000₽ за 100г в зависимости от сорта:\n\n🍵 Шу пуэр — от 400₽\n🍵 Шэн пуэр — от 500₽\n🍵 Улун — от 600₽\n🍵 Белый чай — от 700₽\n\nТочные цены смотрите в каталоге!' });
  }
  if (lw.includes('пуэр')) {
    return res.json({ reply: 'Пуэр — постферментированный китайский чай. У нас два вида:\n\n🟤 Шу пуэр (тёмный) — мягкий, землистый вкус, помогает пищеварению\n🟢 Шэн пуэр (светлый) — свежий, терпкий, бодрит\n\nЗаваривать 95°C, первая заварка 5–7 секунд. Какой интересует?' });
  }
  if (lw.includes('улун') || lw.includes('оолонг')) {
    return res.json({ reply: 'Улун — полуферментированный чай, золотая середина между зелёным и красным 🌿\n\nПопулярные сорта:\n• Да Хун Пао — насыщенный, с нотками карамели\n• Те Гуань Инь — цветочный, освежающий\n\nЗаваривать 90–95°C, проливами по 10–15 секунд.' });
  }
  if (lw.includes('бонус') || lw.includes('лояльность') || lw.includes('скидк')) {
    return res.json({ reply: 'В Satori Tea действует программа лояльности! 💛\n\n• За каждую покупку начисляются бонусы\n• 1 бонус = 1 рубль при следующей покупке\n• Статусы: Бронза → Серебро → Золото\n• Чем выше статус, тем больше бонусов\n\nПосмотреть баланс можно в профиле приложения!' });
  }
  if (lw.includes('заказ') || lw.includes('доставк') || lw.includes('купить')) {
    return res.json({ reply: 'Оформить заказ можно:\n\n📱 В мобильном приложении — добавьте товары в корзину\n🏪 В нашей чайной: ул. Кирова, 26, Адлер\n\nСамовывоз бесплатно. Доставку пока не делаем, но вы можете забрать заказ в чайной!' });
  }

  return res.json({ reply: 'Я помощник Satori Tea 🍵\n\nМогу помочь с:\n• Выбором чая и рассказать о сортах\n• Ценами и наличием\n• Программой лояльности\n• Оформлением заказа\n\nЗадайте ваш вопрос!' });
});

module.exports = router;
