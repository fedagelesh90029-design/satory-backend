/**
 * Диагностика iiko API - проверяем что возвращает API
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';
const ADMIN_SECRET = 'satory_admin_2026';

async function diagnoseIiko() {
  console.log('🔍 Диагностика iiko API...\n');

  try {
    // Запускаем синхронизацию с подробным выводом
    console.log('📡 Запускаем синхронизацию...');
    const response = await fetch(`${RAILWAY_URL}/api/iiko/sync/api`, {
      method: 'POST',
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    const data = await response.json();
    
    console.log(`\nСтатус: ${response.status} ${response.statusText}`);
    console.log('\nОтвет от сервера:');
    console.log(JSON.stringify(data, null, 2));

    if (data.total === 0) {
      console.log('\n⚠️  ПРОБЛЕМА: iiko API вернул 0 товаров\n');
      console.log('Возможные причины:');
      console.log('1. ❌ Неверный IIKO_ORGANIZATION_ID');
      console.log('   Проверьте в Railway, что это правильный UUID организации');
      console.log('   Формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      console.log('');
      console.log('2. ❌ В iiko нет активных товаров');
      console.log('   Зайдите в личный кабинет iiko и проверьте номенклатуру');
      console.log('');
      console.log('3. ❌ API-логин не имеет прав на чтение номенклатуры');
      console.log('   В личном кабинете iiko проверьте права API-логина');
      console.log('');
      console.log('💡 Рекомендация:');
      console.log('   Проверьте переменные в Railway:');
      console.log('   - IIKO_API_LOGIN');
      console.log('   - IIKO_ORGANIZATION_ID');
      console.log('');
      console.log('   Убедитесь, что Organization ID - это UUID вашей организации,');
      console.log('   а не название или другой идентификатор.');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

diagnoseIiko();
