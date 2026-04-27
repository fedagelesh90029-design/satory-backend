/**
 * Проверка статуса iiko API
 */

const API_URL = 'http://localhost:3000';

async function checkIikoStatus() {
  console.log('🔍 Проверяем статус iiko API...\n');

  try {
    const response = await fetch(`${API_URL}/api/iiko/status`);
    
    console.log(`Статус: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 Результат:\n');
      console.log(`Режим работы: ${data.mode === 'api' ? '🌐 API' : '📁 Файловый'}`);
      console.log(`API настроен: ${data.api_configured ? '✅ Да' : '❌ Нет'}`);
      console.log(`\nПоследняя синхронизация товаров: ${data.last_products_sync || '❌ Не было'}`);
      console.log(`Последняя синхронизация бонусов: ${data.last_bonuses_sync || '❌ Не было'}`);
      console.log(`\nФайл товаров загружен: ${data.products_file_exists ? '✅ Да' : '❌ Нет'}`);
      console.log(`Файл бонусов загружен: ${data.bonuses_file_exists ? '✅ Да' : '❌ Нет'}`);
      
      if (!data.api_configured) {
        console.log('\n💡 Для настройки API iiko добавьте в .env:');
        console.log('   IIKO_API_LOGIN=ваш_логин');
        console.log('   IIKO_ORGANIZATION_ID=ваш_id_организации');
      }
    } else {
      const error = await response.json();
      console.log(`❌ Ошибка: ${JSON.stringify(error)}`);
    }

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    console.log('\n💡 Убедитесь, что сервер запущен на порту 3000');
    console.log('   Запустите: cd satory-tea/backend && npm start');
  }
}

checkIikoStatus();
