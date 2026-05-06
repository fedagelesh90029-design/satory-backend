/**
 * Проверка статистики планировщика
 */
require('dotenv').config();
const eventScheduler = require('./services/eventScheduler');

async function checkStats() {
  console.log('📊 Проверка статистики планировщика...\n');
  
  try {
    const stats = await eventScheduler.getStats();
    
    console.log('📈 Статистика планировщика:');
    console.log(`  🟢 Статус: ${stats.isRunning ? 'Работает' : 'Остановлен'}`);
    console.log(`  📅 Запланировано: ${stats.scheduledCount} событий`);
    console.log(`  ✅ Отправлено: ${stats.sentCount} уведомлений`);
    console.log(`  🕐 Последняя проверка: ${new Date(stats.lastCheck).toLocaleString('ru')}`);
    
    // Проверяем события в базе
    const db = require('./db');
    const scheduledEvents = await db.events.find({
      scheduled_push_time: { $exists: true, $ne: null },
      push_sent: { $ne: true },
      is_active: { $ne: false }
    });
    
    console.log('\n📱 Запланированные события:');
    if (scheduledEvents.length === 0) {
      console.log('  Нет запланированных push-уведомлений');
    } else {
      scheduledEvents.forEach(event => {
        const pushTime = new Date(event.scheduled_push_time);
        const now = new Date();
        const diff = pushTime - now;
        const minutesLeft = Math.round(diff / 1000 / 60);
        
        console.log(`  - ${event.title}`);
        console.log(`    Время: ${pushTime.toLocaleString('ru')}`);
        console.log(`    Осталось: ${minutesLeft > 0 ? `${minutesLeft} минут` : 'время пришло!'}`);
        console.log(`    Шаблон: ${event.push_template}`);
        console.log(`    Аудитория: ${event.push_target}`);
        console.log('');
      });
    }
    
    // Проверяем отправленные события
    const sentEvents = await db.events.find({ push_sent: true });
    console.log(`✅ Отправленные уведомления: ${sentEvents.length}`);
    sentEvents.forEach(event => {
      console.log(`  - ${event.title}: ${event.last_push_count || 0} получателей (${new Date(event.last_push_sent).toLocaleString('ru')})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkStats().then(() => {
  console.log('\n✨ Проверка завершена');
  process.exit(0);
}).catch(console.error);