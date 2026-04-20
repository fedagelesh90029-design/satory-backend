import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };

  const [item, setItem]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/news/${id}`)
      .then(setItem)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.gold} size="large" />
    </View>
  );

  if (!item) return (
    <View style={styles.center}>
      <Text style={{ color: Colors.gray }}>Новость не найдена</Text>
    </View>
  );

  const imageUri = item.image_url
    ? item.image_url.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}`
    : null;

  const date = new Date(item.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Text style={{ fontSize: 48 }}>📰</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.dateBadge}>
            <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
            <Text style={styles.dateBadgeText}>{date}</Text>
          </View>

          <Text style={styles.title}>{item.title}</Text>

          {item.description ? (
            <Text style={styles.text}>
              {item.description.replace(/<[^>]+>/g, '')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  center:      { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  topBar:      { position: 'absolute', top: 52, left: 16, zIndex: 10 },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  heroImage:   { width, height: width * 0.6 },
  heroPlaceholder: { backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  body:        { padding: 20 },
  dateBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dateBadgeText: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
  title:       { color: Colors.white, fontSize: 24, fontWeight: '700', lineHeight: 30, marginBottom: 16 },
  text:        { color: Colors.grayLight, fontSize: 15, lineHeight: 24 },
});
