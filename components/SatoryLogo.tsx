import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
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
    textTransform: 'uppercase',
    ...Platform.select({
      ios: {
        fontWeight: '300',
        letterSpacing: 4,
      },
      android: {
        fontFamily: 'sans-serif-light',
        letterSpacing: 4,
      },
      default: {
        fontWeight: '300',
        letterSpacing: 4,
      },
    }),
  },
});
