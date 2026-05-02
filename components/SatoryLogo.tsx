import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

const satoryImage = require('../assets/Satory.png');

export function SatoryLogoIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={satoryImage}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  );
}

export function SatoryLogoFull({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <SatoryLogoIcon size={size} />
      <Text style={[styles.name, { fontSize: size * 0.55 }]}>САТОРИ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: {
    color: Colors.white,
    fontWeight: '300',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
