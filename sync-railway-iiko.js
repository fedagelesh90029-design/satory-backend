/**
 * Запуск синхронизации iiko на Railway
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';
const ADMIN_SECRET = 'satory_admin_2026';

async function syncRailwayIiko() {
  console.log('🔄 Запускаем синхронизацию с iiko на Railway...\n');

  try {
    console.log('📡 Отправляем запрос...');
    const response = await fetch(`${RAILWAY_URL}/api/iiko/sync/api`, {
      method: 'POST',
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    console.log(`Статус: ${response.status} ${response.statusText}\n`);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Синхронизация успешна!\n');
      console.log('📊 Результаты:');
      console.log(`   Добавлено новых: ${data.added || 0}`);
      console.log(`   Обновлено: ${data.updated || 0}`);
      console.log(`   Пропущено: ${data.skipped || 0}`);
      console.log(`   Всего обработано: ${data.total || 0}`);
      
      console.log('\n✅ Меню успешно синхронизировано с iiko!');
      console.log('   Автоматическая синхронизация будет происходить каждые 6 часов');
    } else {
      console.log('❌ Ошибка синхронизации:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.error && data.error.includes('auth failed')) {
        console.log('\n💡 Проверьте в Railway:');
        console.log('   - IIKO_API_LOGIN - правильный ли API-логин?');
        console.log('   - IIKO_ORGANIZATION_ID - правильный ли UUID организации?');
      }
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

syncRailwayIiko();
