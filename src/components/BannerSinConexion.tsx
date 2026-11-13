// src/componentes/BannerSinConexion.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConexion } from '../hooks/useConexion';

export function BannerSinConexion() {
  const { conectado } = useConexion();

  if (conectado) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.texto}>
        ⚠️ Modo sin conexión: Mostrando datos guardados localmente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B91C1C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});