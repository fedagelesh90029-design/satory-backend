require('dotenv').config();
const https = require('https');

const AUTH_URL = 'https://api-ru.iiko.services/api/1/access_token';
const MENU_V2_URL = 'https://api-ru.iiko.services/api/2/menu';

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;
const IIKO_ORGANIZATION_ID = process.env.IIKO_ORGANIZATION_ID;

function httpsRequest(urlStr, method, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => (responseBody += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(responseBody) }); }
        catch { resolve({ status: res.statusCode, body: responseBody }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function test() {
  try {
    console.log('1. Получаем токен...');
    const authRes = await httpsRequest(AUTH_URL, 'POST', { apiLogin: IIKO_API_LOGIN });
    if (!authRes.body.token) {
        console.error('Ошибка авторизации:', authRes.body);
        return;
    }
    const token = authRes.body.token;
    console.log('Токен получен.');

    console.log('2. Получаем список меню для организации:', IIKO_ORGANIZATION_ID);
    const menuRes = await httpsRequest(MENU_V2_URL, 'POST', 
        { organizationIds: [IIKO_ORGANIZATION_ID] },
        { Authorization: `Bearer ${token}` }
    );

    if (menuRes.status !== 200) {
        console.error('Ошибка получения меню:', menuRes.status, menuRes.body);
        return;
    }

    const menus = menuRes.body.externalMenus || [];
    if (menus.length === 0) {
        console.log('ВНИМАНИЕ: Список внешних меню пуст. Создайте внешнее меню в iiko Cloud.');
    } else {
        console.log('Найденные меню:');
        menus.forEach(m => {
            console.log(`- Название: "${m.name}", ID: ${m.id}`);
        });
    }
  } catch (e) {
    console.error('Ошибка:', e.message);
  }
}

test();
