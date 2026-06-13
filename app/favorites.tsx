import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';

const { width } = Dimensions.get('window');

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const { add } = useCart();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/products/favorites/list', {}, token)
      .then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggleFav = async (id: string) => {
    await apiFetch(`/products/${id}/favorite`, { method: 'POST' }, token);
    setItems(prev => prev.filter(i => (i._id || i.id) !== id));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Избранное</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Избранное пусто</Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.btnText}>Перейти в каталог</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={2}
          keyExtractor={i => String(i._id || i.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <View style={{ width: (width - 32 - 8) / 2 }}>
              <ProductCard item={item} onCart={(qty) => add(item, undefined, qty)} isFavorited={true} hideFav />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingBottom: 16, 
    borderBottomWidth: 1, borderBottomColor: Colors.border 
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  btn: { backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  btnText: { color: Colors.bg, fontWeight: '700' },
});
