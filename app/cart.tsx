import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Platform, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '../context/CartContext';
import { Colors } from '../constants/theme';
import { MEDIA_BASE, apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, remove, total, clear, increment, decrement } = useCart();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/catalog'); };

  const checkout = async () => {
    if (!token) {
      router.push('/auth');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((item) => ({
            product_id: item._id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            options: item.options,
          })),
          total,
        }),
      }, token);
      clear();
      setDone(true);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message || 'Не удалось оформить заказ');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.container, styles.successWrap]}>
        <Text style={styles.successEmoji}>🍵</Text>
        <Text style={styles.successTitle}>Заказ оформлен</Text>
        <Text style={styles.successSub}>Он уже появился в системе. Оплата при получении.</Text>
        <TouchableOpacity style={styles.orderBtn} onPress={() => router.replace('/orders')}>
          <Text style={styles.orderBtnText}>Открыть мои заказы</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)/catalog')}>
          <Text style={styles.secondaryBtnText}>Вернуться в каталог</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            {!!user?.bonus_balance && (
              <Text style={styles.bonusHint}>У вас {user.bonus_balance} бонусов их можно использовать при получении</Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого:</Text>
              <Text style={styles.totalValue}>{total} ₽</Text>
            </View>
            <TouchableOpacity style={[styles.orderBtn, loading && styles.orderBtnDisabled]} onPress={checkout} disabled={loading}>
              <Text style={styles.orderBtnText}>{loading ? 'Оформление...' : 'Оформить заказ'}</Text>
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
  bonusHint: { color: Colors.gold, fontSize: 12, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  totalLabel: { color: Colors.gray, fontSize: 16 },
  totalValue: { color: Colors.white, fontSize: 24, fontWeight: '800' },
  orderBtn: { backgroundColor: Colors.gold, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  orderBtnDisabled: { opacity: 0.7 },
  orderBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '800' },
  successWrap: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  successEmoji: { fontSize: 64, marginBottom: 12 },
  successTitle: { color: Colors.white, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  successSub: { color: Colors.gray, fontSize: 14, textAlign: 'center', marginBottom: 20 },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: Colors.gray, fontSize: 14 },
});
