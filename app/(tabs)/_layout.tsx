import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useCart } from '../../context/CartContext';

function ChatFAB() {
  const router = useRouter();
  const pathname = usePathname();
  // Не показываем FAB на экране чата
  if (pathname === '/chat') return null;
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/chat')}
      activeOpacity={0.85}
    >
      <Ionicons name="chatbubble-ellipses" size={24} color={Colors.bg} />
    </TouchableOpacity>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const router = useRouter();
  const { count } = useCart();

  const tabs = [
    { name: 'index',   label: 'Главная',  icon: 'home-outline' },
    { name: 'catalog', label: 'Каталог',  icon: 'cube-outline' },
    { name: 'events',  label: 'События',  icon: 'calendar-outline' },
    { name: 'profile', label: 'Профиль',  icon: 'person-outline' },
  ];

  return (
    <View style={styles.tabBarWrapper}>
      {/* Chat FAB — поверх таббара, правый угол */}
      <ChatFAB />

      <View style={styles.tabBar}>
        {tabs.map((tab, i) => {
          const isFocused = state.index === i;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={tab.icon as any}
                  size={22}
                  color={isFocused ? Colors.gold : Colors.gray}
                />
                {/* Бейдж корзины на каталоге */}
                {tab.name === 'catalog' && count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
                  </View>
                )}
                {isFocused && <View style={styles.dot} />}
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="catalog" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'relative',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.gray,
  },
  tabLabelActive: {
    color: Colors.gold,
  },
  dot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 68,   // над таббаром
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 8,
    shadowColor: Colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  fabKanji: {
    color: Colors.bg,
    fontSize: 22,
    fontWeight: '300',
  },
});
