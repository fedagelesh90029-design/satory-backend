import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Image, StyleSheet, View, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

export function Banner() {
  const router = useRouter();
  const [banner, setBanner] = useState<any>(null);

  useEffect(() => {
    apiFetch('/gallery/banner').then(setBanner).catch(() => {});
  }, []);

  // Если галерея пуста — ничего не рендерим (главный экран покажет статичный баннер)
  if (!banner) return null;

  const uri = banner.image_url?.startsWith('http')
    ? banner.image_url
    : `${MEDIA_BASE}${banner.image_url}`;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={() => router.push('/gallery')}
    >
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>ГАЛЕРЕЯ</Text>
        </View>
        {banner.caption ? (
          <Text style={styles.caption} numberOfLines={2}>{banner.caption}</Text>
        ) : null}
        <Text style={styles.hint}>Смотреть все фото  ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginHorizontal: 0,
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 1.6,
    marginBottom: 16,
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  badge: {
    backgroundColor: Colors.gold,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgeText: { color: Colors.bg, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  caption: { color: Colors.white, fontSize: 16, fontWeight: '600', marginBottom: 8, lineHeight: 22 },
  hint: { color: Colors.gold, fontSize: 13, fontWeight: '600' },
});
