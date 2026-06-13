import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, ImageBackground, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { apiFetch } from '../../constants/api';
import { SatoryLogoFull } from '../../components/SatoryLogo';
import { ProductCard } from '../../components/ProductCard';
import { Banner } from '../../components/Banner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/products').then(setProducts).catch(() => {});
    apiFetch('/events').then(setEvents).catch(() => {});
  }, []);

  const featured = products.filter(p => p.badge).length > 0 
    ? products.filter(p => p.badge) 
    : products.slice(0, 8);
  const upcoming = events.slice(0, 2);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), flexDirection: 'column', alignItems: 'stretch' }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View>
            <Text style={styles.welcome}>ДОБРО ПОЖАЛОВАТЬ В</Text>
            <SatoryLogoFull size={36} />
          </View>
          <TouchableOpacity style={styles.leafBtn} onPress={() => router.push('/(tabs)/catalog')}>
            <Ionicons name="leaf-outline" size={20} color={Colors.gold} />
          </TouchableOpacity>
        </View>
        <View style={[styles.addressRow, { justifyContent: 'space-between', marginTop: 4 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={13} color={Colors.gold} />
            <Text style={styles.address}>ул. Кирова, 26 · Адлер</Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('tel:+79890887444')}>
            <Text style={[styles.address, { textDecorationLine: 'underline' }]}>+7 (989) 088-74-44</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content wrapper with 20px padding */}
      <View style={{ paddingHorizontal: 20 }}>
        
        {/* AI Chat bubble */}
        {(() => {
          const greetingName = user?.name ? user.name : 'друг';
          return (
            <TouchableOpacity style={styles.chatBubbleContainer} onPress={() => router.push('/chat')} activeOpacity={0.85}>
              <LinearGradient
                colors={[Colors.gold + '22', '#1A1A1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chatBubble}
              >
                <View style={styles.chatBubbleAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={22} color={Colors.gold} />
                </View>
                <View style={styles.chatBubbleBody}>
                  <Text style={styles.chatBubbleName}>Чайный советник ✨</Text>
                  <Text style={styles.chatBubbleText} numberOfLines={2}>
                    Привет, {greetingName}! Я помогу выбрать чай или забронирую стол. Отвечу на любой вопрос прямо сейчас!
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })()}

        {/* Dynamic Gallery Banner */}
        <Banner />

        {/* Static Hero Banner */}
        <ImageBackground
          source={require('../../assets/banner.jpg')}
          style={styles.banner}
          imageStyle={{ borderRadius: 20, opacity: 0.7 }}
        >
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>САТОРИ</Text>
            </View>
            <Text style={styles.bannerTitle}>Место, где чай{'\n'}становится ритуалом</Text>
            <TouchableOpacity style={styles.bannerBtn} onPress={() => router.push('/(tabs)/catalog')}>
              <Text style={styles.bannerBtnText}>Смотреть  ›</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'leaf-outline', value: 'Селективный чай', label: 'Прямые поставки из Китая' },
            { icon: 'flame-outline', value: 'Атмосфера', label: 'Уникальная концепция и стиль' },
            { icon: 'star-outline', value: '5.0★', label: 'Рейтинг Топ-1 в г. Сочи' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon as any} size={20} color={Colors.gold} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Featured */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Избранное</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/catalog')}>
              <Text style={styles.seeAll}>Все товары ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {featured.slice(0, 4).map(item => (
              <View key={item._id || item.id} style={{ width: '50%' }}>
                <ProductCard
                  item={item}
                  onPress={() => router.push({ pathname: '/product', params: { id: item._id || item.id } })}
                  onCart={(qty) => {
                    const isTeaToGo = item.name?.toLowerCase().includes('с собой');
                    if (isTeaToGo) {
                      router.push({ pathname: '/product', params: { id: item._id || item.id } });
                    } else if (qty) {
                      for(let i=0; i<qty; i++) add(item);
                    } else {
                      add(item);
                    }
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ближайшие события</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
              <Text style={styles.seeAll}>Все ›</Text>
            </TouchableOpacity>
          </View>
          {upcoming.length > 0 ? upcoming.map(ev => (
            <TouchableOpacity
              key={ev._id || ev.id}
              style={styles.eventCard}
              onPress={() => router.push({ pathname: '/event', params: { id: ev._id || ev.id } })}
            >
              <View style={styles.eventDate}>
                <Text style={styles.eventDay}>{new Date(ev.date).getDate()}</Text>
                <Text style={styles.eventMonth}>
                  {new Date(ev.date).toLocaleString('ru', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventType}>{ev.type}</Text>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                <Text style={styles.eventTime}>⏱ {ev.time_start} — {ev.time_end}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.gold} />
            </TouchableOpacity>
          )) : (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>🍵 Скоро анонсируем новые события</Text>
            </View>
          )}
        </View>

      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  welcome: { color: Colors.gray, fontSize: 11, letterSpacing: 2, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  address: { color: Colors.gold, fontSize: 12, fontStyle: 'italic', letterSpacing: 0.5 },
  leafBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
  },
  chatBubbleContainer: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  chatBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
  },
  chatBubbleAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.gold + '22', borderWidth: 1, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  chatBubbleBody: { flex: 1 },
  chatBubbleName: { color: Colors.gold, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  chatBubbleText: { color: Colors.white, fontSize: 12, lineHeight: 17 },
  banner: {
    borderRadius: 20,
    aspectRatio: 1.5, marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  bannerOverlay: {
    flex: 1, padding: 24, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerBadge: {
    backgroundColor: Colors.gold, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10,
  },
  bannerBadgeText: { color: Colors.bg, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { color: Colors.white, fontSize: 22, fontWeight: '700', marginBottom: 16, lineHeight: 28 },
  bannerBtn: {
    backgroundColor: Colors.gold, alignSelf: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24,
  },
  bannerBtnText: { color: Colors.bg, fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { color: Colors.white, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: Colors.gray, fontSize: 10, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  seeAll: { color: Colors.gold, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  eventCard: {
    backgroundColor: Colors.card, borderRadius: 14,
    flexDirection: 'row', padding: 14, marginBottom: 8, gap: 14,
  },
  eventDate: { alignItems: 'center', justifyContent: 'center', minWidth: 36 },
  eventDay: { color: Colors.gold, fontSize: 22, fontWeight: '700' },
  eventMonth: { color: Colors.gray, fontSize: 11, textTransform: 'capitalize' },
  eventInfo: { flex: 1 },
  eventType: { color: Colors.gold, fontSize: 11, marginBottom: 2 },
  eventTitle: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  eventTime: { color: Colors.gray, fontSize: 12 },
  emptyEvents: {
    backgroundColor: Colors.card, borderRadius: 14,
    padding: 20, alignItems: 'center',
  },
  emptyEventsText: { color: Colors.gray, fontSize: 14 },
});
