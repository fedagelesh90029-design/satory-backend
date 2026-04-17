import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';

export default function NotificationsScreen() {
  const router = useRouter();
  const { settings, toggleSetting } = useSettings();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); };

  const items = [
    { key: 'push_events',  icon: 'calendar-outline',  label: 'Новые мероприятия',  sub: 'Дегустации, мастер-классы, церемонии' },
    { key: 'push_bonuses', icon: 'gift-outline',       label: 'Бонусные операции',  sub: 'Начисление и списание баллов' },
    { key: 'push_orders',  icon: 'bag-outline',        label: 'Статус заказа',      sub: 'Обновления по вашим заказам' },
    { key: 'push_promos',  icon: 'pricetag-outline',   label: 'Акции и скидки',     sub: 'Специальные предложения' },
    { key: 'push_news',    icon: 'newspaper-outline',  label: 'Новости чайной',     sub: 'Новые поступления, события' },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Уведомления</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>Управляйте тем, какие уведомления вы хотите получать</Text>
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={item.key} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <View style={styles.iconBox}>
                <Ionicons name={item.icon} size={18} color={Colors.gold} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.rowSub}>{item.sub}</Text>
              </View>
              <Switch
                value={settings[item.key]}
                onValueChange={() => toggleSetting(item.key)}
                trackColor={{ true: Colors.gold, false: Colors.border }}
                thumbColor={Colors.white}
              />
            </View>
          ))}
        </View>
        <Text style={styles.note}>
          Настройки синхронизированы с разделом «Настройки» в профиле
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:   { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:     { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content:   { padding: 20, gap: 12, paddingBottom: 40 },
  hint:      { color: Colors.gray, fontSize: 13, lineHeight: 18 },
  note:      { color: Colors.gray, fontSize: 12, textAlign: 'center', marginTop: 4 },
  card:      { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  row:       { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox:   { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  rowInfo:   { flex: 1 },
  rowLabel:  { color: Colors.white, fontSize: 14, fontWeight: '600' },
  rowSub:    { color: Colors.gray, fontSize: 12, marginTop: 2 },
});
