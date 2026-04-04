const Datastore = require('nedb-promises');
const path = require('path');

const dir = path.join(__dirname, 'data');

const db = {
  users: Datastore.create({ filename: path.join(dir, 'users.db'), autoload: true }),
  products: Datastore.create({ filename: path.join(dir, 'products.db'), autoload: true }),
  events: Datastore.create({ filename: path.join(dir, 'events.db'), autoload: true }),
  favorites: Datastore.create({ filename: path.join(dir, 'favorites.db'), autoload: true }),
  orders: Datastore.create({ filename: path.join(dir, 'orders.db'), autoload: true }),
  registrations: Datastore.create({ filename: path.join(dir, 'registrations.db'), autoload: true }),
  bonus_transactions: Datastore.create({ filename: path.join(dir, 'bonus_transactions.db'), autoload: true }),
  sync_log: Datastore.create({ filename: path.join(dir, 'sync_log.db'), autoload: true }),
  otp_codes: Datastore.create({ filename: path.join(dir, 'otp_codes.db'), autoload: true }),
};

// Seed products
async function seed() {
  const count = await db.products.count({});
  if (count > 0) return;

  await db.products.insert([
    { name: 'Золотой Дворец', category: 'Шу Пуэр', description: 'Насыщенный шу пуэр с нотами земли и древесины', year: 2019, weight: '357г', price: 1890, rating: 4.9, reviews_count: 127, badge: 'Хит' },
    { name: 'Весенний Юннань', category: 'Шэн Пуэр', description: 'Свежий шэн пуэр с цветочными нотами', year: 2022, weight: '200г', price: 2450, rating: 4.8, reviews_count: 84, badge: 'Новинка' },
    { name: 'Дикий Улун', category: 'Улун', description: 'Горный улун с медовым послевкусием', year: 2023, weight: '100г', price: 1650, rating: 4.7, reviews_count: 56, badge: null },
    { name: 'Исинский чайник', category: 'Посуда', description: 'Чайник из глины Цзыша, 180мл', year: null, weight: '180мл', price: 4900, rating: 5.0, reviews_count: 43, badge: 'Арт' },
    { name: 'Белый Пион', category: 'Белый', description: 'Нежный белый чай с цветочным ароматом', year: 2023, weight: '50г', price: 980, rating: 4.6, reviews_count: 31, badge: null },
    { name: 'Да Хун Пао', category: 'Улун', description: 'Классический улун с минеральным вкусом', year: 2022, weight: '100г', price: 3200, rating: 4.9, reviews_count: 98, badge: 'Хит' },
  ]);

  await db.events.insert([
    { title: 'Весенняя дегустация пуэров', type: 'Дегустация', date: '2026-04-15', time_start: '19:00', time_end: '21:30', price: 3500, seats_total: 20, seats_taken: 12 },
    { title: 'Мастер-класс по гунфу-ча', type: 'Мастер-класс', date: '2026-04-22', time_start: '18:30', time_end: '21:00', price: 2800, seats_total: 15, seats_taken: 3 },
    { title: 'Чайная церемония Гайвань', type: 'Церемония', date: '2026-05-10', time_start: '17:00', time_end: '19:00', price: 2000, seats_total: 12, seats_taken: 5 },
    { title: 'Дегустация улунов', type: 'Дегустация', date: '2026-05-18', time_start: '19:00', time_end: '21:00', price: 3000, seats_total: 20, seats_taken: 8 },
    { title: 'Введение в пуэр', type: 'Мастер-класс', date: '2026-06-05', time_start: '18:00', time_end: '20:30', price: 2500, seats_total: 18, seats_taken: 2 },
  ]);

  console.log('✅ База данных заполнена');
}

seed().catch(console.error);

module.exports = db;
