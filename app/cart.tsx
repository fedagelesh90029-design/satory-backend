import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../constants/api';

export default function CartScreen() {
  const router = useRouter();
  const { items, remove, increment, decrement, clear, total, count } = useCart();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const doCheckout = async () => {
    setConfirmCheckout(false);
    if (!token) { router.push('/auth'); return; }
    setLoading(true);
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map(i => ({ 
            product_id: i._id, 
            name: i.name, 
            price: i.price, 
            qty: i.qty,
            options: i.options 
          })),
          total,
        }),
      }, token);
      clear();
      setDone(true);
    } catch (e: any) {
      // показываем ошибку inline
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Экран успеха
  if (done) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.success}>
        <Text style={{ fontSize: 64 }}>🍵</Text>
        <Text style={styles.successTitle}>Заказ оформлен!</Text>
        <Text style={styles.successSub}>Ждём вас в чайной. Оплата при получении.</Text>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.replace('/(tabs)/profile')}>
          <Text style={styles.checkoutText}>Перейти в профиль</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setDone(false); router.push('/(tabs)/catalog'); }}>
          <Text style={styles.secondaryText}>Продолжить покупки</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Корзина {count > 0 ? `(${count})` : ''}</Text>
        {items.length > 0
          ? <TouchableOpacity onPress={() => setConfirmClear(true)}>
              <Text style={styles.clearText}>Очистить</Text>
            </TouchableOpacity>
          : <View style={{ width: 60 }} />
        }
      </View>

      {/* Подтверждение очистки */}
      {confirmClear && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>Удалить все товары?</Text>
          <TouchableOpacity style={styles.confirmYes} onPress={() => { clear(); setConfirmClear(false); }}>
            <Text style={styles.confirmYesText}>Да</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmClear(false)}>
            <Text style={styles.confirmNoText}>Нет</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Подтверждение заказа */}
      {confirmCheckout && (
        <View style={styles.confirmBar}>
          <Text style={styles.confirmText}>Оформить на {total.toLocaleString('ru')} ₽?</Text>
          <TouchableOpacity style={styles.confirmYes} onPress={doCheckout}>
            <Text style={styles.confirmYesText}>Да</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmNo} onPress={() => setConfirmCheckout(false)}>
            <Text style={styles.confirmNoText}>Нет</Text>
          </TouchableOpacity>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Корзина пуста</Text>
          <Text style={styles.emptySub}>Добавьте товары из каталога</Text>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.checkoutText}>Перейти в каталог</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={i => i._id + JSON.stringify(i.options)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const optJson = JSON.stringify(item.options);
              return (
                <View style={styles.item}>
                  <View style={styles.itemIcon}>
                    <Ionicons name="leaf-outline" size={20} color={Colors.gold} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    {item.options?.tea_name && (
                      <Text style={styles.itemOption}>+ {item.options.tea_name} (6г)</Text>
                    )}
                    <Text style={styles.itemCat}>{item.category}</Text>
                    <Text style={styles.itemPrice}>{(item.price * item.qty).toLocaleString('ru')} ₽</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => decrement(item._id, optJson)}>
                      <Ionicons name="remove" size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.qty}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => increment(item._id, optJson)}>
                      <Ionicons name="add" size={14} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => remove(item._id, optJson)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.footer}>
            {(user as any)?.bonus_balance > 0 && (
              <Text style={styles.bonusHint}>
                💛 У вас {(user as any).bonus_balance} бонусов — скажите кассиру при получении
              </Text>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Итого</Text>
              <Text style={styles.totalValue}>{total.toLocaleString('ru')} ₽</Text>
            </View>
            <TouchableOpacity
              style={[styles.checkoutBtn, (loading || confirmCheckout) && { opacity: 0.7 }]}
              onPress={() => {
                if (!token) { router.push('/auth'); return; }
                setConfirmCheckout(true);
              }}
              disabled={loading || confirmCheckout}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={Colors.bg} />
              <Text style={styles.checkoutText}>{loading ? 'Оформление...' : 'Оформить заказ'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  clearText: { color: Colors.red, fontSize: 14, paddingHorizontal: 8 },
  confirmBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardAlt, padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  confirmText: { color: Colors.white, fontSize: 13, flex: 1 },
  confirmYes: { backgroundColor: Colors.gold, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  confirmYesText: { color: Colors.bg, fontWeight: '700', fontSize: 13 },
  confirmNo: { backgroundColor: Colors.border, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  confirmNoText: { color: Colors.white, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  emptySub: { color: Colors.gray, fontSize: 14 },
  list: { padding: 12, gap: 8 },
  item: { backgroundColor: Colors.card, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemOption: { color: Colors.gold, fontSize: 12, fontWeight: '500', marginBottom: 2 },
  itemCat: { color: Colors.gray, fontSize: 11, marginBottom: 2 },
  itemPrice: { color: Colors.gold, fontSize: 14, fontWeight: '700' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  qty: { color: Colors.white, fontSize: 14, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  removeBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  footer: { backgroundColor: Colors.card, padding: 16, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  bonusHint: { color: Colors.gold, fontSize: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: Colors.gray, fontSize: 14 },
  totalValue: { color: Colors.white, fontSize: 22, fontWeight: '700' },
  checkoutBtn: { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  checkoutText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },
  secondaryBtn: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: Colors.gray, fontSize: 14 },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  successTitle: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  successSub: { color: Colors.gray, fontSize: 14, textAlign: 'center' },
});
