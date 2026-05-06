import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export default function RateScreen() {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (stars === 0) { Alert.alert('Выберите оценку'); return; }
    setSent(true);
  };

  if (sent) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Оценить приложение</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.thanks}>
        <Text style={{ fontSize: 60 }}>🍵</Text>
        <Text style={styles.thanksTitle}>Спасибо!</Text>
        <Text style={styles.thanksSub}>Ваш отзыв помогает нам становиться лучше</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Закрыть</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Оценить приложение</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <Text style={styles.question}>Как вам приложение Satori?</Text>
        <View style={styles.stars}>
          {[1,2,3,4,5].map(s => (
            <TouchableOpacity key={s} onPress={() => setStars(s)}>
              <Ionicons name={s <= stars ? 'star' : 'star-outline'} size={44} color={Colors.gold} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Комментарий (необязательно)</Text>
        <TextInput
          style={styles.input}
          placeholder="Что понравилось или что улучшить?"
          placeholderTextColor={Colors.gray}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
        />
        <TouchableOpacity style={[styles.btn, !stars && { opacity: 0.4 }]} onPress={submit} disabled={!stars}>
          <Text style={styles.btnText}>Отправить отзыв</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  content: { flex: 1, padding: 24, gap: 16 },
  question: { color: Colors.white, fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  label: { color: Colors.gray, fontSize: 12, letterSpacing: 1 },
  input: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, color: Colors.white, fontSize: 14, borderWidth: 1, borderColor: Colors.border, minHeight: 100, textAlignVertical: 'top' },
  btn: { backgroundColor: Colors.gold, borderRadius: 14, padding: 16, alignItems: 'center' },
  btnText: { color: Colors.bg, fontSize: 16, fontWeight: '700' },
  thanks: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  thanksTitle: { color: Colors.white, fontSize: 24, fontWeight: '700' },
  thanksSub: { color: Colors.gray, fontSize: 14, textAlign: 'center' },
});
