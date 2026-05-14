// Скрипт сопоставляет локальные файлы из uploads/products/ с товарами в БД
// Логика: имя файла = последний сегмент VK URL (без расширения)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });
const uploadsDir = path.join(__dirname, 'uploads', 'products');

async function run() {
  // Получаем все локальные файлы
  const files = fs.readdirSync(uploadsDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log(`Найдено файлов: ${files.length}`);

  // Строим map: basename_without_ext -> filename
  const fileMap = {};
  for (const f of files) {
    const key = f.replace(/\.[^.]+$/, ''); // убираем расширение
    fileMap[key] = f;
  }

  // Получаем все товары
  const products = await db.find({});
  console.log(`Товаров в БД: ${products.length}`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    if (!product.image_url) { skipped++; continue; }

    // Извлекаем имя файла из VK URL
    // URL вида: https://sun9-16.userapi.com/s/v1/ig2/FILENAME.jpg?...
    const urlMatch = product.image_url.match(/\/([^/?]+\.jpg)/i);
    if (!urlMatch) { skipped++; continue; }

    const vkFilename = urlMatch[1].replace(/\.[^.]+$/, ''); // без расширения

    if (fileMap[vkFilename]) {
      const localUrl = `/uploads/products/${fileMap[vkFilename]}`;
      await db.update({ _id: product._id }, { $set: { image_url: localUrl } });
      console.log(`✓ ${product.name} -> ${localUrl}`);
      updated++;
    } else {
      console.log(`✗ ${product.name} | файл не найден: ${vkFilename}`);
      skipped++;
    }
  }

  console.log(`\nОбновлено: ${updated}, пропущено: ${skipped}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
