/**
 * Установка webhook для Telegram бота
 */

const RAILWAY_URL = 'https://satory-backend-production.up.railway.app';
const ADMIN_SECRET = 'satory_admin_2026';

async function setupTelegram() {
  console.log('🤖 Устанавливаем webhook для Telegram бота...\n');

  try {
    const response = await fetch(`${RAILWAY_URL}/api/telegram/setup?secret=${ADMIN_SECRET}`);
    const data = await response.json();
    
    console.log(`Статус: ${response.status} ${response.statusText}\n`);
    console.log('Ответ от Telegram:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.ok) {
      console.log('\n✅ Webhook установлен успешно!');
      console.log('\n🎯 Теперь можно тестировать:');
      console.log('1. Откройте мобильное приложение');
      console.log('2. Нажмите "Получить код в Telegram"');
      console.log('3. Откроется бот @SatoriTeaBot');
      console.log('4. Нажмите /start → получите код');
    } else {
      console.log('\n❌ Ошибка установки webhook');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

setupTelegram();