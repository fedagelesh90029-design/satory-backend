const https = require('https');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const testToken = 'ExponentPushToken[dummy-token-for-testing]';

async function testPush() {
  console.log('--- ТЕСТ ПУШ-УВЕДОМЛЕНИЙ ---');
  console.log('Проверка связи с Expo...');

  const messages = [{
    to: testToken,
    title: 'Тест',
    body: 'Проверка связи',
  }];

  const payload = JSON.stringify(messages);
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  return new Promise((resolve) => {
    const req = https.request(EXPO_PUSH_URL, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('СТАТУС:', res.statusCode);
        console.log('ОТВЕТ EXPO:', data);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('ОШИБКА СЕТИ:', e.message);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

testPush();
