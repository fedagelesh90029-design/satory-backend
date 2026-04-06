import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const SECTIONS = [
  {
    title: 'Какие данные мы собираем',
    text: 'Номер телефона для идентификации в программе лояльности. Имя для персонализации. История покупок и бонусных операций для отображения в приложении.',
  },
  {
    title: 'Как мы используем данные',
    text: 'Данные используются исключительно для работы программы лояльности Satori. Мы не передаём ваши данные третьим лицам и не используем их в рекламных целях без вашего согласия.',
  },
  {
    title: 'Хранение данных',
    text: 'Данные хранятся на защищённых серверах. Бонусный баланс синхронизируется с системой iiko чайной. Вы можете запросить удаление своих данных через поддержку.',
  },
  {
    title: 'Ваши права',
    text: 'Вы вправе запросить копию своих данных, исправить неточности или удалить аккаунт. Для этого обратитесь в поддержку через раздел «Помощь и FAQ».',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Конфиденциальность</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topCard}>
          <Ionicons name="shield-checkmark" size={40} color={Colors.green} />
          <Text style={styles.topTitle}>Ваши данные защищены</Text>
          <Text style={styles.topSub}>Мы серьёзно относимся к конфиденциальности</Text>
        </View>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionText}>{s.text}</Text>
          </View>
        ))}
        <Text style={styles.updated}>Последнее обновление: апрель 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 12 },
  topCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 24, alignItems: 'center', gap: 8, marginBottom: 8 },
  topTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  topSub: { color: Colors.gray, fontSize: 13, textAlign: 'center' },
  section: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 8 },
  sectionTitle: { color: Colors.gold, fontSize: 14, fontWeight: '700' },
  sectionText: { color: Colors.grayLight, fontSize: 13, lineHeight: 20 },
  updated: { color: Colors.gray, fontSize: 11, textAlign: 'center', marginTop: 8 },
});
