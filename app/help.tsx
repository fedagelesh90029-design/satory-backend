import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const FAQ = [
  { q: 'Как начисляются бонусы?', a: 'Бонусы начисляются при каждой покупке в чайной. Кассир сканирует ваш QR-код из приложения и начисляет баллы в системе iiko.' },
  { q: 'Как использовать бонусы?', a: 'Покажите QR-код кассиру и попросите списать бонусы в счёт оплаты. 1 балл = 1 рубль.' },
  { q: 'Когда обновляется баланс?', a: 'Баланс обновляется после синхронизации с системой iiko, обычно в течение нескольких часов после посещения.' },
  { q: 'Как изменить имя в профиле?', a: 'Перейдите в Профиль → Личные данные и измените имя.' },
  { q: 'Как записаться на мероприятие?', a: 'Откройте раздел «События», выберите мероприятие и нажмите «Записаться».' },
];

export default function HelpScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Помощь и FAQ</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ</Text>
        {FAQ.map((item, i) => (
          <TouchableOpacity key={i} style={styles.faqItem} onPress={() => setOpen(open === i ? null : i)}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
            </View>
            {open === i && <Text style={styles.faqA}>{item.a}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.section}>СВЯЗАТЬСЯ С НАМИ</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://vk.com/satori_tea')}>
            <Ionicons name="logo-vk" size={20} color={Colors.gold} />
            <Text style={styles.contactText}>ВКонтакте</Text>
            <Ionicons name="open-outline" size={14} color={Colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactRow, { borderTopWidth: 1, borderTopColor: Colors.border }]}
            onPress={() => Linking.openURL('tel:+79990000000')}>
            <Ionicons name="call-outline" size={20} color={Colors.gold} />
            <Text style={styles.contactText}>Позвонить</Text>
            <Ionicons name="open-outline" size={14} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 8 },
  section: { color: Colors.gray, fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  faqItem: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { color: Colors.white, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  faqA: { color: Colors.gray, fontSize: 13, marginTop: 10, lineHeight: 20 },
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  contactText: { color: Colors.white, fontSize: 15, flex: 1 },
});
