/**
 * iikoApiSync.js
 * Синхронизация меню с iiko Cloud API v2 (внешнее меню).
 *
 * Схема:
 *   POST /api/1/access_token  { apiLogin }  → { token }
 *   POST /api/2/menu          { organizationIds }  → { externalMenus: [{ id, name }] }
 *   POST /api/2/menu/by_id    { externalMenuId, organizationIds }  → { productCategories }
 *
 * Переменные окружения:
 *   IIKO_API_LOGIN        — API-логин из личного кабинета iiko (обязательно)
 *   IIKO_ORGANIZATION_ID  — UUID организации (обязательно)
 *   IIKO_EXTERNAL_MENU_ID — ID внешнего меню (опционально, автоопределяется)
 *   IIKO_SYNC_CRON        — расписание cron (по умолчанию каждые 6 часов)
 */

const https = require('https');
const cron = require('node-cron');
const db = require('../db');

const AUTH_URL = 'https://api-ru.iiko.services/api/1/access_token';
const MENU_V2_URL = 'https://api-ru.iiko.services/api/2/menu';
const MENU_BY_ID_URL = 'https://api-ru.iiko.services/api/2/menu/by_id';

const IIKO_API_LOGIN = process.env.IIKO_API_LOGIN;
const IIKO_ORGANIZATION_ID = process.env.IIKO_ORGANIZATION_ID;

// ─── HTTP утилита ─────────────────────────────────────────────────────────────

