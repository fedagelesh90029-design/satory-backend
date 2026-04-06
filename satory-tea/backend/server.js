require('dotenv').config();
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
app.use('/api/admin', require('./routes/admin'));
app.use('/api/orders', require('./routes/orders'));

// Статические файлы для кассира
app.use(express.static(path.join(__dirname, 'public')));

// Статические файлы для загрузок (фото товаров и т.д.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Запуск cron-задач
require('./services/fileWatcher').initWatcher();

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Satory Tea' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Satory backend running on port ${PORT}`));
