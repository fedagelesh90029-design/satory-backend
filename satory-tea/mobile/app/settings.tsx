import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, SafeAreaView, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(true);
  const [darkMode] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Настройки</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>УВЕДОМЛЕНИЯ</Text>
        <View style={styles.card}>
          <SettingRow label="Push-уведомления" value={pushEnabled} onChange={setPushEnabled} />
          <SettingRow label="Акции и промокоды" value={promoEnabled} onChange={setPromoEnabled} border />
        </View>

        <Text style={styles.section}>ВНЕШНИЙ ВИД</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Тёмная тема</Text>
            <Switch value={darkMode} disabled trackColor={{ true: Colors.gold }} />
          </View>
        </View>

        <Text style={styles.section}>О ПРИЛОЖЕНИИ</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://vk.com/satori_tea')}>
            <Text style={styles.rowLabel}>Сайт чайной</Text>
            <Ionicons name="open-outline" size={16} color={Colors.gray} />
          </TouchableOpacity>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
            <Text style={styles.rowLabel}>Версия приложения</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({ label, value, onChange, border }: any) {
  return (
    <View style={[styles.row, border && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.gold }} thumbColor={Colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 8 },
  section: { color: Colors.gray, fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel: { color: Colors.white, fontSize: 15 },
  rowValue: { color: Colors.gray, fontSize: 14 },
});
