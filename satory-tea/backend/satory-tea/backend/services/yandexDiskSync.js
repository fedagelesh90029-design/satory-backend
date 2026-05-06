/**
 * yandexDiskSync.js
 * Модуль автоматической синхронизации с Яндекс.Диском.
 * Скачивает последние файлы из указанных папок и передаёт на обработку.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const cron = require('node-cron');

const { runProductSync, runBonusSync } = require('../routes/iiko');
const db = require('../db');

const YANDEX_API = 'https://cloud-api.yandex.net/v1/disk/resources';

// ─── Состояние синхронизации (in-memory + персистентность через sync_log) ─────

const syncState = {
  products: { last_success: null, last_error: null, last_error_at: null },
  bonuses:  { last_success: null, last_error: null, last_error_at: null },
};

// ─── HTTP-утилита (без axios — только встроенный https) ───────────────────────

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function httpsGetJSON(url, token) {
  return httpsGet(url, { Authorization: `OAuth ${token}` })
    .then(({ status, body }) => {
      const json = JSON.parse(body.toString('utf8'));
      if (status >= 400) throw new Error(json.message || json.error || `HTTP ${status}`);
      return json;
    });
}

// ─── Основная функция скачивания ──────────────────────────────────────────────

/**
 * Получает список файлов в папке Яндекс.Диска, находит последний по дате,
 * скачивает его во временную папку и возвращает путь.
 *
 * @param {string} folderPath  — путь на Яндекс.Диске, напр. "disk:/iiko/products"
 * @param {RegExp|string} pattern — шаблон имени файла, напр. /products.*\.xlsx$/i
 * @returns {Promise<string>} — путь к скачанному файлу
 */
async function downloadLatestFileFromYandex(folderPath, pattern) {
  const token = process.env.YANDEX_TOKEN;
  if (!token) throw new Error('YANDEX_TOKEN не задан в .env');

  // 1. Получаем список файлов в папке
  const listUrl = `${YANDEX_API}?path=${encodeURIComponent(folderPath)}&fields=_embedded.items.name,_embedded.items.modified,_embedded.items.type,_embedded.items.path&limit=100`;
  const data = await httpsGetJSON(listUrl, token);

  const items = data._embedded?.items || [];
  if (!items.length) throw new Error(`Папка "${folderPath}" пуста или не существует`);

  // 2. Фильтруем по шаблону и типу "file"
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
  const files = items.filter(i => i.type === 'file' && regex.test(i.name));
  if (!files.length) throw new Error(`В папке "${folderPath}" нет файлов, соответствующих шаблону ${regex}`);

  // 3. Берём последний по дате изменения
  files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  const latest = files[0];
  console.log(`[yadisk] Найден файл: ${latest.name} (${latest.modified})`);

  // 4. Получаем ссылку для скачивания
  const dlUrl = `${YANDEX_API}/download?path=${encodeURIComponent(latest.path)}`;
  const dlData = await httpsGetJSON(dlUrl, token);
  if (!dlData.href) throw new Error('Яндекс.Диск не вернул ссылку для скачивания');

  // 5. Скачиваем файл во временную папку
  const tmpPath = path.join(os.tmpdir(), `satory_${Date.now()}_${latest.name}`);
  await downloadFile(dlData.href, tmpPath);
  console.log(`[yadisk] Файл скачан: ${tmpPath}`);

  return tmpPath;
}

