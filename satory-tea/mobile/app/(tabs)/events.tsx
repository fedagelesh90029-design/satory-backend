import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { apiFetch } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';

const MONTHS = [
  { label: 'Апрель', value: 4 },
  { label: 'Май', value: 5 },
  { label: 'Июнь', value: 6 },
];

export default function EventsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [month, setMonth] = useState(4);

  const load = () => {
    apiFetch(`/events?month=${month}`).then(setEvents).catch(() => {});
  };

  useEffect(() => { load(); }, [month]);

  const register = async (eventId: number) => {
    if (!token) {
      Alert.alert('Войдите', 'Для записи нужно войти в аккаунт');
      return;
    }
    try {
      await apiFetch(`/events/${eventId}/register`, { method: 'POST' }, token);
      Alert.alert('Готово', 'Вы записаны на мероприятие');
      load();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const featured = events[0];
  const rest = events.slice(1);

  const monthCounts: Record<number, number> = { 4: 2, 5: 2, 6: 1 };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Мероприятия</Text>
        <Text style={styles.subtitle}>Чайные церемонии, мастер-классы, дегустации</Text>
      </View>

      {/* Month tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {MONTHS.map(m => (
          <TouchableOpacity
            key={m.value}
            style={[styles.tab, month === m.value && styles.tabActive]}
            onPress={() => setMonth(m.value)}
          >
            <Text style={[styles.tabText, month === m.value && styles.tabTextActive]}>{m.label}</Text>
            {monthCounts[m.value] && (
              <View style={[styles.tabBadge, month === m.value && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, month === m.value && { color: Colors.bg }]}>
                  {monthCounts[m.value]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured event */}
      {featured && (
        <View style={styles.featuredCard}>
          <View style={styles.featuredImageBox}>
            <View style={styles.featuredImagePlaceholder}>
              <Ionicons name="cafe-outline" size={48} color={Colors.gold} />
            </View>
            <View style={styles.featuredOverlay}>
              <View style={styles.tagRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{featured.type}</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{new Date(featured.date).getDate()} {new Date(featured.date).toLocaleString('ru', { month: 'long' })}</Text></View>
              </View>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <View style={styles.featuredMeta}>
                <Text style={styles.featuredTime}>⏱ {featured.time_start} — {featured.time_end}</Text>
                <Text style={styles.featuredSeats}>  {featured.seats_total - featured.seats_taken} мест</Text>
                <TouchableOpacity style={styles.registerBtn} onPress={() => register(featured.id)}>
                  <Text style={styles.registerBtnText}>Записаться · {featured.price?.toLocaleString('ru')} ₽</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Event list */}
      {rest.map(ev => (
        <TouchableOpacity key={ev.id} style={styles.eventRow}>
          <View style={styles.dateBox}>
            <Text style={styles.dateDay}>{new Date(ev.date).getDate()}</Text>
            <Text style={styles.dateMonth}>{new Date(ev.date).toLocaleString('ru', { month: 'short' })}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.evType}>{ev.type}</Text>
            <Text style={styles.evTitle}>{ev.title}</Text>
            <Text style={styles.evTime}>⏱ {ev.time_start} — {ev.time_end}  👥 {ev.seats_taken}/{ev.seats_total}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
        </TouchableOpacity>
      ))}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 },
  title: { color: Colors.white, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: Colors.gray, fontSize: 13 },
  tabs: { marginBottom: 16 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.card,
  },
  tabActive: { backgroundColor: Colors.gold },
  tabText: { color: Colors.gray, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: Colors.bg, fontWeight: '700' },
  tabBadge: {
    backgroundColor: Colors.border, borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeActive: { backgroundColor: Colors.bg },
  tabBadgeText: { color: Colors.gray, fontSize: 10, fontWeight: '700' },
  featuredCard: { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  featuredImageBox: { position: 'relative' },
  featuredImagePlaceholder: {
    height: 220, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  featuredOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tagRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tag: { backgroundColor: 'rgba(201,168,76,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: Colors.gold, fontSize: 11, fontWeight: '600' },
  featuredTitle: { color: Colors.white, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  featuredTime: { color: Colors.grayLight, fontSize: 12 },
  featuredSeats: { color: Colors.grayLight, fontSize: 12 },
  registerBtn: { backgroundColor: Colors.gold, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  registerBtnText: { color: Colors.bg, fontSize: 13, fontWeight: '700' },
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, marginHorizontal: 20, borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  dateBox: { alignItems: 'center', minWidth: 36 },
  dateDay: { color: Colors.gold, fontSize: 20, fontWeight: '700' },
  dateMonth: { color: Colors.gray, fontSize: 11, textTransform: 'capitalize' },
  eventInfo: { flex: 1 },
  evType: { color: Colors.gold, fontSize: 11, marginBottom: 2 },
  evTitle: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  evTime: { color: Colors.gray, fontSize: 12 },
});
