import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { SatoryLogoIcon } from '../../components/SatoryLogo';

// ... (STATUS_COLORS definition unchanged) ...

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  useEffect(() => { refreshUser(); }, []);

  if (!user) {
    return (
      <View style={[styles.authContainer, { paddingTop: insets.top }]}>
        <Ionicons name="person-circle-outline" size={80} color={Colors.gold} />
        <Text style={styles.authTitle}>Войдите в аккаунт</Text>
        <Text style={styles.authSub}>Чтобы видеть заказы, бонусы и избранное</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => router.push('/auth')}>
          <Text style={styles.authBtnText}>Войти / Зарегистрироваться</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const maxPoints = 1000;
  const bonusBalance = user.bonus_balance ?? user.bonus_points ?? 0;
  const progress = Math.min(bonusBalance / maxPoints, 1);
  const toGold = Math.max(0, 1000 - bonusBalance);

  // ... (items definitions unchanged) ...

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>
      {/* User card */}
      <View style={styles.userCard}>
        <View style={styles.avatarBox}>
          <Ionicons name="person-circle" size={64} color={Colors.gold} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[user.loyalty_status] + '33' }]}>
            <Ionicons name="ribbon-outline" size={12} color={STATUS_COLORS[user.loyalty_status]} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[user.loyalty_status] }]}>
              {user.loyalty_status}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          {[
            { icon: 'leaf-outline', value: user.orders_count ?? 0, label: 'Заказов' },
            { icon: 'star-outline', value: user.visits, label: 'Посещений' },
            { icon: 'gift-outline', value: bonusBalance, label: 'Бонусов' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Ionicons name={s.icon as any} size={18} color={Colors.gold} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bonus progress */}
      <View style={styles.bonusCard}>
        <View style={styles.bonusHeader}>
          <Text style={styles.bonusTitle}>{bonusBalance} бонусных баллов</Text>
          <Ionicons name="gift-outline" size={20} color={Colors.gold} />
        </View>
        <Text style={styles.bonusSub}>До статуса «Золото» — {toGold} баллов</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Sections */}
      <MenuSection title="АККАУНТ" items={accountItems} />
      <MenuSection title="ПРИЛОЖЕНИЕ" items={appItems} />
      <MenuSection title="ПОДДЕРЖКА" items={supportItems} />

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          if (Platform.OS === 'web') {
            if (window.confirm('Выйти из аккаунта?')) {
              logout();
              router.replace('/auth');
            }
          } else {
            Alert.alert('Выход', 'Выйти из аккаунта?', [
              { text: 'Отмена', style: 'cancel' },
              { text: 'Выйти', style: 'destructive', onPress: () => { logout(); router.replace('/auth'); } },
            ]);
          }
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={Colors.red} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function MenuSection({ title, items }: { title: string; items: any[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.menuCard}>
        {items.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuItem, i < items.length - 1 && styles.menuItemBorder]} onPress={item.onPress}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={18} color={Colors.gold} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              {item.badge && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
              {item.tag && (
                <View style={styles.menuTag}>
                  <Text style={styles.menuTagText}>{item.tag}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  authContainer: {
    flex: 1, backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  authTitle: { color: Colors.white, fontSize: 22, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  authSub: { color: Colors.gray, fontSize: 14, textAlign: 'center', marginBottom: 32 },
  authBtn: { backgroundColor: Colors.gold, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 28 },
  authBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },
  userCard: {
    backgroundColor: Colors.card, margin: 20, borderRadius: 20, padding: 20,
    marginTop: 60,
  },
  avatarBox: { alignSelf: 'center', marginBottom: 8 },
  userInfo: { alignItems: 'center', marginBottom: 16 },
  userName: { color: Colors.white, fontSize: 20, fontWeight: '700', marginBottom: 4 },
  userEmail: { color: Colors.gray, fontSize: 13, marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  statLabel: { color: Colors.gray, fontSize: 11 },
  bonusCard: { backgroundColor: Colors.card, marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 8 },
  bonusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bonusTitle: { color: Colors.gold, fontSize: 15, fontWeight: '700' },
  bonusSub: { color: Colors.gray, fontSize: 12, marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: Colors.gold, borderRadius: 3 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { color: Colors.gray, fontSize: 11, letterSpacing: 1.5, marginBottom: 8 },
  menuCard: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, minHeight: 52 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  menuIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  menuLabel: { color: Colors.white, fontSize: 14, flex: 1, flexWrap: 'wrap' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  menuBadge: { backgroundColor: Colors.cardAlt, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  menuBadgeText: { color: Colors.grayLight, fontSize: 11 },
  menuTag: { backgroundColor: Colors.gold + '33', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  menuTagText: { color: Colors.gold, fontSize: 11, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.red + '22', marginHorizontal: 20, marginTop: 16,
    borderRadius: 16, padding: 16,
  },
  logoutText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
});
