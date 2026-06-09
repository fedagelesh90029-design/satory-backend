import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Linking,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../constants/api';
import { SatoryLogoFull } from '../components/SatoryLogo';
import { showWelcomeNotification } from '../utils/notifications';

type AuthMode = 'phone' | 'otp' | 'name';
type OtpChannel = 'sms' | 'telegram' | 'review';

export default function AuthScreen() {
  const router = useRouter();
  const { loginWithPhone } = useAuth();

  const [mode, setMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [tgLoading, setTgLoading] = useState(false);
  const [sentVia, setSentVia] = useState<OtpChannel>('sms');

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current!); return 0; } return c - 1; });
    }, 1000);
  };

  const formatPhone = (raw: string, isDeleting: boolean = false) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return '';
    
    if (digits.startsWith('7') || digits.startsWith('8')) {
      const d = digits.slice(1, 11);
      let r = '+7';
      if (d.length > 0) r += ' (' + d.slice(0, 3);
      if (d.length >= 3) {
        r += ') ' + d.slice(3, 6);
        if (d.length >= 6) r += '-' + d.slice(6, 8);
        if (d.length >= 8) r += '-' + d.slice(8, 10);
      }
      return r;
    }
    return '+' + digits.slice(0, 15);
  };

  const onPhoneChange = (text: string) => {
    // Проверяем, удаляет ли пользователь символы
    const isDeleting = text.length < phone.length;
    if (isDeleting) {
      // Если удаляем, просто убираем последний символ без агрессивного форматирования
      setPhone(text);
    } else {
      setPhone(formatPhone(text));
    }
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { Alert.alert('Ошибка', 'Введите корректный номер телефона'); return; }
    setLoading(true);
    try {
      const resp = await apiFetch('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
      setDevCode(resp.dev_code || null);
      setSentVia(resp.method === 'review' ? 'review' : 'sms');
      setMode('otp');
      startCountdown();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendOtpViaTelegram = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { Alert.alert('Ошибка', 'Введите корректный номер телефона'); return; }
    setTgLoading(true);
    try {
      const resp = await apiFetch('/auth/send-otp-telegram', { method: 'POST', body: JSON.stringify({ phone }) });
      if (resp.tg_link) {
        await Linking.openURL(resp.tg_link);
        Alert.alert('Откройте Telegram', 'Нажмите «Старт» в боте Satori Tea — он пришлёт вам код.', [{ text: 'OK' }]);
      }
      setDevCode(resp.dev_code || null);
      setSentVia(resp.method === 'review' ? 'review' : 'telegram');
      setMode('otp');
      startCountdown();
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setTgLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) { Alert.alert('Ошибка', 'Введите 6-значный код'); return; }
    setLoading(true);
    try {
      const data = await apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) });
      if (data.is_new) {
        setPendingToken(data.token); setPendingUser(data.user); setMode('name');
        return;
      }
      await loginWithPhone(data.token, data.user);
      await showWelcomeNotification(data.user.name || 'Гость', false);
      router.replace('/(tabs)/profile');
    } catch (e: any) { Alert.alert('Ошибка', e.message); } finally { setLoading(false); }
  };

  const saveName = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Введите имя'); return; }
    if (!pendingToken || !pendingUser) { setMode('phone'); return; }
    setLoading(true);
    try {
      await apiFetch('/user/me', { method: 'PUT', body: JSON.stringify({ name }) }, pendingToken);
      await loginWithPhone(pendingToken, { ...pendingUser, name });
      await showWelcomeNotification(name, true);
      router.replace('/(tabs)/profile');
    } catch (e: any) { Alert.alert('Ошибка', e.message); } finally { setLoading(false); }
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (val.length > 1) {
      const pasted = val.slice(0, 6).split('');
      const newOtp = [...otp];
      pasted.forEach((char, i) => { if (idx + i < 6) newOtp[idx + i] = char; });
      setOtp(newOtp);
      const nextIdx = Math.min(idx + pasted.length, 5);
      otpRefs.current[nextIdx]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[idx] && idx > 0) {
        otpRefs.current[idx - 1]?.focus();
      }
    }
  };

  const resendOtp = () => {
    sendOtpViaTelegram();
  };

  // ── Render ──────────────────────────────────────────────────
  if (mode === 'phone') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}>
          <SatoryLogoFull size={44} />
          <Text style={styles.tagline}>Чайная культура</Text>
        </View>
        <Text style={styles.heading}>Вход по номеру телефона</Text>
        <Text style={styles.sub}>Авторизация через Telegram-бота</Text>
        <View style={styles.phoneRow}>
          <View style={styles.flagBox}><Text style={styles.flag}>🇷🇺</Text></View>
          <TextInput
            style={styles.phoneInput}
            placeholder="+7 (___) ___-__-__"
            placeholderTextColor={Colors.gray}
            value={phone}
            onChangeText={onPhoneChange}
            keyboardType="phone-pad"
            maxLength={18}
          />
        </View>
        <TouchableOpacity style={[styles.btn, tgLoading && styles.btnDisabled]} onPress={sendOtpViaTelegram} disabled={tgLoading}>
          <Ionicons name="paper-plane" size={18} color={Colors.bg} />
          <Text style={styles.btnText}>{tgLoading ? 'Открываем...' : 'Получить код в Telegram'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>← Назад</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (mode === 'otp') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backRow} onPress={() => setMode('phone')}>
          <Ionicons name="chevron-back" size={20} color={Colors.gray} />
          <Text style={styles.backText}>Изменить номер</Text>
        </TouchableOpacity>
        <View style={styles.logoBox}><SatoryLogoFull size={36} /></View>
        <Text style={styles.heading}>Введите код</Text>
        <Text style={styles.sub}>
          {sentVia === 'telegram'
            ? `Отправили код в Telegram на номер ${phone}`
            : sentVia === 'review'
              ? `Введите код для тестового номера ${phone}`
              : `Отправили SMS на ${phone}`}
        </Text>
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => { otpRefs.current[i] = r; }}
              style={[styles.otpCell, digit && styles.otpCellFilled]}
              value={digit}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={e => handleOtpKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={verifyOtp} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Проверка...' : 'Подтвердить'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.altBtn, countdown > 0 && styles.altBtnDisabled]} onPress={countdown === 0 ? resendOtp : undefined} disabled={countdown > 0}>
          <Text style={[styles.altText, countdown > 0 && { color: Colors.gray }]}>
            {countdown > 0 ? `Повторить через ${countdown} сек` : 'Отправить код повторно'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  if (mode === 'name') return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoBox}><SatoryLogoFull size={44} /></View>
        <Text style={styles.heading}>Как вас зовут?</Text>
        <Text style={styles.sub}>Это имя будет отображаться в профиле</Text>
        <TextInput style={[styles.input, { marginBottom: 16 }]} placeholder="Ваше имя" placeholderTextColor={Colors.gray} value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={saveName} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Сохранение...' : 'Продолжить'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logoBox: { alignItems: 'center', marginBottom: 32 },
  tagline: { color: Colors.gray, fontSize: 13, letterSpacing: 3, marginTop: 8, textTransform: 'uppercase' },
  heading: { color: Colors.white, fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { color: Colors.gray, fontSize: 14, textAlign: 'center', marginBottom: 28 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, overflow: 'hidden' },
  flagBox: { paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: Colors.border },
  flag: { fontSize: 22 },
  phoneInput: { flex: 1, color: Colors.white, fontSize: 17, paddingHorizontal: 14, paddingVertical: 14 },
  input: { backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  btn: { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  tgBtn: { backgroundColor: '#2AABEE', borderRadius: 14, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  tgBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  altBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  altBtnDisabled: { opacity: 0.5 },
  altText: { color: Colors.gold, fontSize: 14 },
  backBtn: { alignItems: 'center', marginTop: 24 },
  backText: { color: Colors.gray, fontSize: 14 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  otpCell: { width: 46, height: 56, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, textAlign: 'center', fontSize: 22, fontWeight: '700', color: Colors.white },
  otpCellFilled: { borderColor: Colors.gold },
});
