const router = require('express').Router();
const Groq = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const SYSTEM_PROMPT = `Ты — чайный советник чайного дома «Satori». Твоё имя — Советник Satori.

О чайном доме:
- Специализация: китайский чай, особенно пуэры (шу и шэн), улуны, белый чай
- Проводим чайные церемонии, мастер-классы по гунфу-ча, дегустации пуэров
- Есть программа лояльности: Бронза (0-499 баллов), Серебро (500-999), Золото (1000+)
- Бонусы начисляются при каждой покупке — кассир сканирует QR-код из приложения
- 1 балл = 1 рубль при списании

Твои задачи:
- Помогать выбрать чай под вкус, настроение, опыт
- Рассказывать о видах чая, способах заваривания, чайной культуре
- Отвечать на вопросы о программе лояльности и бонусах
- Информировать о мероприятиях (дегустации, мастер-классы, церемонии)
- Помогать с вопросами по приложению

Правила:
- Отвечай только на русском языке
- Будь дружелюбным и тёплым, как настоящий чайный мастер
- Если не знаешь точного ответа — честно скажи и предложи обратиться в поддержку
- Не придумывай конкретные цены и даты — скажи проверить в каталоге или разделе событий
- Ответы краткие и по делу, без лишней воды
- Используй эмодзи умеренно 🍵`;

const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (s && Date.now() - s.lastActive < SESSION_TTL) {
    s.lastActive = Date.now();
    return s.messages;
  }
  const messages = [];
  sessions.set(sessionId, { messages, lastActive: Date.now() });
  return messages;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActive > SESSION_TTL) sessions.delete(id);
  }
}, 10 * 60 * 1000);

router.post('/message', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Нет сообщения' });

  if (!GROQ_API_KEY) {
    return res.json({ reply: getFallbackReply(message), timestamp: new Date().toISOString() });
  }

  const sid = session_id || 'default';
  const history = getSession(sid);
  history.push({ role: 'user', content: message });

  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10),
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Не удалось получить ответ';
    history.push({ role: 'assistant', content: reply });
    res.json({ reply, timestamp: new Date().toISOString(), session_id: sid });
  } catch (e) {
    console.error('[Groq error]', e.message);
    res.json({ reply: getFallbackReply(message), timestamp: new Date().toISOString() });
  }
});

router.post('/reset', (req, res) => {
  const { session_id } = req.body;
  if (session_id) sessions.delete(session_id);
  res.json({ success: true });
});

function getFallbackReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes('пуэр') && lower.includes('новичк')) return 'Для начала рекомендую Шу Пуэр — он мягче и земляной. Начните с "Золотого Дворца" 2019 года. 🍵';
  if (lower.includes('шу')) return 'Шу Пуэр — ферментированный чай с насыщенным вкусом земли и древесины. Заваривайте при 95-100°C, 5-7г на 150мл.';
  if (lower.includes('шэн')) return 'Шэн Пуэр — живой чай, который меняется с годами. Молодой шэн свежий и терпкий, выдержанный — глубокий и сложный.';
  if (lower.includes('церемони') || lower.includes('гунфу')) return 'Чайная церемония гунфу-ча — искусство заваривания в маленьком чайнике. Много коротких проливов, каждый раскрывает новые грани вкуса.';
  if (lower.includes('завар')) return 'Для пуэра: вода 95-100°C, 5-7г на 100мл, первый пролив 10-15 секунд, каждый следующий +5 секунд.';
  if (lower.includes('мероприяти') || lower.includes('событи')) return 'Ближайшие мероприятия смотрите в разделе «События» приложения. Там можно сразу записаться! 📅';
  if (lower.includes('бонус') || lower.includes('баланс')) return 'Бонусы начисляются при каждой покупке. Покажите QR-код кассиру — он найдёт вас в системе. Баланс обновляется в профиле.';
  if (lower.includes('улун')) return 'Улун — полуферментированный чай между зелёным и чёрным. Наш "Дикий Улун" с медовым послевкусием отлично подойдёт для знакомства.';
  return 'Я чайный советник Satory 🍵 Спросите меня о видах чая, заваривании, мероприятиях или программе лояльности.';
}

module.exports = router;
