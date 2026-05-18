require('dotenv').config();
const Groq = require('groq-sdk');
const OpenAI = require('openai');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

async function check() {
  console.log('--- Проверка ключей AI ---');
  console.log('GROQ_API_KEY:', GROQ_API_KEY ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');
  console.log('XAI_API_KEY:', XAI_API_KEY ? 'ПРИСУТСТВУЕТ' : 'ОТСУТСТВУЕТ');

  if (GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      });
      console.log('Groq: OK');
    } catch (e) {
      console.log('Groq: ERROR -', e.message);
    }
  }

  if (XAI_API_KEY) {
    try {
      const xai = new OpenAI({ apiKey: XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
      const res = await xai.chat.completions.create({
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5
      });
      console.log('xAI (Grok): OK');
    } catch (e) {
      console.log('xAI (Grok): ERROR -', e.message);
    }
  }
}

check();
