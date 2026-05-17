const Datastore = require('nedb-promises');
const path = require('path');

const dir = path.join(__dirname, 'data');

const db = {
  users: Datastore.create({ filename: path.join(dir, 'users.db'), autoload: true }),
  products: Datastore.create({ filename: path.join(dir, 'products.db'), autoload: true }),
  products_meta: Datastore.create({ filename: path.join(dir, 'products_meta.db'), autoload: true }),
  events: Datastore.create({ filename: path.join(dir, 'events.db'), autoload: true }),
  favorites: Datastore.create({ filename: path.join(dir, 'favorites.db'), autoload: true }),
  orders: Datastore.create({ filename: path.join(dir, 'orders.db'), autoload: true }),
  registrations: Datastore.create({ filename: path.join(dir, 'registrations.db'), autoload: true }),
  bonus_transactions: Datastore.create({ filename: path.join(dir, 'bonus_transactions.db'), autoload: true }),
  sync_log: Datastore.create({ filename: path.join(dir, 'sync_log.db'), autoload: true }),
  otp_codes: Datastore.create({ filename: path.join(dir, 'otp_codes.db'), autoload: true }),
  gallery: Datastore.create({ filename: path.join(dir, 'gallery.db'), autoload: true }),
  categories: Datastore.create({ filename: path.join(dir, 'categories.db'), autoload: true }),
  news: Datastore.create({ filename: path.join(dir, 'news.db'), autoload: true }),
  app_settings: Datastore.create({ filename: path.join(dir, 'app_settings.db'), autoload: true }),
};

// Seed products
async function seed() {
  const count = await db.products.count({});
  if (count > 0) return;

  /*
  await db.products.insert([
    { name: 'Золотой Дворец', category: 'Шу Пуэр', description: 'Насыщенный шу пуэр с нотами земли и древесины', year: 2019, weight: '357г', price: 1890, rating: 4.9, reviews_count: 127, badge: 'Хит' },
    { name: 'Весенний Юннань', category: 'Шэн Пуэр', description: 'Свежий шэн пуэр с цветочными нотами', year: 2022, weight: '200г', price: 2450, rating: 4.8, reviews_count: 84, badge: 'Новинка' },
    { name: 'Дикий Улун', category: 'Улун', description: 'Горный улун с медовым послевкусием', year: 2023, weight: '100г', price: 1650, rating: 4.7, reviews_count: 56, badge: null },
    { name: 'Исинский чайник', category: 'Посуда', description: 'Чайник из глины Цзыша, 180мл', year: null, weight: '180мл', price: 4900, rating: 5.0, reviews_count: 43, badge: 'Арт' },
    { name: 'Белый Пион', category: 'Белый', description: 'Нежный белый чай с цветочным ароматом', year: 2023, weight: '50г', price: 980, rating: 4.6, reviews_count: 31, badge: null },
    { name: 'Да Хун Пао', category: 'Улун', description: 'Классический улун с минеральным вкусом', year: 2022, weight: '100г', price: 3200, rating: 4.9, reviews_count: 98, badge: 'Хит' },
  ]);
  */

  console.log('✅ База данных готова (сид пропущен)');
}

seed().catch(console.error);

module.exports = db;
