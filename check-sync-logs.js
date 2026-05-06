/**
 * Проверка логов синхронизации
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';
const ADMIN_SECRET = 'satory_admin_2026';

async function checkSyncLogs() {
  console.log('📋 Проверяем логи синхронизации...\n');

  try {
    const response = await fetch(`${RAILWAY_URL}/api/admin/sync/status`, {
      headers: {
        'x-admin-secret': ADMIN_SECRET,
      },
    });

    if (!response.ok) {
      console.log(`❌ Ошибка: ${response.status} ${response.statusText}`);
      return;
    }

    const logs = await response.json();
    
    if (logs.length === 0) {
      console.log('❌ Логов синхронизации нет');
      return;
    }

    console.log(`📊 Найдено логов: ${logs.length}\n`);
    
    // Показываем последние 5 логов
    logs.slice(0, 5).forEach((log, i) => {
      const date = new Date(log.created_at);
      console.log(`${i + 1}. ${log.type} - ${log.status}`);
      console.log(`   Время: ${date.toLocaleString('ru-RU')}`);
      console.log(`   Обработано строк: ${log.rows_processed || 0}`);
      if (log.detail) {
        console.log(`   Детали: ${JSON.stringify(log.detail)}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

checkSyncLogs();
