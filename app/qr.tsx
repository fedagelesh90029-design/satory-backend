import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { apiFetch } from '../constants/api';
import { useAuth } from '../context/AuthContext';

const QR_TTL = 300; // 5 минут

export default function QRScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/bonus/qr', {}, token);
      setQrData(data.qr_data);
      const exp = Math.floor(new Date(data.expires_at).getTime() / 1000);
      setExpiresAt(exp);
      setSecondsLeft(QR_TTL);
    } catch (e: any) {
      setError(e.message || 'Не удалось получить QR-код');
    } finally {
      setLoading(false);
    }
  };

  // Таймер обратного отсчёта
  useEffect(() => {
    if (!expiresAt) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const left = expiresAt - Math.floor(Date.now() / 1000);
      if (left <= 0) {
        setSecondsLeft(0);
        clearInterval(timerRef.current!);
      } else {
        setSecondsLeft(left);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [expiresAt]);

  useEffect(() => { fetchQR(); }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const isExpired = secondsLeft <= 0;
  const timerColor = secondsLeft > 60 ? Colors.green : secondsLeft > 20 ? Colors.gold : Colors.red;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>QR-код</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.hint}>Покажите QR-код кассиру для начисления или списания бонусов</Text>

        {/* QR Card */}
        <View style={styles.qrCard}>
          {loading ? (
            <ActivityIndicator size="large" color={Colors.gold} style={{ height: 200 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={Colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : isExpired ? (
            <View style={styles.errorBox}>
              <Ionicons name="time-outline" size={40} color={Colors.gold} />
              <Text style={styles.errorText}>QR-код истёк</Text>
              <Text style={styles.errorSub}>Нажмите «Обновить» для получения нового</Text>
            </View>
          ) : qrData ? (
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrData}
                size={220}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          ) : null}

          {/* Таймер */}
          {!loading && !error && (
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={16} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>
                {isExpired ? 'Истёк' : `Действителен ${formatTime(secondsLeft)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Данные пользователя */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userRow}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.gold} />
              <Text style={styles.userName}>{user.name}</Text>
            </View>
            {user.phone && (
              <Text style={styles.userPhone}>
                {'•'.repeat(user.phone.length - 4)}{user.phone.slice(-4)}
              </Text>
            )}
          </View>
        )}

        {/* Кнопка обновления */}
        <TouchableOpacity
          style={[styles.refreshBtn, loading && styles.refreshBtnDisabled]}
          onPress={fetchQR}
          disabled={loading}
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.bg} />
          <Text style={styles.refreshBtnText}>Обновить QR</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          После того как кассир начислит или спишет бонусы в iiko, баланс обновится в приложении при следующей синхронизации
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },
  hint: { color: Colors.gray, fontSize: 13, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  qrCard: {
    backgroundColor: Colors.card, borderRadius: 24, padding: 24,
    alignItems: 'center', width: '100%', marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  qrWrapper: {
    backgroundColor: '#fff', padding: 16, borderRadius: 16,
    marginBottom: 16,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timerText: { fontSize: 14, fontWeight: '600' },
  errorBox: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  errorText: { color: Colors.white, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  errorSub: { color: Colors.gray, fontSize: 12, textAlign: 'center' },
  userCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 14,
    width: '100%', marginBottom: 16,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  userName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  userPhone: { color: Colors.gray, fontSize: 13, marginLeft: 28 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.gold, borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 12, marginBottom: 20,
  },
  refreshBtnDisabled: { opacity: 0.5 },
  refreshBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },
  note: { color: Colors.gray, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
