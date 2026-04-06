require('dotenv').config();
const path = require('path');
const Datastore = require('nedb-promises');

const db = Datastore.create({ filename: path.join(__dirname, 'data', 'products.db'), autoload: true });

async function run() {
  const all = await db.find({});
  console.log(`Всего товаров: ${all.length}`);

  const toKeep = all.filter(p => p.image_url && p.image_url.startsWith('/uploads/products/') && /[а-яёА-ЯЁ]/.test(p.image_url));
  const toRemove = all.filter(p => !toKeep.find(k => k._id === p._id));

  console.log(`Оставляем: ${toKeep.length}`);
  console.log(`Удаляем: ${toRemove.length}`);

  for (const p of toRemove) {
    await db.remove({ _id: p._id }, {});
    console.log(`✗ удалён: ${p.name}`);
  }

  console.log(`\nГотово. В каталоге: ${toKeep.length} товаров`);
  toKeep.forEach(p => console.log(`  ✓ ${p.name}`));
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
