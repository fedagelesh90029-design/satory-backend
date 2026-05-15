const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { parseProductsFile, parseBonusesFile, calcLoyaltyStatus } = require('../services/iikoFileParser');
const adminAuth = require('../middleware/adminAuth');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'iiko');
const LAST_SYNC_FILE = path.join(UPLOAD_DIR, 'last_sync.json');

// Убедимся что папка существует
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ─── Multer ──────────────────────────────────────────────────────────────────
const ALLOWED_EXT = ['.xlsx', '.xls', '.csv'];

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const type = req.params.type || 'products';
    cb(null, `${type}_latest${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(Object.assign(new Error('Допустимые форматы: .xlsx, .xls, .csv'), { status: 400 }));
  },
});

// ─── Sync helpers ─────────────────────────────────────────────────────────────
async function runProductSync(filePath) {
  const rows = await parseProductsFile(filePath);
  const now = new Date().toISOString();
  let added = 0, updated = 0, skipped = 0;

  const incomingIds = rows.map(r => r.iiko_id);

  for (const row of rows) {
    // Автосоздание категории если новая
    if (row.category) {
      const catExists = await db.categories.findOne({ name: row.category });
      if (!catExists) {
        const count = await db.categories.count({});
        await db.categories.insert({ name: row.category, is_active: true, sort_order: count, created_at: now });
      }
    }

    const existing = await db.products.findOne({ iiko_id: row.iiko_id });
    if (existing) {
      // Обновляем только цену/остаток/название/категорию — фото НЕ трогаем
      await db.products.update({ iiko_id: row.iiko_id }, {
        $set: {
          name:        row.name,
          category:    row.category,
          price:       row.price,
          stock:       row.stock,
          description: row.description,
          unit:        row.unit,
          active:      true,
          updated_at:  now,
          // image_url, price_override, category_override — НЕ трогаем
        },
      });
      updated++;
    } else {
      // Новый товар — добавляем без фото (фото добавят вручную)
      await db.products.insert({
        ...row,
        image_url:        null,
        active:           true,
        is_manual:        false,
        rating:           0,
        reviews_count:    0,
        badge:            null,
        year:             null,
        price_override:   null,
        category_override: null,
        created_at:       now,
        updated_at:       now,
      });
      added++;
    }
  }

  // Мягкое удаление товаров которых нет в новом файле
  const allProducts = await db.products.find({ active: true, is_manual: { $ne: true } });
  for (const p of allProducts) {
    if (p.iiko_id && !incomingIds.includes(p.iiko_id)) {
      await db.products.update({ _id: p._id }, { $set: { active: false, updated_at: now } });
    }
  }

  const delta = { added, updated, skipped, total: rows.length, synced_at: now };
  const syncData = fs.existsSync(LAST_SYNC_FILE) ? JSON.parse(fs.readFileSync(LAST_SYNC_FILE)) : {};
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify({ ...syncData, products: now }));
  await db.sync_log.insert({ type: 'products', status: 'success', rows_processed: rows.length, created_at: now });
  return delta;
}

async function runBonusSync(filePath) {
  const rows = await parseBonusesFile(filePath);
  const now = new Date().toISOString();
  let matched = 0, unmatched = 0;

  // Группируем по телефону — берём последнюю по дате запись
  const byPhone = {};
  for (const row of rows) {
    if (!byPhone[row.phone] || new Date(row.date) > new Date(byPhone[row.phone].date)) {
      byPhone[row.phone] = row;
    }
  }

  // Сохраняем все транзакции
  for (const row of rows) {
    const user = await db.users.findOne({ phone: row.phone });
    await db.bonus_transactions.insert({
      user_id: user ? user._id : null,
      phone: row.phone,
      guest_name: row.guest_name,
      date: row.date,
      operation_type: row.operation_type,
      accrued: row.accrued,
      spent: row.spent,
      balance: row.balance,
      description: `${row.operation_type}: +${row.accrued} / -${row.spent}`,
      created_at: now,
    });
  }

  // Обновляем балансы пользователей
  for (const [phone, row] of Object.entries(byPhone)) {
    const user = await db.users.findOne({ phone });
    if (user) {
      await db.users.update({ phone }, {
        $set: {
          bonus_balance: row.balance,
          loyalty_status: calcLoyaltyStatus(row.balance),
          bonus_updated_at: now,
        },
      });
      // Push об обновлении бонусов
      const { sendPushToUser } = require('../services/pushService');
      sendPushToUser(db, user._id,
        '🎁 Бонусный баланс обновлён',
        `Ваш баланс: ${row.balance} баллов`,
        { screen: 'loyalty' }
      ).catch(() => {});
      matched++;
    } else {
      unmatched++;
    }
  }

  const delta = { matched, unmatched, total: rows.length, synced_at: now };
  const syncData = fs.existsSync(LAST_SYNC_FILE) ? JSON.parse(fs.readFileSync(LAST_SYNC_FILE)) : {};
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify({ ...syncData, bonuses: now }));
  await db.sync_log.insert({ type: 'bonuses', status: 'success', rows_processed: rows.length, created_at: now });
  return delta;
}

// Экспортируем для fileWatcher
module.exports.runProductSync = runProductSync;
module.exports.runBonusSync = runBonusSync;

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/iiko/upload/products
router.post('/upload/products', adminAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Файл превышает 10 МБ' });
      return res.status(err.status || 400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Файл не передан (поле: file)' });
    try {
      const delta = await runProductSync(req.file.path);
      res.json({ success: true, ...delta });
    } catch (e) {
      res.status(422).json({ error: e.message });
    }
  });
});

// POST /api/iiko/upload/bonuses
router.post('/upload/bonuses', adminAuth, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Файл превышает 10 МБ' });
      return res.status(err.status || 400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Файл не передан (поле: file)' });
    try {
      const delta = await runBonusSync(req.file.path);
      res.json({ success: true, ...delta });
    } catch (e) {
      res.status(422).json({ error: e.message });
    }
  });
});

// POST /api/iiko/sync/products
router.post('/sync/products', adminAuth, async (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('products_latest'));
  if (!files.length) return res.status(404).json({ error: 'Файл выгрузки не найден. Загрузите файл через POST /api/iiko/upload/products' });
  try {
    const delta = await runProductSync(path.join(UPLOAD_DIR, files[0]));
    res.json(delta);
  } catch (e) {
    res.status(422).json({ error: e.message });
  }
});

// POST /api/iiko/sync/bonuses
router.post('/sync/bonuses', adminAuth, async (req, res) => {
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('bonuses_latest'));
  if (!files.length) return res.status(404).json({ error: 'Файл выгрузки не найден. Загрузите файл через POST /api/iiko/upload/bonuses' });
  try {
    const delta = await runBonusSync(path.join(UPLOAD_DIR, files[0]));
    res.json(delta);
  } catch (e) {
    res.status(422).json({ error: e.message });
  }
});

// POST /api/iiko/sync — универсальный эндпоинт
router.post('/sync', async (req, res) => {
  const apiConfigured = !!(process.env.IIKO_API_LOGIN && process.env.IIKO_ORGANIZATION_ID);
  
  if (apiConfigured) {
    try {
      const { syncProductsFromIiko } = require('../services/iikoApiSync');
      const result = await syncProductsFromIiko();
      return res.json(result);
    } catch (e) {
      console.error('[iiko-api] Auto-sync failed, falling back to file:', e.message);
    }
  }

  const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith('products_latest'));
  if (!files.length) {
    return res.status(404).json({ 
      error: 'Файл выгрузки не найден.', 
      hint: apiConfigured ? 'Ошибка API синхронизации' : 'Загрузите файл через админ-панель' 
    });
  }
  
  try {
    const delta = await runProductSync(path.join(UPLOAD_DIR, files[0]));
    res.json(delta);
  } catch (e) {
    res.status(422).json({ error: e.message });
  }
});

// GET /api/iiko/status
router.get('/status', (req, res) => {
  const syncData = fs.existsSync(LAST_SYNC_FILE) ? JSON.parse(fs.readFileSync(LAST_SYNC_FILE)) : {};
  const productsFile = fs.readdirSync(UPLOAD_DIR).some(f => f.startsWith('products_latest'));
  const bonusesFile = fs.readdirSync(UPLOAD_DIR).some(f => f.startsWith('bonuses_latest'));

  const apiConfigured = !!(process.env.IIKO_API_LOGIN && process.env.IIKO_ORGANIZATION_ID);

  res.json({
    mode: apiConfigured ? 'api' : 'file',
    api_configured: apiConfigured,
    // Обратная совместимость
    connected: apiConfigured,
    configured: apiConfigured,
    last_products_sync: syncData.products || null,
    last_bonuses_sync: syncData.bonuses || null,
    products_file_exists: productsFile,
    bonuses_file_exists: bonusesFile,
  });
});

// POST /api/iiko/sync/api — ручной запуск синхронизации через iiko API
router.post('/sync/api', adminAuth, async (req, res) => {
  try {
    const { triggerManualSync } = require('../services/iikoApiSync');
    const result = await triggerManualSync();
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
