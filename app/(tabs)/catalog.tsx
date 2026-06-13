import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, Dimensions, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { apiFetch } from '../../constants/api';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

const CATEGORIES = [
  { id: 'Все',          label: 'Все',        emoji: '🍃' },
  { id: 'Чай',         label: 'Чай',        emoji: '🍵' },
  { id: 'Посуда',      label: 'Посуда',     emoji: '🫖' },
  { id: 'Аксессуары',  label: 'Аксессуары', emoji: '🎋' },
  { id: 'Еда',         label: 'Еда',        emoji: '🍰' },
  { id: 'Услуги',      label: 'Услуги',     emoji: '✨' },
];

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 8;
const CARD_WIDTH = (width - PADDING * 2 - GAP) / 2;

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('Все');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { add, count: cartCount } = useCart();
  const router = useRouter();

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (category === 'Посуда') {
      params.set('category', 'Посуда');
    } else if (category === 'Аксессуары') {
      params.set('category', 'Аксессуары');
    } else if (category === 'Еда') {
      params.set('category', 'Еда');
    } else if (category === 'Услуги') {
      params.set('category', 'Услуги');
    } else if (category === 'Чай') {
      params.set('teaOnly', '1');
    } else {
      params.set('excludeCategory', 'Услуги');
    }
    if (search) params.set('search', search);
    try {
      const data = await apiFetch(`/products?${params}`);
      setProducts(data);
    } catch {}
  }, [category, search]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await apiFetch('/iiko/sync', { method: 'POST' });
      await load();
    } catch (e) {
      console.error('[Catalog] Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Каталог</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={20} color={Colors.gold} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={Colors.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск чая, посуды..."
          placeholderTextColor={Colors.gray}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12, flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{ paddingHorizontal: PADDING, gap: GAP, flexDirection: 'row', alignItems: 'center' }}
      >
        {CATEGORIES.map(cat => {
          const active = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[styles.catText, active && styles.catTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={products}
        keyExtractor={i => String(i._id || i.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard
              item={item}
              onPress={() => router.push({ pathname: '/product', params: { id: item._id || item.id } })}
              onCart={(qty) => {
                const isTeaToGo = item.name?.toLowerCase().includes('с собой');
                if (isTeaToGo) {
                  router.push({ pathname: '/product', params: { id: item._id || item.id } });
                } else {
                  if (qty && qty > 1) {
                    for(let i = 0; i < qty; i++) add(item);
                  } else {
                    add(item);
                  }
                }
              }}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: PADDING, paddingBottom: 12,
  },
  title: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: Colors.red, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, marginHorizontal: PADDING, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 14 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 22, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    flexShrink: 0,
  },
  catChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  catEmoji: { fontSize: 14 },
  catText: { color: Colors.grayLight, fontSize: 13, fontWeight: '500', flexShrink: 0 } as any,
  catTextActive: { color: Colors.bg, fontWeight: '700' },
  count: { color: Colors.gray, fontSize: 13, paddingHorizontal: PADDING, marginBottom: 8 },
  row: { paddingHorizontal: PADDING, gap: GAP, marginBottom: GAP },
  listContent: { paddingBottom: 100 },
});
