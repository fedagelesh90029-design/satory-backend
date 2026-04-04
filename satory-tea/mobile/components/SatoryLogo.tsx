import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// Логотип Satory без SVG зависимостей
export function SatoryLogoIcon({ size = 40, color = Colors.gold }: { size?: number; color?: string }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
      <Text style={[styles.kanji, { color, fontSize: size * 0.35 }]}>悟</Text>
    </View>
  );
}

export function SatoryLogoFull({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <SatoryLogoIcon size={size} />
      <Text style={[styles.name, { fontSize: size * 0.55 }]}>Satory</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kanji: {
    fontWeight: '300',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: {
    color: Colors.white,
    fontWeight: '300',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
