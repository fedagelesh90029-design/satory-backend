// Railway/Render передаёт переменные через process.env напрямую
// dotenv нужен только для локальной разработки
if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch(e) {}
} else {
  // На продакшне пробуем dotenv как fallback
  try { require('dotenv').config(); } catch(e) {}
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/events', require('./routes/events'));
app.use('/api/user', require('./routes/user'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/iiko', require('./routes/iiko'));
app.use('/api/bonus', require('./routes/bonus'));
app.use('/api/admin/login', require('./routes/adminAuth'));
app.use('/api/admin/events', require('./routes/adminEvents'));
app.use('/api/admin/products', require('./routes/adminProducts'));
app.use('/api/admin/gallery', require('./routes/adminGallery'));
app.use('/api/admin/categories', require('./routes/adminCategories'));
app.use('/api/admin/orders', require('./routes/adminOrders'));
app.use('/api/admin/upload', require('./routes/adminUpload'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/news', require('./routes/news'));
app.use('/api/admin/news', require('./routes/adminNews'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin/settings', require('./routes/settings'));
app.use('/api/telegram', require('./routes/telegram'));
app.use('/api/categories', async (req, res) => {
  const db = require('./db');
  const cats = await db.categories.find({ is_active: true });
  cats.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  res.json(cats);
});

// Статические файлы для кассира
app.use(express.static(path.join(__dirname, 'public')));

// Статические файлы для загрузок (фото товаров и т.д.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Запуск cron-задач
require('./services/fileWatcher').initWatcher();
require('./services/yandexDiskSync').initYandexSync();
require('./services/iikoApiSync').initIikoApiSync();

// Запуск планировщика событий
const eventScheduler = require('./services/eventScheduler');
eventScheduler.start();

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Satori Tea' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Satori backend running on port ${PORT}`);
  console.log(`[env] SMS_PROVIDER=${process.env.SMS_PROVIDER || 'НЕ ЗАДАН'}, MTS_API_KEY=${process.env.MTS_API_KEY ? process.env.MTS_API_KEY.slice(0,8)+'...' : 'НЕ ЗАДАН'}`);

  // Автоустановка Telegram webhook при старте
  if (process.env.TG_BOT_TOKEN && process.env.APP_URL) {
    const { setWebhook } = require('./services/telegramBot');
    const webhookUrl = `${process.env.APP_URL}/api/telegram/webhook`;
    setWebhook(webhookUrl).catch(e => console.error('[telegram] Ошибка установки webhook:', e.message));
  }
});
