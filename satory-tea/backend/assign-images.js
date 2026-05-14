require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });
const uploadsDir = path.join(__dirname, 'uploads', 'products');

// Порядок товаров из seed-images2.js (сверху вниз)
const PRODUCT_ORDER = [
  'Ми Лань Сянь Дань Цун Гао Шань',
  'Шуй Ми Тао Жоу Гуй',
  'Да У Е Дань Цун Гуандун, 2024',
  'УИ Хуан ГуаньИнь «Жёлтая ГуаньИнь»',
  'Я Ши Сян Дань Цун',
  'Те Гуань Инь Ганьдэ Гао Шань, 2025',
  'Лу Гу Дун Дин, 2024 год',
  'Бай Ча Ху Да Ю Линь',
  'Хуан Чжи Сян',
  'Да Хун Пао «Золотая награда»',
  'Алишань Цзя И, 2024',
  'Те Гуань Инь Аньси Хуасян, 2025',
  'Ли Шань, 2025',
  'Пуэр Шу V93 сбор, 2019',
  'Шу Пуэр Лао Ча Тоу, 2012',
  'Шу Пуэр Лао Тун Чжи, 2021',
  'Шу Пуэр Юн Чжень «Гунтин», 2023',
  'Шу Пуэр Юн Фа Гун Тин, 2011',
  'Шу Пуэр Шу Дай Цзы «Чень Сян Мэнку», 2023',
  'Шу Пуэр Шу Дай Цзы «Тай Хэ», 2021',
  'Шу Пуэр Шу Дай Цзы «Булан Гунтин», 2020',
  'Шу Пуэр Чэ Ши «Точа», 2018',
  'Шу Пуэр Чжун Ча 7581, 2021',
  'Шу Пуэр Чан Син «Чёрная Лошадь», 2020',
  'Шу Пуэр Хайвань «9988», 2021',
  'Шу Пуэр Фермерский «Лао Ча Тоу», 2018',
  'Шу Пуэр Лао Ши То «Лао Шуча», 2018',
  'Шу Пуэр Лао Ши То «Гу Шу», 2020',
  'Шу Пуэр TAETEA Лао Ча Тоу, 2023',
  'Шу Пуэр «Отборный гунтин» от Гу И, 2016',
  'Шен Пуэр Чан Син «Иу Ишань Мо», 2019',
  'Люань Гуапянь',
  'Лун Цзин',
  'Инь Сы',
  'Е Шен Люй Ча',
  'Би Ло Чунь',
  'Чжу Е Цин',
  'Цзыян Цуйфэн',
  'Сюэ Я Билочунь',
  'Си Ху Лунцзин',
  'Мэндин Люй Ча',
  'Габа Янтарь',
  'Габа Серебро',
  'Габа Опал',
  'Габа Бриллиант',
  'Габа Алишань',
  'Габа Сапфир',
  'Габа Аметист',
  'Габа Диамант',
  'Габа Рубин',
  'Габа Платина',
  'Чайник из глины Хей Ни с росписью',
  'Чайник из Цинчжоуской глины (1)',
  'Чайник из Цинчжоуской глины (2)',
  'Чайник из Нисинской глины',
  'Пиала из глины Цзы Ни',
  'Чайник из глины Цзы Ни',
  'Чайник фабричной работы',
];

async function run() {
  // Файлы отсортированные по имени
  const files = fs.readdirSync(uploadsDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();

  console.log(`Файлов: ${files.length}, товаров в списке: ${PRODUCT_ORDER.length}`);

  // Ты скачивал снизу вверх — реверсируем список товаров
  const reversed = [...PRODUCT_ORDER].reverse();

  let updated = 0;
  for (let i = 0; i < Math.min(files.length, reversed.length); i++) {
    const name = reversed[i];
    const file = files[i];
    const localUrl = `/uploads/products/${file}`;
    const n = await db.update({ name }, { $set: { image_url: localUrl } }, {});
    if (n) {
      console.log(`✓ ${name} -> ${file}`);
      updated++;
    } else {
      // Попробуем нечёткий поиск
      const all = await db.find({ name: new RegExp(name.split(' ').slice(0,3).join('.*'), 'i') });
      if (all.length === 1) {
        await db.update({ _id: all[0]._id }, { $set: { image_url: localUrl } }, {});
        console.log(`~ ${all[0].name} -> ${file}`);
        updated++;
      } else {
        console.log(`✗ не найден: ${name}`);
      }
    }
  }

  console.log(`\nОбновлено: ${updated}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
