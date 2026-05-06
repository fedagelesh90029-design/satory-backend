require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');

const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });
const uploadsDir = path.join(__dirname, 'uploads', 'products');

async function run() {
  const files = fs.readdirSync(uploadsDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  // Берём только файлы с кириллическими именами (переименованные вручную)
  const namedFiles = files.filter(f => /[а-яёА-ЯЁ]/.test(f));
  console.log(`Переименованных файлов: ${namedFiles.length}`);

  let updated = 0;
  for (const file of namedFiles) {
    const productName = file.replace(/\.[^.]+$/, ''); // убираем расширение
    const localUrl = `/uploads/products/${file}`;

    // Точное совпадение
    let n = await db.update({ name: productName }, { $set: { image_url: localUrl } }, {});
    if (n) {
      console.log(`✓ ${productName}`);
      updated++;
      continue;
    }

    // Нечёткий поиск — первые 3 слова
    const words = productName.split(' ').slice(0, 3).join(' ');
    const all = await db.find({ name: new RegExp(words, 'i') });
    if (all.length === 1) {
      await db.update({ _id: all[0]._id }, { $set: { image_url: localUrl } }, {});
      console.log(`~ ${all[0].name} <- ${file}`);
      updated++;
    } else if (all.length > 1) {
      console.log(`? Несколько совпадений для: ${productName}`);
      all.forEach(p => console.log(`  - ${p.name}`));
    } else {
      console.log(`✗ Не найден: ${productName}`);
    }
  }

  console.log(`\nОбновлено: ${updated}`);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
