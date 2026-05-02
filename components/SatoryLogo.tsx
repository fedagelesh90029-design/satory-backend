import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

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
      <Image
        source={satoryImage}
        style={{ width: size * 3, height: size, resizeMode: 'contain' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'center' },
});
