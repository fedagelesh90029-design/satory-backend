import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors } from '../constants/theme';

const logoImage = require('../assets/logo.png');

export function SatoryLogoIcon({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={logoImage}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  );
}

export function SatoryLogoFull({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <SatoryLogoIcon size={size} />
      <Text style={[styles.name, { fontSize: size * 0.55 }]}>Satori</Text>
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
