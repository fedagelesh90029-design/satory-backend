/**
 * Тест планировщика в реальном времени
 */
require('dotenv').config();
const db = require('./db');

async function testSchedulerRealtime() {
  console.log('⏰ Тест планировщика в реальном времени...\n');

  try {
    // Создаем событие с push через 1 минуту
    const pushTime = new Date(Date.now() + 60 * 1000); // +1 минута
    
    const testEvent = {
      title: 'Реальный тест планировщика',
      description: 'Проверка автоматической отправки push',
      date: '2024-04-21',
      price: 1800,
      seats_total: 8,
      conditions: 'Тестовые условия',
      is_active: true,
      seats_taken: 0,
      push_template: '🍵 Планировщик работает! Автоматическое уведомление о дегустации',
      push_target: 'all',
      scheduled_push_time: pushTime.toISOString(),
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const event = await db.events.insert(testEvent);
    console.log(`✅ Создано событие: ${event.title}`);
    console.log(`⏰ Push запланирован на: ${pushTime.toLocaleString('ru')}`);
    console.log(`🆔 ID события: ${event._id}`);
    
    console.log('\n🔄 Мониторинг каждые 15 секунд...');
    console.log('(Планировщик в основном сервере должен сработать через ~1 минуту)\n');

    // Мониторим событие каждые 15 секунд
    let attempts = 0;
    const maxAttempts = 8; // 2 минуты максимум
    
    const monitor = setInterval(async () => {
      attempts++;
      
      try {
        const currentEvent = await db.events.findOne({ _id: event._id });
        const now = new Date();
        const timeLeft = new Date(currentEvent.scheduled_push_time) - now;
        const secondsLeft = Math.round(timeLeft / 1000);
        
        console.log(`📊 Попытка ${attempts}/${maxAttempts} (${now.toLocaleTimeString('ru')})`);
        console.log(`  ⏱️  Осталось: ${secondsLeft > 0 ? `${secondsLeft} сек` : 'время пришло!'}`);
        console.log(`  📱 Push отправлен: ${currentEvent.push_sent ? '✅ ДА' : '❌ НЕТ'}`);
        
        if (currentEvent.push_sent) {
          console.log(`  🎉 Получателей: ${currentEvent.last_push_count}`);
          console.log(`  📅 Время отправки: ${new Date(currentEvent.last_push_sent).toLocaleString('ru')}`);
          console.log('\n🎯 ПЛАНИРОВЩИК СРАБОТАЛ УСПЕШНО! 🎉');
          clearInterval(monitor);
          process.exit(0);
        }
        
        if (attempts >= maxAttempts) {
          console.log('\n⚠️  Время ожидания истекло. Планировщик не сработал.');
          console.log('💡 Возможные причины:');
          console.log('   - Основной сервер не запущен');
          console.log('   - Планировщик отключен');
          console.log('   - Ошибка в коде планировщика');
          clearInterval(monitor);
          process.exit(1);
        }
        
        console.log('');
      } catch (error) {
        console.error('❌ Ошибка мониторинга:', error);
      }
    }, 15000); // каждые 15 секунд

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

testSchedulerRealtime().catch(console.error);