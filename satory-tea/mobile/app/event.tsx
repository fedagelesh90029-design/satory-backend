import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { token } = useAuth();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };

  const [event, setEvent]         = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [registered, setReg]      = useState(false);
  const [regLoading, setRegLoad]  = useState(false);

  // OTP-модалка
  const [otpVisible, setOtpVisible]   = useState(false);
  const [phoneMasked, setPhoneMasked] = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError]       = useState('');
  const [otpLoading, setOtpLoading]   = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/events/${id}`)
      .then(setEvent)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const register = async () => {
    if (!token) { router.push('/auth'); return; }
    setRegLoad(true);
    try {
      // Шаг 1: запрашиваем OTP
      const r = await apiFetch(`/events/${id}/register/send-otp`, { method: 'POST' }, token);
      setPhoneMasked(r.phone_masked || '');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setOtpVisible(true);
      startCountdown();
    } catch (e: any) {
      if (e.message?.includes('уже записаны')) setReg(true);
    } finally {
      setRegLoad(false);
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
    }, 1000);
  };

  const confirmOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Введите 6-значный код'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await apiFetch(`/events/${id}/register/confirm`, {
        method: 'POST', body: JSON.stringify({ code }),
      }, token);
      // Обновляем данные события
      const updated = await apiFetch(`/events/${id}`);
      setEvent(updated);
      setReg(true);
      setOtpVisible(false);
    } catch (e: any) {
      setOtpError(e.message || 'Неверный код');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val.slice(-1);
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.gold} size="large" />
    </View>
  );

  if (!event) return (
    <View style={styles.center}>
      <Text style={{ color: Colors.gray }}>Событие не найдено</Text>
    </View>
  );

  const imageUri = event.image_url
    ? event.image_url.startsWith('http') ? event.image_url : `${MEDIA_BASE}${event.image_url}`
    : null;

  const eventDate = new Date(event.date);
  const dateStr   = eventDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr   = event.time_start ? `${event.time_start}${event.time_end ? ' — ' + event.time_end : ''}` : null;
  const seatsLeft = event.seats_total ? event.seats_total - (event.seats_taken || 0) : null;
  const isFull    = seatsLeft !== null && seatsLeft <= 0;

  return (
    <View style={styles.container}>
      {/* Шапка поверх фото */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Фото */}
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={{ fontSize: 64 }}>🍵</Text>
          </View>
        )}

        <View style={styles.body}>

          {/* Дата-бейдж */}
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
            <Text style={styles.dateBadgeText}>{dateStr}</Text>
            {timeStr && <Text style={styles.dateBadgeText}>· {timeStr}</Text>}
          </View>

          {/* Название */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Инфо-карточки */}
          <View style={styles.infoRow}>
            {event.price > 0 && (
              <View style={styles.infoCard}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.gold} />
                <Text style={styles.infoLabel}>Стоимость</Text>
                <Text style={styles.infoValue}>{Number(event.price).toLocaleString('ru')} ₽</Text>
              </View>
            )}
            {event.price === 0 && (
              <View style={styles.infoCard}>
                <Ionicons name="pricetag-outline" size={16} color={Colors.green} />
                <Text style={styles.infoLabel}>Стоимость</Text>
                <Text style={[styles.infoValue, { color: Colors.green }]}>Бесплатно</Text>
              </View>
            )}
            {seatsLeft !== null && (
              <View style={styles.infoCard}>
                <Ionicons name="people-outline" size={16} color={isFull ? Colors.red : Colors.gold} />
                <Text style={styles.infoLabel}>Записалось</Text>
                <Text style={[styles.infoValue, isFull && { color: Colors.red }]}>
                  {event.seats_taken || 0} / {event.seats_total}
                </Text>
                {!isFull && (
                  <Text style={{ color: Colors.green, fontSize: 11, fontWeight: '600' }}>
                    {seatsLeft} мест свободно
                  </Text>
                )}
                {isFull && (
                  <Text style={{ color: Colors.red, fontSize: 11, fontWeight: '600' }}>
                    Мест нет
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Описание */}
          {event.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>О событии</Text>
              <Text style={styles.sectionText}>
                {event.description.replace(/<[^>]+>/g, '')}
              </Text>
            </View>
          ) : null}

          {/* Условия участия */}
          {event.conditions ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Условия участия</Text>
              <Text style={styles.sectionText}>
                {event.conditions.replace(/<[^>]+>/g, '')}
              </Text>
            </View>
          ) : null}

        </View>
      </ScrollView>

      {/* Кнопка записи */}
      <View style={styles.bottomBar}>
        {registered ? (
          <View style={[styles.regBtn, styles.regBtnDone]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.regBtnText}>Вы записаны!</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.regBtn, isFull && styles.regBtnDisabled]}
            onPress={register}
            disabled={isFull || regLoading}
          >
            {regLoading
              ? <ActivityIndicator color={Colors.bg} size="small" />
              : <>
                  <Ionicons name="calendar-outline" size={20} color={Colors.bg} />
                  <Text style={styles.regBtnText}>{isFull ? 'Мест нет' : 'Записаться'}</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>

      {/* OTP-модалка подтверждения */}
      <Modal visible={otpVisible} transparent animationType="slide" onRequestClose={() => setOtpVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <TouchableOpacity style={styles.modalClose} onPress={() => setOtpVisible(false)}>
              <Ionicons name="close" size={22} color={Colors.gray} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Подтверждение записи</Text>
            <Text style={styles.modalSub}>
              Отправили SMS-код на номер{'\n'}
              <Text style={{ color: Colors.white, fontWeight: '600' }}>{phoneMasked}</Text>
            </Text>

            {/* OTP-поля */}
            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={r => { otpRefs.current[i] = r; }}
                  style={[styles.otpCell, digit && styles.otpCellFilled, otpError && styles.otpCellError]}
                  value={digit}
                  onChangeText={v => handleOtpChange(v, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {otpError ? <Text style={styles.otpError}>{otpError}</Text> : null}

            <TouchableOpacity
              style={[styles.confirmBtn, otpLoading && { opacity: 0.6 }]}
              onPress={confirmOtp}
              disabled={otpLoading}
            >
              {otpLoading
                ? <ActivityIndicator color={Colors.bg} />
                : <Text style={styles.confirmBtnText}>Подтвердить запись</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resendBtn, countdown > 0 && { opacity: 0.4 }]}
              onPress={countdown === 0 ? register : undefined}
              disabled={countdown > 0}
            >
              <Text style={styles.resendText}>
                {countdown > 0 ? `Повторить через ${countdown} сек` : 'Отправить код повторно'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  center:      { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  topBar:      { position: 'absolute', top: 52, left: 16, zIndex: 10 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroImage:   { width, height: width * 0.65 },
  heroPlaceholder: { backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  body:        { padding: 20 },
  dateBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateBadgeText: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
  title:       { color: Colors.white, fontSize: 24, fontWeight: '700', lineHeight: 30, marginBottom: 16 },
  infoRow:     { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoCard:    { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, gap: 4, alignItems: 'flex-start' },
  infoLabel:   { color: Colors.gray, fontSize: 11 },
  infoValue:   { color: Colors.white, fontSize: 15, fontWeight: '700' },
  section:     { marginBottom: 20 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: Colors.grayLight, fontSize: 14, lineHeight: 22 },
  bottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, paddingBottom: 32 },
  regBtn:      { backgroundColor: Colors.gold, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  regBtnDone:  { backgroundColor: Colors.green },
  regBtnDisabled: { backgroundColor: Colors.gray },
  regBtnText:  { color: Colors.bg, fontSize: 16, fontWeight: '700' },

  // OTP Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet:  { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalClose:  { position: 'absolute', top: 20, right: 20 },
  modalTitle:  { color: Colors.white, fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  modalSub:    { color: Colors.gray, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  otpRow:      { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 },
  otpCell:     { width: 46, height: 56, borderRadius: 12, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, textAlign: 'center', fontSize: 22, fontWeight: '700', color: Colors.white },
  otpCellFilled: { borderColor: Colors.gold },
  otpCellError:  { borderColor: Colors.red },
  otpError:    { color: Colors.red, fontSize: 13, textAlign: 'center', marginBottom: 12 },
  confirmBtn:  { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  resendBtn:   { alignItems: 'center', marginTop: 16, padding: 8 },
  resendText:  { color: Colors.gold, fontSize: 14 },
});
