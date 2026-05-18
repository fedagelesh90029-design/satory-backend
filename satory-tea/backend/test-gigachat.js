require('dotenv').config();
const https = require('https');
const crypto = require('crypto');

const GIGACHAT_CREDENTIALS = process.env.GIGACHAT_CREDENTIALS;

async function test() {
  console.log('--- Тест GigaChat ---');
  if (!GIGACHAT_CREDENTIALS) {
    console.error('Ошибка: GIGACHAT_CREDENTIALS не найден в .env');
    return;
  }

  const ruid = crypto.randomUUID();
  console.log('1. Получение токена...');
  
  const tokenData = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'ngw.devices.sberbank.ru',
      path: '/api/v2/oauth',
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': ruid,
        'Authorization': `Basic ${GIGACHAT_CREDENTIALS}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', e => { console.error(e); resolve(null); });
    req.write('scope=GIGACHAT_API_PERS');
    req.end();
  });

  if (!tokenData || !tokenData.access_token) {
    console.error('Ошибка получения токена:', tokenData);
    return;
  }
  console.log('Токен получен успешно!');

  console.log('2. Тестовый вопрос: "Привет, какой чай посоветуешь?"');
  const chatRes = await new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'GigaChat',
      messages: [{ role: 'user', content: 'Привет, какой чай посоветуешь?' }],
      max_tokens: 100
    });
    const req = https.request({
      hostname: 'gigachat.devices.sberbank.ru',
      path: '/api/v1/chat/completions',
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', e => { console.error(e); resolve(null); });
    req.write(body);
    req.end();
  });

  if (chatRes && chatRes.choices) {
    console.log('ОТВЕТ GIGACHAT:', chatRes.choices[0].message.content);
    console.log('--- ТЕСТ ПРОЙДЕН УСПЕШНО ---');
  } else {
    console.error('Ошибка чата:', chatRes);
  }
}

test();
