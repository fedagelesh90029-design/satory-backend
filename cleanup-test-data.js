require('dotenv').config();
const db = require('./db');

async function cleanup() {
  const testTitles = [
    'Тестовая дегустация чая',
    'Немедленная дегустация',
    'Финальный тест чайной церемонии',
    'Чайный вечер с отложенной публикацией',
    'Черновик чайной церемонии',
    'Реальный тест планировщика',
  ];

  const removed = await db.events.remove({ title: { $in: testTitles } }, { multi: true });
  console.log('Удалено тестовых событий:', removed);

  const removedUser = await db.users.remove({ phone: '+7999123456' }, {});
  console.log('Удалён тестовый пользователь:', removedUser);

  const events = await db.events.find({});
  console.log('Осталось событий:', events.length);
  events.forEach(e => console.log(' -', e.title));
}

cleanup().then(() => process.exit(0)).catch(console.error);
