require('dotenv').config();
const Groq = require('groq-sdk');
const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;

async function check() {
  console.log('--- Проверка AI Провайдеров ---');
  console.log('GROQ_API_KEY:', GROQ_API_KEY ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');
  console.log('CEREBRAS_API_KEY:', CEREBRAS_API_KEY ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');

  if (GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      });
      console.log(`Groq: OK (${GROQ_MODEL})`);
    } catch (e) {
      console.log('Groq: ERROR -', e.message);
    }
  }

  if (CEREBRAS_API_KEY) {
    try {
      const result = await new Promise((resolve, reject) => {
        const body = JSON.stringify({
          model: 'zai-glm-4.7',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        });
        const req = https.request({
          hostname: 'api.cerebras.ai',
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CEREBRAS_API_KEY}`
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) resolve(JSON.parse(data));
            else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      console.log('Cerebras: OK (zai-glm-4.7)');
    } catch (e) {
      console.log('Cerebras: ERROR -', e.message);
    }
  }
}

check();
