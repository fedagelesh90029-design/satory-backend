import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ScrollView, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { apiFetch } from '../../constants/api';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

const CATEGORIES = [
  { id: 'Все',     label: 'Все',    emoji: '🍃' },
  { id: 'Чай',    label: 'Чай',    emoji: '🍵' },
  { id: 'Посуда', label: 'Посуда', emoji: '🫖' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('Все');
  const [search, setSearch] = useState('');
  const [iikoSync, setIikoSync] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const { add, count: cartCount } = useCart();
  const router = useRouter();

  const load = () => {
    const params = new URLSearchParams();
    if (category === 'Посуда') {
      params.set('category', 'Посуда');
    } else if (category === 'Чай') {
      params.set('excludeCategory', 'Посуда');
    }
    if (search) params.set('search', search);
    apiFetch(`/products?${params}`).then(setProducts).catch(() => {});
  };

  useEffect(() => { load(); }, [category, search]);

  const syncIiko = async () => {
    setIikoSync('loading');
    try {
      await apiFetch('/iiko/sync', { method: 'POST' });
      setIikoSync('done');
      load();
      setTimeout(() => setIikoSync('idle'), 3000);
    } catch {
      setIikoSync('error');
      setTimeout(() => setIikoSync('idle'), 3000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Каталог</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iikoBtn, iikoSync === 'done' && styles.iikoBtnDone, iikoSync === 'error' && styles.iikoBtnError]}
            onPress={syncIiko}
            disabled={iikoSync === 'loading'}
          >
            <Ionicons
              name={iikoSync === 'done' ? 'checkmark' : iikoSync === 'error' ? 'close' : 'sync-outline'}
              size={13}
              color={iikoSync === 'idle' ? Colors.gray : Colors.white}
            />
            <Text style={[styles.iikoBtnText, iikoSync !== 'idle' && { color: Colors.white }]}>
              {iikoSync === 'loading' ? '...' : iikoSync === 'done' ? 'OK' : iikoSync === 'error' ? '!' : 'iiko'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={18} color={Colors.gold} />
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
      <View style={styles.catsRow}>
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
      </View>

      <Text style={styles.count}>{products.length} товаров</Text>

      <FlatList
        data={products}
        keyExtractor={i => String(i._id || i.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard
              item={item}
              onPress={() => router.push({ pathname: '/product', params: { id: item._id || item.id } })}
              onCart={() => add(item)}
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
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12,
  },
  title: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iikoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.card, paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  iikoBtnDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  iikoBtnError: { backgroundColor: Colors.red, borderColor: Colors.red },
  iikoBtnText: { color: Colors.gray, fontSize: 11, fontWeight: '600' },
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
    backgroundColor: Colors.card, marginHorizontal: 20, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 14 },
  catsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  catsScroll: { flexGrow: 0, marginBottom: 12 },
  catsContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center', flexDirection: 'row' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 22, backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  catEmoji: { fontSize: 14 },
  catText: { color: Colors.grayLight, fontSize: 13, fontWeight: '500', flexShrink: 0, whiteSpace: 'nowrap' } as any,
  catTextActive: { color: Colors.bg, fontWeight: '700' },
  count: { color: Colors.gray, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  row: { paddingHorizontal: 10, marginBottom: 8 },
  listContent: { paddingBottom: 100 },
});
