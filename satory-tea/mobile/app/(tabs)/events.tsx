import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мероприятия</Text>
        <Text style={styles.subtitle}>Чайные церемонии, мастер-классы, дегустации</Text>
      </View>

      <View style={styles.empty}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🍵</Text>
        </View>
        <Text style={styles.emptyTitle}>Скоро здесь появятся события</Text>
        <Text style={styles.emptyText}>
          Мы готовим расписание чайных церемоний, дегустаций пуэров и мастер-классов по гунфу-ча.
          Следите за обновлениями.
        </Text>
        <View style={styles.teaser}>
          {[
            { icon: 'cafe-outline',     text: 'Дегустации пуэров' },
            { icon: 'school-outline',   text: 'Мастер-классы гунфу-ча' },
            { icon: 'ribbon-outline',   text: 'Чайные церемонии' },
          ].map((item, i) => (
            <View key={i} style={styles.teaserRow}>
              <View style={styles.teaserIcon}>
                <Ionicons name={item.icon as any} size={18} color={Colors.gold} />
              </View>
              <Text style={styles.teaserText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: Colors.gray, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 36 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText: { color: Colors.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  teaser: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, width: '100%', gap: 12, marginTop: 8 },
  teaserRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teaserIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  teaserText: { color: Colors.grayLight, fontSize: 14 },
});
