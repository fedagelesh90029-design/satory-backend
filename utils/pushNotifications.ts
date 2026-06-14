import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from '../constants/api';

// Как показывать уведомления когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Запрашивает разрешение и регистрирует push-токен на сервере.
 * Вызывать после успешного входа пользователя.
 */
export async function registerPushToken(token: string): Promise<void> {
  // Web не поддерживает push
  if (Platform.OS === 'web') return;

  try {
    let finalStatus = 'granted';

    // Запрашиваем разрешение только на реальном устройстве
    if (Device.isDevice) {
      const { status: existing } = await Notifications.getPermissionsAsync();
      finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Разрешение не получено:', finalStatus);
      return;
    }

    // Android — создаём канал уведомлений ДО получения токена
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'САТОРИ',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E4B10D',
      });
    }

    // Получаем Expo Push Token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '3d014938-f9a2-4a6c-90e7-c63c2e0a6b6c',
    });

    const pushToken = tokenData.data;
    console.log('[push] Токен получен:', pushToken?.slice(0, 30));

    if (!pushToken) {
      console.log('[push] Токен пустой');
      return;
    }

    // Отправляем на сервер
    await apiFetch('/user/push-token', {
      method: 'POST',
      body: JSON.stringify({ push_token: pushToken }),
    }, token);

    console.log('[push] Токен сохранён на сервере');

  } catch (e: any) {
    console.error('[push] Ошибка:', e?.message || e);
  }
}

/**
 * Удаляет push-токен с сервера (при выходе из аккаунта).
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    await apiFetch('/user/push-token', { method: 'DELETE' }, token);
  } catch {}
}
