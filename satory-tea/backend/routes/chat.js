const router = require('express').Router();
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const HTTPS_PROXY = process.env.HTTPS_PROXY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const SYSTEM_PROMPT = 'Ты — сдержанный и профессиональный чайный мастер Satori. Отвечай ТОЛЬКО на русском языке. Твоя экспертиза строго ограничена чайным домом Satori, ассортиментом чая, церемониями и культурой чаепития. Если вопрос не касается чая или Satori, вежливо откажись отвечать. Пиши грамотно, без ошибок. Используй только стандартные кириллические символы, чтобы избежать ошибок кодировки.';

async function callGroq(messages) {
  if (!GROQ_API_KEY) {
    console.log('[Groq Error] GROQ_API_KEY is not configured');
    return null;
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ],
    temperature: 0.5,
  });

  let agent = null;
  if (HTTPS_PROXY) {
    try {
      const { HttpsProxyAgent } = require('https-proxy-agent');
      agent = new HttpsProxyAgent(HTTPS_PROXY);
    } catch (e) {
      console.log('[Groq] Proxy agent pack missing');
    }
  }

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    agent: agent,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            console.log('[Groq Error]', res.statusCode, data);
            return resolve(null);
          }
          resolve(json.choices?.[0]?.message?.content || null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', (e) => {
      console.log('[Groq Net Error]', e.message);
      resolve(null);
    });
    req.setTimeout(15000, () => {
      req.destroy();
      console.log('[Groq Timeout]');
      resolve(null);
    });
    req.write(body);
    req.end();
  });
}

const sessions = new Map();
router.post('/message', async (req, res) => {
  const { message, session_id } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Сообщение обязательно' });
  }

  const sid = session_id || 'default';
  let history = sessions.get(sid) || [];
  history.push({ role: 'user', content: String(message).trim() });

  console.log(`[Chat] Groq request for ${sid}: ${String(message).slice(0, 50)}`);

  let reply = await callGroq(history.slice(-10));
  
  if (!reply) {
    reply = 'Мастер сейчас на дегустации. Попробуйте через минуту! 🍵';
  }

  history.push({ role: 'assistant', content: reply });
  sessions.set(sid, history);
  res.json({ reply, timestamp: new Date().toISOString() });
});

module.exports = router;
