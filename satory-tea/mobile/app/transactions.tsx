import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';

interface Tx {
  _id: string;
  operation_type: string;
  accrued: number;
  spent: number;
  balance: number;
  date: string;
  description: string;
}

const OP_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  manual_accrual:   { label: 'Начисление', color: Colors.green, icon: 'add-circle-outline' },
  manual_deduction: { label: 'Списание',   color: Colors.red,   icon: 'remove-circle-outline' },
  unknown:          { label: 'Операция',   color: Colors.gray,  icon: 'swap-horizontal-outline' },
};

function getOp(type: string) {
  return OP_LABELS[type] || { label: type, color: Colors.gold, icon: 'gift-outline' };
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/bonus/transactions', {}, token)
      .then(setTxs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('ru', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>История бонусов</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 60 }} />
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : txs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Операций пока нет</Text>
          <Text style={styles.emptySub}>История появится после первого посещения</Text>
        </View>
      ) : (
        <FlatList
          data={txs}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const op = getOp(item.operation_type);
            const delta = item.accrued > 0 ? item.accrued : -item.spent;
            return (
              <View style={styles.txItem}>
                <View style={[styles.txIcon, { backgroundColor: op.color + '22' }]}>
                  <Ionicons name={op.icon as any} size={20} color={op.color} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txLabel}>{op.label}</Text>
                  <Text style={styles.txDesc} numberOfLines={1}>{item.description || op.label}</Text>
                  <Text style={styles.txDate}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txDelta, { color: delta >= 0 ? Colors.green : Colors.red }]}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </Text>
                  <Text style={styles.txBalance}>{item.balance} баллов</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  errorText: { color: Colors.red, fontSize: 15, textAlign: 'center' },
  emptyTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  emptySub: { color: Colors.gray, fontSize: 13, textAlign: 'center' },
  list: { padding: 16, gap: 8 },
  txItem: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txLabel: { color: Colors.white, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txDesc: { color: Colors.gray, fontSize: 12, marginBottom: 2 },
  txDate: { color: Colors.gray, fontSize: 11 },
  txRight: { alignItems: 'flex-end' },
  txDelta: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  txBalance: { color: Colors.gray, fontSize: 11 },
});
