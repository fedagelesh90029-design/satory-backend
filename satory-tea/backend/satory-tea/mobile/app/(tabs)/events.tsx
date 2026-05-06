import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { apiFetch, MEDIA_BASE } from '../../constants/api';

const { width } = Dimensions.get('window');

function EventCard({ event, onPress }: { event: any; onPress: () => void }) {
  const imageUri = event.image_url
    ? event.image_url.startsWith('http') ? event.image_url : `${MEDIA_BASE}${event.image_url}`
    : null;

  const d        = new Date(event.date);
  const day      = d.getDate();
  const month    = d.toLocaleString('ru', { month: 'short' });
  const seatsLeft = event.seats_total ? event.seats_total - (event.seats_taken || 0) : null;
  const isFull   = seatsLeft !== null && seatsLeft <= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Фото */}
      <View style={styles.cardImg}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.cardImgPlaceholder]}>
              <Text style={{ fontSize: 40 }}>🍵</Text>
            </View>
        }
        {/* Дата-бейдж */}
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        {/* Бейдж мест */}
        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>Мест нет</Text>
          </View>
        )}
      </View>

      {/* Инфо */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
        {event.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {event.description.replace(/<[^>]+>/g, '')}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.cardPrice}>
            {event.price > 0 ? `${Number(event.price).toLocaleString('ru')} ₽` : 'Бесплатно'}
          </Text>
          {seatsLeft !== null && !isFull && (
            <Text style={styles.cardSeats}>
              <Ionicons name="people-outline" size={12} color={Colors.gray} /> {seatsLeft} мест
            </Text>
          )}
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const [events, setEvents]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/events');
      setEvents(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Мероприятия</Text>
        <Text style={styles.subtitle}>Церемонии, мастер-классы, дегустации</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.gray }}>Загрузка...</Text>
        </View>
      ) : events.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>🍵</Text>
          </View>
          <Text style={styles.emptyTitle}>Скоро здесь появятся события</Text>
          <Text style={styles.emptyText}>
            Мы готовим расписание чайных церемоний, дегустаций пуэров и мастер-классов по гунфу-ча.
          </Text>
          <View style={styles.teaser}>
            {[
              { icon: 'cafe-outline',   text: 'Дегустации пуэров' },
              { icon: 'school-outline', text: 'Мастер-классы гунфу-ча' },
              { icon: 'ribbon-outline', text: 'Чайные церемонии' },
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
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e._id || e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => router.push({ pathname: '/event', params: { id: item._id || item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title:      { color: Colors.white, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle:   { color: Colors.gray, fontSize: 13 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  // Card
  card:       { backgroundColor: Colors.card, borderRadius: 18, overflow: 'hidden' },
  cardImg:    { height: 180, position: 'relative' },
  cardImgPlaceholder: { backgroundColor: Colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  dateBadge:  { position: 'absolute', top: 12, left: 12, backgroundColor: Colors.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 44 },
  dateDay:    { color: Colors.bg, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  dateMonth:  { color: Colors.bg, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  fullBadge:  { position: 'absolute', top: 12, right: 12, backgroundColor: Colors.red, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  fullBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  cardBody:   { padding: 16 },
  cardTitle:  { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 6, lineHeight: 22 },
  cardDesc:   { color: Colors.gray, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardPrice:  { color: Colors.gold, fontSize: 15, fontWeight: '700', flex: 1 },
  cardSeats:  { color: Colors.gray, fontSize: 12 },
  cardArrow:  { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },

  // Empty state
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  iconBox:    { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', justifyContent: 'center' },
  iconEmoji:  { fontSize: 36 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText:  { color: Colors.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  teaser:     { backgroundColor: Colors.card, borderRadius: 16, padding: 16, width: '100%', gap: 12, marginTop: 8 },
  teaserRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teaserIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  teaserText: { color: Colors.grayLight, fontSize: 14 },
});
