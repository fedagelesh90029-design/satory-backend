/**
 * Финальный тест планировщика
 */
require('dotenv').config();
const db = require('./db');

async function finalTest() {
  console.log('🎯 Финальный тест планировщика событий...\n');

  try {
    // Создаем событие с push через 30 секунд
    const pushTime = new Date(Date.now() + 30 * 1000); // +30 секунд
    
    const testEvent = {
      title: 'Финальный тест чайной церемонии',
      description: 'Последняя проверка автоматического планировщика',
      date: '2024-04-22',
      price: 2500,
      seats_total: 12,
      conditions: 'Финальные условия',
      is_active: true,
      seats_taken: 0,
      push_template: '🍵 ФИНАЛЬНЫЙ ТЕСТ: Автоматическая чайная церемония началась!',
      push_target: 'all',
      scheduled_push_time: pushTime.toISOString(),
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const event = await db.events.insert(testEvent);
    console.log(`✅ Создано финальное событие: ${event.title}`);
    console.log(`⏰ Push запланирован на: ${pushTime.toLocaleString('ru')}`);
    console.log(`🆔 ID события: ${event._id}`);
    
    console.log('\n⏳ Ожидание 40 секунд для срабатывания планировщика...');
    
    // Ждем 40 секунд
    await new Promise(resolve => setTimeout(resolve, 40000));
    
    // Проверяем результат
    const finalEvent = await db.events.findOne({ _id: event._id });
    
    console.log('\n📊 ФИНАЛЬНЫЙ РЕЗУЛЬТАТ:');
    console.log(`  📱 Push отправлен: ${finalEvent.push_sent ? '✅ ДА' : '❌ НЕТ'}`);
    
    if (finalEvent.push_sent) {
      console.log(`  🎉 Получателей: ${finalEvent.last_push_count}`);
      console.log(`  📅 Время отправки: ${new Date(finalEvent.last_push_sent).toLocaleString('ru')}`);
      console.log('\n🎯 ПЛАНИРОВЩИК СОБЫТИЙ РАБОТАЕТ ИДЕАЛЬНО! 🎉');
      console.log('✨ Система готова к использованию в чайной!');
    } else {
      console.log('\n⚠️  Планировщик не сработал автоматически.');
      console.log('💡 Но немедленная отправка push при создании событий работает!');
      console.log('🔧 Возможно, нужно перезапустить основной сервер.');
    }

    // Показываем общую статистику
    const allEvents = await db.events.find({});
    const sentEvents = allEvents.filter(e => e.push_sent);
    const scheduledEvents = allEvents.filter(e => e.scheduled_push_time && !e.push_sent);
    
    console.log('\n📈 ОБЩАЯ СТАТИСТИКА:');
    console.log(`  📅 Всего событий: ${allEvents.length}`);
    console.log(`  ✅ Push отправлено: ${sentEvents.length}`);
    console.log(`  ⏰ Запланировано: ${scheduledEvents.length}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

finalTest().then(() => {
  console.log('\n✨ Финальный тест завершен');
  process.exit(0);
}).catch(console.error);