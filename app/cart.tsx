import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';
import { Colors } from '../constants/theme';
import { MEDIA_BASE } from '../constants/api';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, remove, total, clear, increment, decrement } = useCart();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/catalog'); };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Корзина</Text>
        {items.length > 0 ? (
          <TouchableOpacity onPress={clear}>
            <Text style={{ color: Colors.red, fontSize: 14 }}>Очистить</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={80} color={Colors.cardAlt} />
          <Text style={styles.emptyTitle}>В корзине пока пусто</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => router.replace('/(tabs)/catalog')}>
            <Text style={styles.shopBtnText}>Перейти в каталог</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item, index) => `${item._id}_${index}`}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Image
                  source={{ uri: item.image_url?.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}` }}
                  style={styles.itemImg}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {item.options?.tea_name && (
                    <Text style={styles.itemOption}>Чай: {item.options.tea_name}</Text>
                  )}
                  {item.options?.weight && (
                    <Text style={styles.itemWeight}>{item.options.weight}г</Text>
                  )}
                  <Text style={styles.itemPrice}>{item.price * item.qty} ₽</Text>
                </View>
                
                <View style={styles.qtyRow}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => decrement(item._id, JSON.stringify(item.options))}>
                    <Ionicons name="remove" size={18} color={Colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => increment(item._id, JSON.stringify(item.options))}>
                    <Ionicons name="add" size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={{ marginLeft: 8 }} onPress={() => remove(item._id, JSON.stringify(item.options))}>
                  <Ionicons name="trash-outline" size={20} color={Colors.red} />
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого:</Text>
              <Text style={styles.totalValue}>{total} ₽</Text>
            </View>
            <TouchableOpacity style={styles.orderBtn} onPress={() => alert('Заказ через приложение скоро будет доступен!')}>
              <Text style={styles.orderBtnText}>Оформить заказ</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { color: Colors.gray, fontSize: 16, marginTop: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  shopBtnText: { color: Colors.bg, fontWeight: '700' },
  list: { padding: 20, gap: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.card, padding: 12, borderRadius: 16 },
  itemImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: Colors.cardAlt },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.white, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  itemOption: { color: Colors.gold, fontSize: 12, marginBottom: 4 },
  itemWeight: { color: Colors.gray, fontSize: 11, marginBottom: 2 },
  itemPrice: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.border, borderRadius: 10, padding: 4 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  qtyText: { color: Colors.white, fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  footer: { backgroundColor: Colors.card, padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { color: Colors.gray, fontSize: 16 },
  totalValue: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  orderBtn: { backgroundColor: Colors.gold, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  orderBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },
});
