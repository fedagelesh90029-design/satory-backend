/**
 * Установка webhook для Telegram бота
 */

const VPS_URL = 'http://72.56.245.188';
const ADMIN_SECRET = 'satori';

async function setupTelegram() {
  console.log('🤖 Устанавливаем webhook для Telegram бота...\n');

  try {
    const response = await fetch(`${VPS_URL}/api/telegram/setup?secret=${ADMIN_SECRET}`);
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