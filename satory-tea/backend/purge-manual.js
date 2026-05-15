const db = require('./db');

async function purge() {
  // Удаляем всё, что помечено как ручное
  const n1 = await db.products.remove({ is_manual: true }, { multi: true });
  
  // Удаляем всё, у чего нет iiko_id (это гарантированно ручные товары)
  const n2 = await db.products.remove({ iiko_id: { $exists: false } }, { multi: true });
  
  // Удаляем товары без категории или с категорией "Другое", если они не из iiko
  const n3 = await db.products.remove({ category: 'Другое', iiko_id: null }, { multi: true });

  console.log(`Purged: ${n1} manual, ${n2} without iiko_id, ${n3} others`);
  
  // Проверяем сколько осталось
  const count = await db.products.count({});
  console.log(`Remaining products in DB: ${count}`);
  
  process.exit(0);
}

purge().catch(console.error);
