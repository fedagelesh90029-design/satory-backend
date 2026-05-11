import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../constants/api';

export default function PersonalDataScreen() {
  const router = useRouter();
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!name.trim()) { Alert.alert('Ошибка', 'Имя не может быть пустым'); return; }
    setLoading(true);
    try {
      await apiFetch('/user/me', { method: 'PUT', body: JSON.stringify({ name }) }, token);
      await refreshUser();
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Личные данные</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ваше имя"
            placeholderTextColor={Colors.gray}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Телефон</Text>
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyText}>{(user as any)?.phone || '—'}</Text>
            <Text style={styles.readOnlyHint}>Изменить через поддержку</Text>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyText}>{user?.email || '—'}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={save} disabled={loading}>
          <Text style={styles.saveBtnText}>{loading ? 'Сохранение...' : 'Сохранить'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { color: Colors.gray, fontSize: 12, letterSpacing: 1 },
  input: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  readOnly: { backgroundColor: Colors.cardAlt, borderRadius: 12, padding: 14 },
  readOnlyText: { color: Colors.grayLight, fontSize: 15 },
  readOnlyHint: { color: Colors.gray, fontSize: 11, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.gold, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
});
