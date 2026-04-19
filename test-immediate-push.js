/**
 * Тест немедленной отправки push при создании события
 */
require('dotenv').config();
const db = require('./db');
const { broadcastPush } = require('./services/pushService');

async function testImmediatePush() {
  console.log('🚀 Тест немедленной отправки push...\n');

  try {
    // Создаем событие без scheduled_push_time (отправка сразу)
    const testEvent = {
      title: 'Немедленная дегустация',
      description: 'Тестовое событие с немедленной отправкой push',
      date: '2024-04-20',
      price: 2000,
      seats_total: 15,
      conditions: 'Тестовые условия',
      is_active: true,
      seats_taken: 0,
      // Поля планировщика (без scheduled_push_time = отправка сразу)
      push_template: '🍵 Срочно! Началась дегустация премиального чая!',
      push_target: 'all',
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Создаю событие с немедленной отправкой push...');
    
    // Имитируем логику из adminEvents.js
    const event = await db.events.insert(testEvent);
    console.log(`✅ Событие создано: ${event.title}`);

    if (event.is_active !== false && event.push_template) {
      console.log('📱 Отправляю push-уведомление...');
      
      // Проверяем пользователей
      const users = await db.users.find({ push_token: { $exists: true } });
      console.log(`👥 Найдено пользователей с push-токенами: ${users.length}`);
      
      const tokens = users
        .filter(u => u.push_token && u.push_settings?.push_events !== false)
        .map(u => u.push_token);
      
      console.log(`📤 Отправляю push на ${tokens.length} токенов...`);
      
      if (tokens.length > 0) {
        // Отправляем push
        await broadcastPush(db, '🍵 Satori Tea', event.push_template, 
          { screen: 'event', id: event._id }, 'push_events');
        
        // Обновляем событие
        await db.events.update({ _id: event._id }, {
          $set: {
            push_sent: true,
            last_push_sent: new Date().toISOString(),
            last_push_count: tokens.length,
            updated_at: new Date().toISOString()
          }
        });
        
        console.log(`✅ Push отправлен! Получателей: ${tokens.length}`);
      } else {
        console.log('⚠️  Нет получателей для отправки');
      }
    }

    // Проверяем результат
    const updatedEvent = await db.events.findOne({ _id: event._id });
    console.log('\n📊 Результат:');
    console.log(`  Push отправлен: ${updatedEvent.push_sent ? 'Да' : 'Нет'}`);
    console.log(`  Время отправки: ${updatedEvent.last_push_sent || 'не указано'}`);
    console.log(`  Получателей: ${updatedEvent.last_push_count || 0}`);

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

testImmediatePush().then(() => {
  console.log('\n✨ Тест завершен');
  process.exit(0);
}).catch(console.error);