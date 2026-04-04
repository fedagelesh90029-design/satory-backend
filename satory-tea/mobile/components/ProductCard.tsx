import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
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

export function ProductCard({ item, onPress, onCart, isFavorited = false, hideFav = false }: Props) {
  const { token } = useAuth();
  const [fav, setFav] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);

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
      <View style={styles.imageBox}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="leaf-outline" size={32} color={Colors.gold} />
          </View>
        )}
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: BADGE_COLORS[item.badge] || Colors.gold }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        {/* Кнопка избранного */}
        {token && !hideFav && (
          <TouchableOpacity
            style={styles.favBtn}
            onPress={toggleFav}
            disabled={favLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={fav ? 'heart' : 'heart-outline'}
              size={18}
              color={fav ? Colors.red : Colors.white}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.category}{item.year ? ` · ${item.year}` : ''}{item.weight ? ` · ${item.weight}` : ''}
        </Text>
        {item.rating > 0 && (
          <View style={styles.row}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.rating}>{item.rating} ({item.reviews_count})</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{Number(item.price).toLocaleString('ru')} ₽</Text>
          <TouchableOpacity style={styles.cartBtn} onPress={onCart}>
            <Ionicons name="cart-outline" size={18} color={Colors.bg} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    flex: 1,
    margin: 4,
  },
  imageBox: { position: 'relative' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: Colors.cardAlt },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { color: Colors.bg, fontSize: 11, fontWeight: '700' },
  favBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  info: { padding: 10 },
  name: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sub: { color: Colors.gray, fontSize: 11, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  rating: { color: Colors.gray, fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: Colors.gold, fontSize: 15, fontWeight: '700' },
  cartBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 20, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});
