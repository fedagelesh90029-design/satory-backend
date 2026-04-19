/**
 * Тест планировщика событий
 */
require('dotenv').config();
const db = require('./db');

async function testScheduler() {
  console.log('🧪 Тестирование планировщика событий...\n');

  try {
    // 1. Проверяем текущие события
    const events = await db.events.find({});
    console.log(`📅 Всего событий в базе: ${events.length}`);
    
    events.forEach(event => {
      console.log(`  - ${event.title} (${event.date})`);
      console.log(`    Push-шаблон: ${event.push_template || 'не задан'}`);
      console.log(`    Запланировано: ${event.scheduled_push_time || 'нет'}`);
      console.log(`    Отправлено: ${event.push_sent ? 'да' : 'нет'}`);
      console.log('');
    });

    // 2. Создаем тестовое событие с push-уведомлением на ближайшее время
    const testTime = new Date(Date.now() + 2 * 60 * 1000); // +2 минуты
    const testEvent = {
      title: 'Тестовая дегустация чая',
      description: 'Тестовое событие для проверки планировщика',
      date: '2024-04-20',
      price: 1500,
      seats_total: 10,
      conditions: 'Тестовые условия',
      is_active: true,
      seats_taken: 0,
      // Поля планировщика
      push_template: '🍵 Тестовое уведомление: дегустация чая через 2 минуты!',
      push_target: 'all',
      scheduled_push_time: testTime.toISOString(),
      push_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newEvent = await db.events.insert(testEvent);
    console.log(`✅ Создано тестовое событие: ${newEvent.title}`);
    console.log(`⏰ Push запланирован на: ${testTime.toLocaleString('ru')}`);
    console.log(`🆔 ID события: ${newEvent._id}\n`);

    // 3. Проверяем события с запланированными push-уведомлениями
    const scheduledEvents = await db.events.find({
      scheduled_push_time: { $exists: true, $ne: null },
      push_sent: { $ne: true },
      is_active: { $ne: false }
    });

    console.log(`📱 События с запланированными push: ${scheduledEvents.length}`);
    scheduledEvents.forEach(event => {
      const pushTime = new Date(event.scheduled_push_time);
      const now = new Date();
      const diff = pushTime - now;
      console.log(`  - ${event.title}: через ${Math.round(diff / 1000 / 60)} минут`);
    });

    // 4. Проверяем пользователей с push-токенами
    const usersWithPush = await db.users.find({ push_token: { $exists: true } });
    console.log(`\n👥 Пользователей с push-токенами: ${usersWithPush.length}`);

    if (usersWithPush.length === 0) {
      console.log('⚠️  Нет пользователей с push-токенами для тестирования');
      console.log('💡 Добавим тестового пользователя...');
      
      const testUser = {
        phone: '+7999123456',
        name: 'Тестовый пользователь',
        push_token: 'ExponentPushToken[test-token-123]',
        push_settings: { push_events: true },
        bonus_balance: 500,
        created_at: new Date().toISOString()
      };

      await db.users.insert(testUser);
      console.log('✅ Тестовый пользователь создан');
    }

    console.log('\n🎯 Планировщик должен отправить push через 2 минуты!');
    console.log('📊 Для проверки статистики используйте: GET /api/admin/events/scheduler/stats');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

// Запускаем тест
testScheduler().then(() => {
  console.log('\n✨ Тест завершен');
  process.exit(0);
}).catch(console.error);