/**
 * Скачивает файл по прямой ссылке (без авторизации — ссылка уже подписана).
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    function doGet(currentUrl, redirects = 0) {
      if (redirects > 5) return reject(new Error('Слишком много редиректов'));
      https.get(currentUrl, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return doGet(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Ошибка скачивания: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      }).on('error', reject);
    }

    doGet(url);
  });
}

// ─── Синхронизация товаров ────────────────────────────────────────────────────

async function processProductsSync() {
  const folderPath = process.env.YANDEX_PRODUCTS_FOLDER_ID;
  if (!folderPath) throw new Error('YANDEX_PRODUCTS_FOLDER_ID не задан в .env');

  console.log('[yadisk-sync] Запуск синхронизации товаров...');
  let tmpFile = null;

  try {
    tmpFile = await downloadLatestFileFromYandex(folderPath, /products.*\.(xlsx|xls|csv)$/i);
    const delta = await runProductSync(tmpFile);

    const now = new Date().toISOString();
    syncState.products.last_success = now;
    syncState.products.last_error = null;
    syncState.products.last_error_at = null;

    await db.sync_log.insert({
      type: 'products_yadisk', status: 'success',
      rows_processed: delta.total, created_at: now,
      detail: delta,
    });

    console.log(`[yadisk-sync] Товары синхронизированы: +${delta.added} новых, ~${delta.updated} обновлено`);
    return delta;
  } catch (e) {
    const now = new Date().toISOString();
    syncState.products.last_error = e.message;
    syncState.products.last_error_at = now;

    await db.sync_log.insert({
      type: 'products_yadisk', status: 'error',
      rows_processed: 0, created_at: now,
      detail: { error: e.message },
    });

    console.error(`[yadisk-sync] Ошибка синхронизации товаров: ${e.message}`);
    throw e;
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// ─── Синхронизация бонусов ────────────────────────────────────────────────────

async function processBonusesSync() {
  const folderPath = process.env.YANDEX_BONUSES_FOLDER_ID;
  if (!folderPath) throw new Error('YANDEX_BONUSES_FOLDER_ID не задан в .env');

  console.log('[yadisk-sync] Запуск синхронизации бонусов...');
  let tmpFile = null;

  try {
    tmpFile = await downloadLatestFileFromYandex(folderPath, /bonuses.*\.(xlsx|xls|csv)$/i);
    const delta = await runBonusSync(tmpFile);

    const now = new Date().toISOString();
    syncState.bonuses.last_success = now;
    syncState.bonuses.last_error = null;
    syncState.bonuses.last_error_at = null;

    await db.sync_log.insert({
      type: 'bonuses_yadisk', status: 'success',
      rows_processed: delta.total, created_at: now,
      detail: delta,
    });

    console.log(`[yadisk-sync] Бонусы синхронизированы: ${delta.matched} совпадений, ${delta.unmatched} не найдено`);
    return delta;
  } catch (e) {
    const now = new Date().toISOString();
    syncState.bonuses.last_error = e.message;
    syncState.bonuses.last_error_at = now;

    await db.sync_log.insert({
      type: 'bonuses_yadisk', status: 'error',
      rows_processed: 0, created_at: now,
      detail: { error: e.message },
    });

    console.error(`[yadisk-sync] Ошибка синхронизации бонусов: ${e.message}`);
    throw e;
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// ─── Инициализация cron-задач ─────────────────────────────────────────────────

function initYandexSync() {
  const token = process.env.YANDEX_TOKEN;
  if (!token) {
    console.log('[yadisk-sync] YANDEX_TOKEN не задан — синхронизация с Яндекс.Диском отключена');
    return;
  }

  const productsCron = process.env.SYNC_CRON_PRODUCTS || '0 * * * *';
  const bonusesCron  = process.env.SYNC_CRON_BONUSES  || '0 * * * *';

  if (process.env.YANDEX_PRODUCTS_FOLDER_ID) {
    if (!cron.validate(productsCron)) {
      console.error(`[yadisk-sync] Неверный cron SYNC_CRON_PRODUCTS: "${productsCron}"`);
    } else {
      cron.schedule(productsCron, () => processProductsSync().catch(() => {}));
      console.log(`[yadisk-sync] Синхронизация товаров запланирована: ${productsCron}`);
    }
  }

  if (process.env.YANDEX_BONUSES_FOLDER_ID) {
    if (!cron.validate(bonusesCron)) {
      console.error(`[yadisk-sync] Неверный cron SYNC_CRON_BONUSES: "${bonusesCron}"`);
    } else {
      cron.schedule(bonusesCron, () => processBonusesSync().catch(() => {}));
      console.log(`[yadisk-sync] Синхронизация бонусов запланирована: ${bonusesCron}`);
    }
  }
}

module.exports = { initYandexSync, processProductsSync, processBonusesSync, syncState };
