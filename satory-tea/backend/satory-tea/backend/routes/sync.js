/**
 * routes/sync.js
 * Эндпоинты управления синхронизацией с Яндекс.Диском.
 */

const router = require('express').Router();
const db = require('../db');
const { processProductsSync, processBonusesSync, syncState } = require('../services/yandexDiskSync');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'satory_admin_2026';

function adminOnly(req, res, next) {
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  next();
}

// ─── GET /api/sync/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  // Последние записи из лога для каждого типа
  const allLogs = await db.sync_log.find({
    type: { $in: ['products_yadisk', 'bonuses_yadisk'] },
  });
  allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const lastProductsLog = allLogs.find(l => l.type === 'products_yadisk');
  const lastBonusesLog  = allLogs.find(l => l.type === 'bonuses_yadisk');

  res.json({
    products: {
      last_success:   syncState.products.last_success,
      last_error:     syncState.products.last_error,
      last_error_at:  syncState.products.last_error_at,
      last_log:       lastProductsLog || null,
    },
    bonuses: {
      last_success:   syncState.bonuses.last_success,
      last_error:     syncState.bonuses.last_error,
      last_error_at:  syncState.bonuses.last_error_at,
      last_log:       lastBonusesLog || null,
    },
    config: {
      yandex_configured: !!process.env.YANDEX_TOKEN,
      products_folder:   process.env.YANDEX_PRODUCTS_FOLDER_ID || null,
      bonuses_folder:    process.env.YANDEX_BONUSES_FOLDER_ID  || null,
      products_cron:     process.env.SYNC_CRON_PRODUCTS || '0 * * * *',
      bonuses_cron:      process.env.SYNC_CRON_BONUSES  || '0 * * * *',
    },
  });
});

// ─── POST /api/sync/run ───────────────────────────────────────────────────────
router.post('/run', adminOnly, async (req, res) => {
  const { type } = req.body; // "products" | "bonuses" | undefined (оба)

  const results = {};

  if (!type || type === 'products') {
    try {
      results.products = await processProductsSync();
    } catch (e) {
      results.products = { error: e.message };
    }
  }

  if (!type || type === 'bonuses') {
    try {
      results.bonuses = await processBonusesSync();
    } catch (e) {
      results.bonuses = { error: e.message };
    }
  }

  res.json({ success: true, results });
});

module.exports = router;
