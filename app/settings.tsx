import React from 'react';
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, Linking, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, toggleSetting } = useSettings();
  const { logout } = useAuth();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Выйти из аккаунта?')) {
        logout();
        router.replace('/auth');
      }
    } else {
      Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => { logout(); router.replace('/auth'); } },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Уведомления */}
        <Text style={styles.section}>УВЕДОМЛЕНИЯ</Text>
        <View style={styles.card}>
          <Row label="Новые мероприятия"   value={settings.push_events}  onToggle={() => toggleSetting('push_events')} />
          <Row label="Бонусные операции"   value={settings.push_bonuses} onToggle={() => toggleSetting('push_bonuses')} border />
          <Row label="Статус заказа"       value={settings.push_orders}  onToggle={() => toggleSetting('push_orders')}  border />
          <Row label="Акции и промокоды"   value={settings.push_promos}  onToggle={() => toggleSetting('push_promos')}  border />
          <Row label="Новости чайной"      value={settings.push_news}    onToggle={() => toggleSetting('push_news')}    border />
        </View>

        {/* Внешний вид */}
        <Text style={styles.section}>ВНЕШНИЙ ВИД</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Тёмная тема</Text>
            <Switch
              value={settings.dark_mode}
              disabled
              trackColor={{ true: Colors.gold, false: Colors.border }}
              thumbColor={Colors.white}
            />
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Text style={[styles.rowLabel, { color: Colors.gray, fontSize: 12 }]}>
              Светлая тема появится в следующем обновлении
            </Text>
          </View>
        </View>

        {/* О приложении */}
        <Text style={styles.section}>О ПРИЛОЖЕНИИ</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => Linking.openURL('https://vk.com/satori_tea_sochi')}
          >
            <Text style={styles.rowLabel}>Страница ВКонтакте</Text>
            <Ionicons name="open-outline" size={16} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.linkRow, { borderTopWidth: 1, borderTopColor: Colors.border }]}
            onPress={() => router.push('/privacy')}
          >
            <Text style={styles.rowLabel}>Политика конфиденциальности</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
          </TouchableOpacity>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Text style={styles.rowLabel}>Версия приложения</Text>
            <Text style={styles.rowValue}>1.3.9</Text>
          </View>
        </View>

        {/* Выход */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={Colors.red} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, onToggle, border }: {
  label: string; value: boolean; onToggle: () => void; border?: boolean;
}) {
  return (
    <View style={[styles.row, border && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: Colors.gold, false: Colors.border }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:      { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content:    { padding: 20, gap: 8, paddingBottom: 40 },
  section:    { color: Colors.gray, fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  card:       { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  linkRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel:   { color: Colors.white, fontSize: 15, flex: 1 },
  rowValue:   { color: Colors.gray, fontSize: 14 },
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 16, padding: 16, marginTop: 8 },
  logoutText: { color: Colors.red, fontSize: 15, fontWeight: '600' },
});
