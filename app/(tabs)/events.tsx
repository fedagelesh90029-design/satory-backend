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

// ─── Карточка мероприятия ─────────────────────────────────────────────────────
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
      <View style={styles.cardImg}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, styles.cardImgPlaceholder]}>
              <Text style={{ fontSize: 40 }}>🍵</Text>
            </View>
        }
        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month}</Text>
        </View>
        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>Мест нет</Text>
          </View>
        )}
      </View>
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

// ─── Карточка новости ─────────────────────────────────────────────────────────
function NewsCard({ item, onPress }: { item: any; onPress: () => void }) {
  const imageUri = item.image_url
    ? item.image_url.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}`
    : null;

  const date = new Date(item.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {imageUri && (
        <View style={styles.cardImg}>
          <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.newsDate}>{date}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={3}>
            {item.description.replace(/<[^>]+>/g, '')}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, { color: Colors.gold }]}>Читать</Text>
          <View style={styles.cardArrow}>
            <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Главный экран ────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'events' | 'news'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [news, setNews]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [evData, newsData] = await Promise.all([
        apiFetch('/events'),
        apiFetch('/news'),
      ]);
      setEvents(evData);
      setNews(newsData);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const data = tab === 'events' ? events : news;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Мероприятия</Text>
        {/* Вкладки */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'events' && styles.tabActive]}
            onPress={() => setTab('events')}
          >
            <Text style={[styles.tabText, tab === 'events' && styles.tabTextActive]}>Мероприятия</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'news' && styles.tabActive]}
            onPress={() => setTab('news')}
          >
            <Text style={[styles.tabText, tab === 'news' && styles.tabTextActive]}>Новости</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: Colors.gray }}>Загрузка...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.iconBox}>
            <Text style={styles.iconEmoji}>{tab === 'events' ? '🍵' : '📰'}</Text>
          </View>
          <Text style={styles.emptyTitle}>
            {tab === 'events' ? 'Скоро здесь появятся события' : 'Новостей пока нет'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'events'
              ? 'Мы готовим расписание чайных церемоний, дегустаций и мастер-классов.'
              : 'Следите за обновлениями — скоро здесь появятся новости.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={e => e._id || e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
          renderItem={({ item }) =>
            tab === 'events' ? (
              <EventCard
                event={item}
                onPress={() => router.push({ pathname: '/event', params: { id: item._id } })}
              />
            ) : (
              <NewsCard
                item={item}
                onPress={() => router.push({ pathname: '/news', params: { id: item._id } })}
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  title:      { color: Colors.white, fontSize: 28, fontWeight: '700', marginBottom: 12 },

  // Вкладки
  tabs:       { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 12, padding: 4, gap: 4 },
  tab:        { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:  { backgroundColor: Colors.gold },
  tabText:    { color: Colors.gray, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: Colors.bg },

  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 12 },

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
  newsDate:   { color: Colors.gray, fontSize: 12, marginBottom: 4 },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  iconBox:    { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', justifyContent: 'center' },
  iconEmoji:  { fontSize: 36 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyText:  { color: Colors.gray, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
