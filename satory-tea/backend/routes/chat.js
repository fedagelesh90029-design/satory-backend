const router = require('express').Router();
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const HTTPS_PROXY = process.env.HTTPS_PROXY || '';

async function callGroq(messages) {
  if (!GROQ_API_KEY) return null;

  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'Ты — сдержанный и профессиональный чайный мастер Satori. Отвечай ТОЛЬКО на русском языке. Твоя экспертиза строго ограничена чайным домом Satori, ассортиментом чая, церемониями и культурой чаепития. Если вопрос не касается чая или Satori, вежливо откажись отвечать. Пиши грамотно, без ошибок. Используй только стандартные кириллические символы, чтобы избежать ошибок кодировки.' },
      ...messages
    ]
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
    req.write(body);
    req.end();
  });
}

const sessions = new Map();
router.post('/message', async (req, res) => {
  const { message, session_id } = req.body;
  const sid = session_id || 'default';
  let history = sessions.get(sid) || [];
  history.push({ role: 'user', content: message });

  let reply = await callGroq(history.slice(-10));
  
  if (!reply) {
    reply = 'Мастер сейчас на дегустации. Попробуйте через минуту! 🍵';
  }

  history.push({ role: 'assistant', content: reply });
  sessions.set(sid, history);
  res.json({ reply, timestamp: new Date().toISOString() });
});

module.exports = router;
