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

const CATEGORIES = ['Все', 'Шу Пуэр', 'Шэн Пуэр', 'Улун', 'Белый', 'Посуда'];
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;

export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('Все');
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [iikoSync, setIikoSync] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const { add, count: cartCount2 } = useCart();
  const router = useRouter();

  const load = () => {
    const params = new URLSearchParams();
    if (category !== 'Все') params.set('category', category);
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
          {/* iiko sync button */}
          <TouchableOpacity
            style={[styles.iikoBtn, iikoSync === 'done' && styles.iikoBtnDone, iikoSync === 'error' && styles.iikoBtnError]}
            onPress={syncIiko}
            disabled={iikoSync === 'loading'}
          >
            <Ionicons
              name={iikoSync === 'done' ? 'checkmark' : iikoSync === 'error' ? 'close' : 'sync-outline'}
              size={14}
              color={iikoSync === 'idle' ? Colors.gray : Colors.white}
            />
            <Text style={[styles.iikoBtnText, iikoSync !== 'idle' && { color: Colors.white }]}>
              {iikoSync === 'loading' ? 'Синхронизация...' :
               iikoSync === 'done' ? 'Обновлено' :
               iikoSync === 'error' ? 'Ошибка' : 'iiko'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={18} color={Colors.gold} />
            <Text style={styles.cartText}>Корзина</Text>
            {cartCount2 > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount2}</Text>
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

      {/* Categories — фиксированный горизонтальный скролл */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catsScroll}
        contentContainerStyle={styles.catsContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.catChip, category === cat && styles.catChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.count}>{products.length} товаров</Text>

      <FlatList
        data={products}
        keyExtractor={i => String(i._id || i.id)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={{ width: CARD_WIDTH }}>
            <ProductCard item={item} onCart={() => add(item)} />
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.card, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
  },
  iikoBtnDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  iikoBtnError: { backgroundColor: Colors.red, borderColor: Colors.red },
  iikoBtnText: { color: Colors.gray, fontSize: 11, fontWeight: '600' },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
  },
  cartText: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
  cartBadge: {
    backgroundColor: Colors.red, borderRadius: 8,
    width: 16, height: 16, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: Colors.white, fontSize: 9, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.card, marginHorizontal: 20, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 14 },
  catsScroll: { flexGrow: 0, marginBottom: 12 },
  catsContent: {
    paddingHorizontal: 20,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,   // ← вместо gap
  },
  catChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  catText: { color: Colors.grayLight, fontSize: 13, fontWeight: '500' },
  catTextActive: { color: Colors.bg, fontWeight: '700' },
  count: { color: Colors.gray, fontSize: 13, paddingHorizontal: 20, marginBottom: 8 },
  row: { paddingHorizontal: 10, marginBottom: 8 },
  listContent: { paddingBottom: 100 },
});
