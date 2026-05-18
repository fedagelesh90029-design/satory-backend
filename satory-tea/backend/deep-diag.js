require('dotenv').config();
const https = require('https');

const AUTH_URL = 'https://api-ru.iiko.services/api/1/access_token';
const MENU_BY_ID_URL = 'https://api-ru.iiko.services/api/2/menu/by_id';

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;
const IIKO_ORGANIZATION_ID = process.env.IIKO_ORGANIZATION_ID;
const IIKO_EXTERNAL_MENU_ID = process.env.IIKO_EXTERNAL_MENU_ID;

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
    console.log('--- Диагностика iiko ---');
    console.log('1. Авторизация...');
    const authRes = await httpsRequest(AUTH_URL, 'POST', { apiLogin: IIKO_API_LOGIN });
    const token = authRes.body.token;
    if (!token) {
        console.error('Ошибка:', authRes.body);
        return;
    }
    console.log('OK.');

    console.log('2. Проверка меню ID:', IIKO_EXTERNAL_MENU_ID);
    const res = await httpsRequest(MENU_BY_ID_URL, 'POST', 
      { externalMenuId: IIKO_EXTERNAL_MENU_ID, organizationIds: [IIKO_ORGANIZATION_ID] },
      { Authorization: `Bearer ${token}` }
    );

    if (res.status === 200) {
        const cats = res.body.itemCategories || res.body.productCategories || [];
        console.log(`УСПЕХ! Найдено категорий: ${cats.length}`);
        let totalItems = 0;
        cats.forEach(c => totalItems += (c.items || c.products || []).length);
        console.log(`Всего товаров в меню: ${totalItems}`);
        
        if (totalItems === 0) {
            console.log('ВНИМАНИЕ: Меню найдено, но оно ПУСТОЕ. Добавьте товары в это внешнее меню в iiko Cloud.');
        }
    } else {
        console.error(`ОШИБКА API (${res.status}):`, JSON.stringify(res.body));
    }
  } catch (e) {
    console.error('Критическая ошибка:', e.message);
  }
}

test();
