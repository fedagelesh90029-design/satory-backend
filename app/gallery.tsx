import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  Dimensions, Modal, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { Colors } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const COLS = 3;
const CELL = (width - 4) / COLS;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); };
  const [items, setItems]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/gallery')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getUri = (item: any) =>
    item.image_url?.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}`;

  const goNext = useCallback(() => {
    if (selected === null) return;
    setSelected(prev => (prev !== null && prev < items.length - 1 ? prev + 1 : prev));
  }, [selected, items.length]);

  const goPrev = useCallback(() => {
    setSelected(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Галерея</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Галерея пока пуста 🍵</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          numColumns={COLS}
          keyExtractor={item => item._id}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.cell}
              onPress={() => setSelected(index)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: getUri(item) }} style={styles.cellImg} />
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {/* Lightbox */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.lightbox}>
          <TouchableOpacity style={[styles.lbClose, { top: Math.max(insets.top, 40) }]} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={28} color={Colors.white} />
          </TouchableOpacity>

          {selected !== null && (
            <>
              <Image
                source={{ uri: getUri(items[selected]) }}
                style={styles.lbImage}
                resizeMode="contain"
              />
              {items[selected].caption ? (
                <View style={styles.lbCaption}>
                  <Text style={styles.lbCaptionText}>{items[selected].caption}</Text>
                </View>
              ) : null}

              {/* Навигация */}
              <View style={styles.lbNav}>
                <TouchableOpacity
                  style={[styles.lbNavBtn, selected === 0 && styles.lbNavDisabled]}
                  onPress={goPrev}
                  disabled={selected === 0}
                >
                  <Ionicons name="chevron-back" size={28} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.lbCounter}>{selected + 1} / {items.length}</Text>
                <TouchableOpacity
                  style={[styles.lbNavBtn, selected === items.length - 1 && styles.lbNavDisabled]}
                  onPress={goNext}
                  disabled={selected === items.length - 1}
                >
                  <Ionicons name="chevron-forward" size={28} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
  },
  title: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: Colors.gray, fontSize: 16 },
  cell: { width: CELL, height: CELL, padding: 1 },
  cellImg: { width: '100%', height: '100%' },

  // Lightbox
  lightbox: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbClose: {
    position: 'absolute', right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  lbImage: { width, height: height * 0.7 },
  lbCaption: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 12,
  },
  lbCaptionText: { color: Colors.white, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  lbNav: {
    position: 'absolute', bottom: 40,
    flexDirection: 'row', alignItems: 'center', gap: 24,
  },
  lbNavBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbNavDisabled: { opacity: 0.3 },
  lbCounter: { color: Colors.white, fontSize: 15, fontWeight: '600', minWidth: 60, textAlign: 'center' },
});
