import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Ожидает',    color: Colors.gold },
  confirmed: { label: 'Подтверждён', color: '#64B5F6' },
  ready:     { label: 'Готов',      color: Colors.green },
  completed: { label: 'Выполнен',   color: Colors.gray },
  cancelled: { label: 'Отменён',    color: Colors.red },
};

export default function OrdersScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch('/orders', {}, token);
      setOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, []);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Мои заказы</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Заказов пока нет</Text>
          <Text style={styles.emptySub}>Оформите первый заказ из каталога</Text>
          <TouchableOpacity style={styles.catalogBtn} onPress={() => router.push('/(tabs)/catalog')}>
            <Text style={styles.catalogBtnText}>Перейти в каталог</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => o._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.gold} />}
          renderItem={({ item }) => {
            const st = STATUS_MAP[item.status] || { label: item.status, color: Colors.gray };
            const isOpen = expanded === item._id;
            return (
              <TouchableOpacity
                style={styles.orderCard}
                onPress={() => setExpanded(isOpen ? null : item._id)}
                activeOpacity={0.85}
              >
                {/* Шапка заказа */}
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderLeft}>
                    <View style={styles.orderIcon}>
                      <Ionicons name="bag-outline" size={18} color={Colors.gold} />
                    </View>
                    <View>
                      <Text style={styles.orderNum}>Заказ #{item._id.slice(-6).toUpperCase()}</Text>
                      <Text style={styles.orderDate}>{fmtDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.orderHeaderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '22', borderColor: st.color + '44' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.gray} />
                  </View>
                </View>

                {/* Итог */}
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>{item.items?.length || 0} позиций</Text>
                  <Text style={styles.orderTotalValue}>{Number(item.total).toLocaleString('ru')} ₽</Text>
                </View>

                {/* Состав заказа (раскрывается) */}
                {isOpen && (
                  <View style={styles.orderItems}>
                    <View style={styles.divider} />
                    {(item.items || []).map((it: any, i: number) => (
                      <View key={i} style={styles.orderItem}>
                        <View style={styles.orderItemDot} />
                        <Text style={styles.orderItemName} numberOfLines={1}>{it.name}</Text>
                        <Text style={styles.orderItemQty}>×{it.qty}</Text>
                        <Text style={styles.orderItemPrice}>{(it.price * it.qty).toLocaleString('ru')} ₽</Text>
                      </View>
                    ))}
                    <View style={styles.orderSummary}>
                      <Text style={styles.orderSummaryLabel}>Итого</Text>
                      <Text style={styles.orderSummaryValue}>{Number(item.total).toLocaleString('ru')} ₽</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:            { color: Colors.white, fontSize: 17, fontWeight: '700' },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle:       { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySub:         { color: Colors.gray, fontSize: 13, textAlign: 'center' },
  catalogBtn:       { backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  catalogBtnText:   { color: Colors.bg, fontWeight: '700', fontSize: 14 },
  list:             { padding: 16, gap: 10, paddingBottom: 40 },
  orderCard:        { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden' },
  orderHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  orderHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderIcon:        { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.gold + '22', alignItems: 'center', justifyContent: 'center' },
  orderNum:         { color: Colors.white, fontSize: 14, fontWeight: '700' },
  orderDate:        { color: Colors.gray, fontSize: 11, marginTop: 2 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText:       { fontSize: 11, fontWeight: '700' },
  orderTotal:       { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingBottom: 14 },
  orderTotalLabel:  { color: Colors.gray, fontSize: 13 },
  orderTotalValue:  { color: Colors.gold, fontSize: 15, fontWeight: '700' },
  divider:          { height: 1, backgroundColor: Colors.border, marginBottom: 12 },
  orderItems:       { paddingHorizontal: 14, paddingBottom: 14 },
  orderItem:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  orderItemDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  orderItemName:    { flex: 1, color: Colors.white, fontSize: 13 },
  orderItemQty:     { color: Colors.gray, fontSize: 13, minWidth: 24, textAlign: 'center' },
  orderItemPrice:   { color: Colors.gold, fontSize: 13, fontWeight: '600', minWidth: 70, textAlign: 'right' },
  orderSummary:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  orderSummaryLabel: { color: Colors.gray, fontSize: 13 },
  orderSummaryValue: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
