/**
 * Запуск синхронизации с iiko API
 */

const API_URL = 'http://localhost:3000';
const ADMIN_SECRET = 'satory_admin_2026';

async function syncIiko() {
  console.log('🔄 Запускаем синхронизацию с iiko API...\n');

  try {
    const response = await fetch(`${API_URL}/api/iiko/sync/api`, {
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
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Ошибка синхронизации:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

syncIiko();
