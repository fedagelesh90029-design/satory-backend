/**
 * Тест отложенной публикации событий
 */
require('dotenv').config();
const db = require('./db');

async function testDelayedPublish() {
  console.log('📅 Тест отложенной публикации событий...\n');

  try {
    // 1. Создаем событие с отложенной публикацией через 1 минуту
    const publishTime = new Date(Date.now() + 60 * 1000); // +1 минута
    
    const testEvent = {
      title: 'Чайный вечер с отложенной публикацией',
      description: 'Тестовое событие для проверки отложенной публикации',
      date: '2024-04-25',
      price: 1200,
      seats_total: 15,
      conditions: 'Тестовые условия',
      is_active: true,
      seats_taken: 0,
      // Поля отложенной публикации
      scheduled_publish_time: publishTime.toISOString(),
      is_published: false,
      auto_publish: true,
      // Push-уведомление отправится при публикации
      push_template: '🍵 Чайный вечер начинается! Присоединяйтесь к нам',
      push_target: 'all',
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const event = await db.events.insert(testEvent);
    console.log(`✅ Создано событие с отложенной публикацией: ${event.title}`);
    console.log(`📅 Публикация запланирована на: ${publishTime.toLocaleString('ru')}`);
    console.log(`🆔 ID события: ${event._id}`);
    
    // 2. Проверяем, что событие не видно в публичном API
    const publicEvents = await db.events.find({ 
      is_active: { $ne: false },
      is_published: { $ne: false }
    });
    
    const isVisible = publicEvents.some(e => e._id === event._id);
    console.log(`👁️  Видимость в публичном API: ${isVisible ? '❌ ВИДНО (ошибка!)' : '✅ СКРЫТО (правильно)'}`);
    
    // 3. Проверяем события с запланированной публикацией
    const scheduledEvents = await db.events.find({
      scheduled_publish_time: { $exists: true, $ne: null },
      is_published: { $ne: true },
      auto_publish: true
    });
    
    console.log(`\n📋 События с запланированной публикацией: ${scheduledEvents.length}`);
    scheduledEvents.forEach(e => {
      const pTime = new Date(e.scheduled_publish_time);
      const now = new Date();
      const diff = pTime - now;
      console.log(`  - ${e.title}: через ${Math.round(diff / 1000 / 60)} минут`);
    });

    // 4. Создаем событие как черновик (без публикации)
    const draftEvent = {
      title: 'Черновик чайной церемонии',
      description: 'Событие-черновик для тестирования',
      date: '2024-04-26',
      price: 1800,
      seats_total: 8,
      conditions: 'Черновик',
      is_active: true,
      seats_taken: 0,
      is_published: false,
      auto_publish: false,
      push_template: '🍵 Черновик события',
      push_target: 'all',
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const draft = await db.events.insert(draftEvent);
    console.log(`\n📝 Создан черновик события: ${draft.title}`);
    
    // 5. Проверяем общую статистику
    const allEvents = await db.events.find({});
    const publishedEvents = allEvents.filter(e => e.is_published !== false);
    const draftEvents = allEvents.filter(e => e.is_published === false && !e.scheduled_publish_time);
    const scheduledPublishEvents = allEvents.filter(e => e.scheduled_publish_time && !e.is_published);
    
    console.log('\n📊 СТАТИСТИКА СОБЫТИЙ:');
    console.log(`  📅 Всего событий: ${allEvents.length}`);
    console.log(`  ✅ Опубликовано: ${publishedEvents.length}`);
    console.log(`  📝 Черновики: ${draftEvents.length}`);
    console.log(`  ⏰ Запланировано к публикации: ${scheduledPublishEvents.length}`);
    
    console.log('\n🎯 Планировщик должен опубликовать событие через 1 минуту!');
    console.log('💡 После публикации событие станет видимым в публичном API');
    console.log('📱 Push-уведомление отправится автоматически при публикации');

  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testDelayedPublish().then(() => {
  console.log('\n✨ Тест отложенной публикации завершен');
  process.exit(0);
}).catch(console.error);