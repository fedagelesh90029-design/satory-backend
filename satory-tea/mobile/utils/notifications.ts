import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function showWelcomeNotification(name: string, isNew: boolean) {
  if (Platform.OS === 'web') return;
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isNew ? '🍵 Добро пожаловать в Satory!' : '🍵 С возвращением!',
      body: isNew
        ? `${name}, рады видеть вас! Начисляем бонусы за каждую покупку.`
        : `${name}, рады снова видеть вас в Satory Tea.`,
    },
    trigger: null, // сразу
  });
}
