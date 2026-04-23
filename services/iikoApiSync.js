/**
 * iikoApiSync.js
 * Синхронизация меню с iiko Cloud API.
 *
 * Схема авторизации iiko Cloud:
 *   POST /api/1/access_token  { apiLogin }  → { token }
 *   POST /api/1/nomenclature  { organizationId }  Bearer token → { products, groups }
 *
 * Переменные окружения:
 *   IIKO_API_LOGIN        — API-логин из личного кабинета iiko (обязательно)
 *   IIKO_ORGANIZATION_ID  — UUID организации (обязательно)
 *   IIKO_API_URL          — базовый URL (по умолчанию https://api.iiko.ru/api/1)
 *   IIKO_SYNC_CRON        — расписание cron (по умолчанию каждые 6 часов)
 */

const https = require('https');
const cron = require('node-cron');
const db = require('../db');

const BASE_URL = (process.env.IIKO_API_URL || 'https://api.iiko.ru/api/1').replace(/\/$/, '');
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

  const res = await httpsRequest(`${BASE_URL}/access_token`, 'POST', {
    apiLogin: IIKO_API_LOGIN,
  });

  if (res.status !== 200 || !res.body.token) {
    throw new Error(`iiko auth failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  _tokenCache = {
    token: res.body.token,
    expiresAt: now + 55 * 60 * 1000, // 55 минут
  };

  console.log('[iiko-api] Токен получен');
  return _tokenCache.token;
}

// ─── Синхронизация товаров ────────────────────────────────────────────────────

async function syncProductsFromIiko() {
  if (!IIKO_API_LOGIN || !IIKO_ORGANIZATION_ID) {
    throw new Error('IIKO_API_LOGIN или IIKO_ORGANIZATION_ID не заданы в .env');
  }

  console.log('[iiko-api] Запуск синхронизации меню...');

  const token = await getIikoToken();

  // Пробуем внешнее меню если задан IIKO_EXTERNAL_MENU_ID
  const externalMenuId = process.env.IIKO_EXTERNAL_MENU_ID;
  if (externalMenuId) {
    return await syncFromExternalMenu(token, externalMenuId);
  }

  // Иначе — номенклатура
  return await syncFromNomenclature(token);
}

async function syncFromExternalMenu(token, menuId) {
  console.log(`[iiko-api] Синхронизация из внешнего меню ID=${menuId}...`);

  const res = await httpsRequest(
    `${BASE_URL}/menu/by_id`,
    'POST',
    { externalMenuId: menuId, organizationIds: [IIKO_ORGANIZATION_ID] },
    { Authorization: `Bearer ${token}` }
  );

  if (res.status !== 200) {
    throw new Error(`iiko menu/by_id error (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const categories = res.body.itemCategories || [];
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

    for (const item of (cat.items || [])) {
      if (!item.name) { skipped++; continue; }

      const price = item.sizePrices?.[0]?.price?.currentPrice ?? item.price ?? 0;
      const imageUrl = item.imageLinks?.[0] ?? null;
      const iikoId = item.itemId || item.id;

      incomingIds.push(iikoId);

      const existing = await db.products.findOne({ iiko_id: iikoId });
      if (existing) {
        await db.products.update({ iiko_id: iikoId }, {
          $set: { name: item.name, category: categoryName, price, description: item.description || '', image_url: imageUrl, active: true, updated_at: now }
        });
        updated++;
      } else {
        await db.products.insert({
          iiko_id: iikoId, name: item.name, category: categoryName, price,
          description: item.description || '', image_url: imageUrl, active: true,
          is_manual: false, price_override: null, category_override: null,
          rating: 0, reviews_count: 0, badge: null, created_at: now, updated_at: now,
        });
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

async function syncFromNomenclature(token) {
  console.log('[iiko-api] Синхронизация из номенклатуры...');
  const res = await httpsRequest(
    `${BASE_URL}/nomenclature`,
    'POST',
    { organizationId: IIKO_ORGANIZATION_ID },
    { Authorization: `Bearer ${token}` }
  );

  if (res.status !== 200) {
    throw new Error(`iiko nomenclature error (${res.status}): ${JSON.stringify(res.body)}`);
  }

  // iiko возвращает products (товары) и groups (категории)
  const products = res.body.products || [];
  const groups = res.body.groups || [];

  // Строим карту id → название категории
  const groupMap = {};
  function flattenGroups(arr) {
    for (const g of arr) {
      groupMap[g.id] = g.name;
      if (g.children?.length) flattenGroups(g.children);
    }
  }
  flattenGroups(groups);

  console.log(`[iiko-api] Получено ${products.length} товаров, ${Object.keys(groupMap).length} категорий`);

  const now = new Date().toISOString();
  let added = 0, updated = 0, skipped = 0;
  const incomingIds = [];

  for (const item of products) {
    // Пропускаем удалённые и без названия
    if (item.isDeleted || !item.name) { skipped++; continue; }

    // Цена: берём первый размер или поле price
    const price =
      item.sizePrices?.[0]?.price?.currentPrice ??
      item.price?.currentPrice ??
      0;

    const categoryName = groupMap[item.parentGroup] || 'Прочее';
    const imageUrl = item.imageLinks?.[0] ?? null;

    incomingIds.push(item.id);

    // Автосоздание категории
    const catExists = await db.categories.findOne({ name: categoryName });
    if (!catExists) {
      const count = await db.categories.count({});
      await db.categories.insert({
        name: categoryName,
        is_active: true,
        sort_order: count,
        created_at: now,
      });
    }

    const existing = await db.products.findOne({ iiko_id: item.id });

    if (existing) {
      await db.products.update(
        { iiko_id: item.id },
        {
          $set: {
            name: item.name,
            category: categoryName,
            price,
            description: item.description || '',
            image_url: imageUrl,
            active: true,
            updated_at: now,
            // price_override и category_override не трогаем
          },
        }
      );
      updated++;
    } else {
      await db.products.insert({
        iiko_id: item.id,
        name: item.name,
        category: categoryName,
        price,
        description: item.description || '',
        image_url: imageUrl,
        active: true,
        is_manual: false,
        price_override: null,
        category_override: null,
        rating: 0,
        reviews_count: 0,
        badge: null,
        created_at: now,
        updated_at: now,
      });
      added++;
    }
  }

  // Мягкое удаление товаров, которых больше нет в iiko
  const allActive = await db.products.find({ active: true, is_manual: { $ne: true } });
  for (const p of allActive) {
    if (p.iiko_id && !incomingIds.includes(p.iiko_id)) {
      await db.products.update({ _id: p._id }, { $set: { active: false, updated_at: now } });
    }
  }

  await db.sync_log.insert({
    type: 'products_iiko_api',
    status: 'success',
    rows_processed: products.length,
    created_at: now,
    detail: { added, updated, skipped },
  });

  console.log(`[iiko-api] Готово: +${added} новых, ~${updated} обновлено, ×${skipped} пропущено`);
  return { added, updated, skipped, total: products.length };
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
