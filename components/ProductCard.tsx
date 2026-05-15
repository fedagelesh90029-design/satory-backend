import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  item: any;
  onPress?: () => void;
  onCart?: () => void;
  isFavorited?: boolean;
  hideFav?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  'Хит': '#C9A84C',
  'Новинка': '#4CAF50',
  'Арт': '#9C27B0',
};

// Определяем цвет и эмодзи заглушки по названию и категории
function getPlaceholder(item: any): { emoji: string; bg: string; accent: string } {
  const name = (item.name || '').toLowerCase();
  const cat  = (item.category || '').toLowerCase();

  // Посуда / чайники
  if (cat === 'посуда' || name.includes('чайник') || name.includes('гайвань') || name.includes('пиала') || name.includes('исин')) {
    return { emoji: '🫖', bg: '#2A1F14', accent: '#8B6914' };
  }
  // Шу пуэр — тёмно-красная гуща
  if (cat.includes('шу') || name.includes('шу') || name.includes('shu')) {
    return { emoji: '🟤', bg: '#1A0A0A', accent: '#8B2020' };
  }
  // Шэн пуэр — зелёная гуща
  if (cat.includes('шэн') || name.includes('шэн') || name.includes('sheng') || name.includes('юннань') || name.includes('весенн')) {
    return { emoji: '🟢', bg: '#0A1A0A', accent: '#2D6A2D' };
  }
  // Улун — золотисто-коричневый
  if (cat.includes('улун') || name.includes('улун') || name.includes('oolong') || name.includes('да хун') || name.includes('тегуань')) {
    return { emoji: '🌿', bg: '#1A1500', accent: '#7A6000' };
  }
  // Белый чай — светлый
  if (cat.includes('белый') || name.includes('белый') || name.includes('пион') || name.includes('серебр')) {
    return { emoji: '🌸', bg: '#1A1520', accent: '#9A8AAA' };
  }
  // Красный/чёрный чай
  if (name.includes('красн') || name.includes('чёрн') || name.includes('черн') || name.includes('дянь хун')) {
    return { emoji: '🍂', bg: '#1A0800', accent: '#8B3A00' };
  }
  // Пуэр общий
  if (name.includes('пуэр') || name.includes('пуер') || cat.includes('пуэр')) {
    return { emoji: '🍵', bg: '#0F0F0A', accent: '#5A4A20' };
  }
  // Зелёный чай
  if (cat === 'зелёный' || cat.includes('зелён') || name.includes('лун цзин') || name.includes('би ло') || name.includes('люань') || name.includes('билочунь')) {
    return { emoji: '🍵', bg: '#061206', accent: '#2A7A2A' };
  }
  // Заглушка по умолчанию
  return { emoji: '🍵', bg: '#1A1A0A', accent: '#5A4A20' };
}

export function ProductCard({ item, onPress, onCart, isFavorited = false, hideFav = false }: Props) {
  const { token } = useAuth();
  const [fav, setFav] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);
  const placeholder = getPlaceholder(item);
  const imageUri = item.image_url
    ? item.image_url.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}`
    : null;

  const toggleFav = async () => {
    if (!token) return;
    setFavLoading(true);
    try {
      const id = item._id || item.id;
      const res = await apiFetch(`/products/${id}/favorite`, { method: 'POST' }, token);
      setFav(res.favorited);
    } catch {}
    finally { setFavLoading(false); }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.imageBox, { backgroundColor: placeholder.bg }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderBox}>
            {/* Имитация чайной гущи */}
            <View style={[styles.guschaOuter, { borderColor: placeholder.accent + '44' }]}>
              <View style={[styles.guschaInner, { backgroundColor: placeholder.accent + '33' }]}>
                <Text style={styles.placeholderEmoji}>{placeholder.emoji}</Text>
              </View>
            </View>
            <Text style={[styles.placeholderName, { color: placeholder.accent }]} numberOfLines={1}>
              {item.name?.split(' ').slice(0, 2).join(' ')}
            </Text>
          </View>
        )}
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: BADGE_COLORS[item.badge] || Colors.gold }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {token && !hideFav && (
          <TouchableOpacity
            style={styles.favBtn}
            onPress={toggleFav}
            disabled={favLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? Colors.red : Colors.white} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.category}{item.year ? ` · ${item.year}` : ''}{item.weight ? ` · ${item.weight}` : ''}
        </Text>
        {item.rating > 0 && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color={Colors.gold} />
            <Text style={styles.rating}>{item.rating} ({item.reviews_count})</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {Number(item.price).toLocaleString('ru')} ₽
            {item.unit === 'г' || item.unit === 'гр' ? '/г' : 
             item.unit === 'шт' ? '/шт' : 
             item.unit === 'набор' ? '/набор' : 
             item.unit === 'упак' ? '/упак' : 
             item.unit === 'кг' ? '/кг' : ''}
          </Text>
          <TouchableOpacity style={styles.cartBtn} onPress={onCart}>
            <Ionicons name="cart-outline" size={16} color={Colors.bg} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', flex: 1, margin: 4 },
  imageBox: { position: 'relative', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  placeholderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 6 },
  guschaOuter: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  guschaInner: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderEmoji: { fontSize: 24 },
  placeholderName: { fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: Colors.bg, fontSize: 10, fontWeight: '700' },
  favBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  info: { padding: 10 },
  name: { color: Colors.white, fontSize: 13, fontWeight: '600', marginBottom: 2, lineHeight: 17 },
  sub: { color: Colors.gray, fontSize: 10, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  rating: { color: Colors.gray, fontSize: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: Colors.gold, fontSize: 14, fontWeight: '700' },
  cartBtn: { backgroundColor: Colors.gold, borderRadius: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
