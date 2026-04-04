import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0A' } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat" options={{ presentation: 'modal' }} />
            <Stack.Screen name="auth" />
            <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
            <Stack.Screen name="qr" options={{ presentation: 'modal' }} />
            <Stack.Screen name="transactions" options={{ presentation: 'modal' }} />
            <Stack.Screen name="personal-data" options={{ presentation: 'modal' }} />
            <Stack.Screen name="favorites" options={{ presentation: 'modal' }} />
            <Stack.Screen name="loyalty" options={{ presentation: 'modal' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="privacy" options={{ presentation: 'modal' }} />
            <Stack.Screen name="help" options={{ presentation: 'modal' }} />
            <Stack.Screen name="rate" options={{ presentation: 'modal' }} />
          </Stack>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