function httpsRequest(urlStr, method, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => (responseBody += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('iiko API timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ─── Авторизация ──────────────────────────────────────────────────────────────

/**
 * Получить Bearer-токен iiko Cloud.
 * Токен действует 1 час — кешируем до истечения.
 */
let _tokenCache = null;

async function getIikoToken() {
  const now = Date.now();

  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const res = await httpsRequest(AUTH_URL, 'POST', {
    apiLogin: IIKO_API_LOGIN,
  });

  if (res.status !== 200 || !res.body.token) {
    throw new Error(`iiko auth failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  _tokenCache = {
    token: res.body.token,
    expiresAt: now + 55 * 60 * 1000,
  };

  console.log('[iiko-api] Токен получен');
  return _tokenCache.token;
}

// ─── Синхронизация товаров ────────────────────────────────────────────────────

async function syncProductsFromIiko() {
  if (!IIKO_API_LOGIN || !IIKO_ORGANIZATION_ID) {
    throw new Error('IIKO_API_LOGIN или IIKO_ORGANIZATION_ID не заданы в .env');
  }

  console.log('[iiko-api] Запуск синхронизации меню v2...');

  const token = await getIikoToken();

  // Определяем externalMenuId — из env или автоматически
  let externalMenuId = process.env.IIKO_EXTERNAL_MENU_ID;

  if (!externalMenuId) {
    console.log('[iiko-api] IIKO_EXTERNAL_MENU_ID не задан, получаем список меню...');
    const menuListRes = await httpsRequest(
      MENU_V2_URL,
      'POST',
      { organizationIds: [IIKO_ORGANIZATION_ID] },
      { Authorization: `Bearer ${token}` }
    );

    if (menuListRes.status !== 200) {
      throw new Error(`iiko /api/2/menu error (${menuListRes.status}): ${JSON.stringify(menuListRes.body)}`);
    }

    const menus = menuListRes.body.externalMenus || [];
    if (!menus.length) {
      throw new Error('iiko: нет доступных внешних меню для этой организации');
    }

    externalMenuId = menus[0].id;
    console.log(`[iiko-api] Найдено меню: "${menus[0].name}" (ID=${externalMenuId})`);
  }

  return await syncFromExternalMenu(token, externalMenuId);
}

function extractStockBalances(body) {
  const stockMap = {};

  function traverse(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item && typeof item === 'object') {
          const pId = item.productId || item.itemId || item.id;
          const bal = item.balance !== undefined ? item.balance : item.amount;
          if (pId && bal !== undefined) {
            stockMap[pId] = Number(bal);
          } else {
            traverse(item);
          }
        }
      }
    } else {
      const pId = obj.productId || obj.itemId || obj.id;
      const bal = obj.balance !== undefined ? obj.balance : obj.amount;
      if (pId && bal !== undefined) {
        stockMap[pId] = Number(bal);
      } else {
        for (const key of Object.keys(obj)) {
          traverse(obj[key]);
        }
      }
    }
  }

  traverse(body);
  return stockMap;
}

async function syncFromExternalMenu(token, menuId) {
  console.log(`[iiko-api] Синхронизация из внешнего меню ID=${menuId}...`);

  // Получаем остатки по API
  let stockMap = {};
  let hasStockInfo = false;
  try {
    console.log('[iiko-api] Получение остатков на складах по /api/1/stock_out_balances...');
    const stockRes = await httpsRequest(
      'https://api-ru.iiko.services/api/1/stock_out_balances',
      'POST',
      { organizationIds: [IIKO_ORGANIZATION_ID] },
      { Authorization: `Bearer ${token}` }
    );
    if (stockRes.status === 200) {
      stockMap = extractStockBalances(stockRes.body);
      hasStockInfo = true;
      console.log(`[iiko-api] Успешно получено остатков для ${Object.keys(stockMap).length} товаров`);
    } else {
      console.warn(`[iiko-api] Не удалось получить остатки (статус ${stockRes.status}):`, JSON.stringify(stockRes.body));
    }
  } catch (err) {
    console.error('[iiko-api] Ошибка при получении остатков с iiko:', err.message);
  }

  const res = await httpsRequest(
    MENU_BY_ID_URL,
    'POST',
    { externalMenuId: menuId, organizationIds: [IIKO_ORGANIZATION_ID] },
    { Authorization: `Bearer ${token}` }
  );

  if (res.status !== 200) {
    throw new Error(`iiko /api/2/menu/by_id error (${res.status}): ${JSON.stringify(res.body)}`);
  }

  // API v2 возвращает itemCategories (с товарами) или productCategories (только названия)
  const categories = res.body.itemCategories || res.body.productCategories || [];
  console.log(`[iiko-api] Получено ${categories.length} категорий из внешнего меню`);

  const now = new Date().toISOString();
  let added = 0, updated = 0, skipped = 0;
  const incomingIds = [];

  for (const cat of categories) {
    const categoryName = cat.name || 'Прочее';

    // Автосоздание категории
    const catExists = await db.categories.findOne({ name: categoryName });
    if (!catExists) {
      const count = await db.categories.count({});
      await db.categories.insert({ name: categoryName, is_active: true, sort_order: count, created_at: now });
    }

    for (const item of (cat.items || cat.products || [])) {
      if (!item.name) { skipped++; continue; }

      // API v2: цена
      const price = item.itemSizes?.[0]?.prices?.price
        ?? item.itemSizes?.[0]?.prices?.[0]?.price
        ?? item.sizePrices?.[0]?.price?.currentPrice
        ?? item.prices?.[0]?.price
        ?? item.price
        ?? 0;

      // API v2: изображения
      const imageUrl = item.itemSizes?.[0]?.buttonImageUrl
        || item.imageLinks?.[0]
        || item.images?.[0]?.imageUrl
        || null;

      const iikoId = item.itemId || item.id;
      
      // Определение единицы измерения на основе iiko measureUnit или категории/названия
      let unit = 'г';
      const rawUnit = (item.measureUnit || item.unit || item.measureUnitName || '').toLowerCase().trim();
      
      if (rawUnit === 'кг' || rawUnit === 'г' || rawUnit === 'гр' || rawUnit === 'грамм') {
        unit = 'г';
      } else if (rawUnit === 'шт' || rawUnit === 'шт.' || rawUnit === 'штука') {
        unit = 'шт';
      } else if (rawUnit === 'упак' || rawUnit === 'упаковка' || rawUnit === 'пачка') {
        unit = 'упак';
      } else if (rawUnit === 'набор') {
        unit = 'набор';
      } else {
        // Fallback к эвристике на основе категорий и названий
        const lowerName = item.name.toLowerCase();
        const lowerCat = categoryName.toLowerCase();
        
        if (lowerCat.includes('посуда') || lowerCat.includes('аксессуар') || lowerCat.includes('чаш') || lowerCat.includes('пиал') || lowerCat.includes('гайван') || lowerCat.includes('чабан')) {
          unit = lowerName.includes('набор') ? 'набор' : 'шт';
        } else if (lowerCat.includes('еда') || lowerCat.includes('десерт')) {
          unit = 'шт';
        } else if (lowerName.includes('упак') || lowerName.includes('пачк') || lowerName.includes('блин') || lowerName.includes('плитк')) {
          unit = 'упак';
        }
      }

      incomingIds.push(iikoId);

      // Рассчитываем остаток товара на основе данных с iiko
      let stockVal = undefined;
      if (hasStockInfo) {
        if (stockMap[iikoId] !== undefined) {
          const rawBal = stockMap[iikoId];
          stockVal = (unit === 'г' || unit === 'гр') ? Math.round(rawBal * 1000) : Math.round(rawBal);
        } else {
          // Если товара нет в отчете по остаткам, считаем, что его остаток не ограничен (например, 9999 или 999)
          stockVal = (unit === 'г' || unit === 'гр') ? 9999 : 999;
        }
      }

      const existing = await db.products.findOne({ iiko_id: iikoId });
      if (existing) {
        const updateFields = { 
          name: item.name, 
          category: categoryName, 
          price, 
          description: item.description || '', 
          unit,
          active: true, 
          updated_at: now 
        };
        if (imageUrl) updateFields.image_url = imageUrl;
        if (hasStockInfo) updateFields.stock = stockVal;
        
        await db.products.update({ iiko_id: iikoId }, { $set: updateFields });
        updated++;
      } else {
        const insertDoc = {
          iiko_id: iikoId, name: item.name, category: categoryName, price,
          description: item.description || '', image_url: imageUrl, active: true,
          unit,
          is_manual: false, price_override: null, category_override: null,
          rating: 0, reviews_count: 0, badge: null, created_at: now, updated_at: now,
        };
        if (hasStockInfo) insertDoc.stock = stockVal;
        
        await db.products.insert(insertDoc);
        added++;
      }
    }
  }

  // Мягкое удаление
  const allActive = await db.products.find({ active: true, is_manual: { $ne: true } });
  for (const p of allActive) {
    if (p.iiko_id && !incomingIds.includes(p.iiko_id)) {
      await db.products.update({ _id: p._id }, { $set: { active: false, updated_at: now } });
    }
  }

  await db.sync_log.insert({ type: 'products_iiko_api', status: 'success', rows_processed: incomingIds.length, created_at: now, detail: { added, updated, skipped } });
  console.log(`[iiko-api] Готово: +${added} новых, ~${updated} обновлено, ×${skipped} пропущено`);
  return { added, updated, skipped, total: incomingIds.length };
}

// ─── Ручной запуск синхронизации (для роута /api/iiko/sync/api) ───────────────

async function triggerManualSync() {
  return syncProductsFromIiko();
}

// ─── Инициализация cron-задачи ────────────────────────────────────────────────

function initIikoApiSync() {
  if (!IIKO_API_LOGIN) {
    console.log('[iiko-api] IIKO_API_LOGIN не задан — автосинхронизация отключена');
    return;
  }

  const cronSchedule = process.env.IIKO_SYNC_CRON || '0 0,6,12,18 * * *';

  if (!cron.validate(cronSchedule)) {
    console.error(`[iiko-api] Неверный cron: "${cronSchedule}"`);
    return;
  }

  cron.schedule(cronSchedule, () => {
    syncProductsFromIiko().catch(e => {
      console.error(`[iiko-api] Ошибка в cron: ${e.message}`);
    });
  });

  console.log(`[iiko-api] Автосинхронизация запланирована: ${cronSchedule}`);
}

module.exports = { initIikoApiSync, syncProductsFromIiko, triggerManualSync };
