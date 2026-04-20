import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const LEVELS = [
  { name: 'Бронза',  min: 0,    max: 499,  color: '#CD7F32', perks: ['Скидка 3% на все покупки', 'Доступ к каталогу', 'История операций'] },
  { name: 'Серебро', min: 500,  max: 999,  color: '#C0C0C0', perks: ['Скидка 5% на все покупки', 'Приоритетная запись на события', ''] },
  { name: 'Золото',  min: 1000, max: null, color: '#C9A84C', perks: ['Закрытые дегустации', 'Скидка 10% на всё', ''] },
];

export default function LoyaltyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const balance = (user as any)?.bonus_balance ?? user?.bonus_points ?? 0;
  const status = user?.loyalty_status || 'Бронза';

  const currentLevel = LEVELS.find(l => l.name === status) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1];
  const progress = nextLevel
    ? Math.min((balance - currentLevel.min) / (nextLevel.min - currentLevel.min), 1)
    : 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Программа лояльности</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Текущий статус */}
        <View style={[styles.statusCard, { borderColor: currentLevel.color }]}>
          <View style={[styles.statusBadge, { backgroundColor: currentLevel.color + '22' }]}>
            <Ionicons name="ribbon" size={28} color={currentLevel.color} />
          </View>
          <Text style={[styles.statusName, { color: currentLevel.color }]}>{status}</Text>
          <Text style={styles.statusBalance}>{balance} баллов</Text>
          {nextLevel && (
            <>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: currentLevel.color }]} />
              </View>
              <Text style={styles.progressHint}>
                До статуса «{nextLevel.name}» — {nextLevel.min - balance} баллов
              </Text>
            </>
          )}
          {!nextLevel && <Text style={styles.progressHint}>Максимальный статус достигнут 🎉</Text>}
        </View>

        {/* Привилегии текущего уровня */}
        <Text style={styles.section}>ВАШИ ПРИВИЛЕГИИ</Text>
        <View style={styles.card}>
          {currentLevel.perks.filter(p => p).map((perk, i) => (
            <View key={i} style={[styles.perkRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* Все уровни */}
        <Text style={styles.section}>ВСЕ УРОВНИ</Text>
        {LEVELS.map((level, i) => {
          const isActive = level.name === status;
          const isPassed = LEVELS.indexOf(currentLevel) > i;
          return (
            <View key={i} style={[styles.levelCard, isActive && { borderColor: level.color, borderWidth: 1 }]}>
              <View style={styles.levelHeader}>
                <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                  <Ionicons name="ribbon-outline" size={16} color={level.color} />
                </View>
                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, { color: level.color }]}>{level.name}</Text>
                  <Text style={styles.levelRange}>
                    {level.max ? `${level.min}–${level.max} баллов` : `от ${level.min} баллов`}
                  </Text>
                </View>
                {(isActive || isPassed) && (
                  <Ionicons name={isPassed ? 'checkmark-circle' : 'radio-button-on'} size={20} color={level.color} />
                )}
              </View>
              {level.perks.map((p, j) => (
                <Text key={j} style={[styles.levelPerk, !p && { opacity: 0 }]}>• {p || '—'}</Text>
              ))}
            </View>
          );
        })}
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
  statusCard: { backgroundColor: Colors.card, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, marginBottom: 8 },
  statusBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statusName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statusBalance: { color: Colors.white, fontSize: 16, marginBottom: 16 },
  progressBar: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 8 },
  progressFill: { height: 8, borderRadius: 4 },
  progressHint: { color: Colors.gray, fontSize: 12 },
  section: { color: Colors.gray, fontSize: 11, letterSpacing: 1.5, marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  perkText: { color: Colors.white, fontSize: 14 },
  levelCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginBottom: 8, borderColor: 'transparent', borderWidth: 1 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  levelBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  levelInfo: { flex: 1 },
  levelName: { fontSize: 15, fontWeight: '700' },
  levelRange: { color: Colors.gray, fontSize: 12 },
  levelPerk: { color: Colors.gray, fontSize: 12, marginLeft: 46, marginBottom: 3 },
});
