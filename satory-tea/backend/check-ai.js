require('dotenv').config();
const Groq = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

async function check() {
  console.log('--- Проверка Groq ---');
  console.log('GROQ_API_KEY:', GROQ_API_KEY ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');

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
}

check();
