import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#1E3A8A',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Directorio',
          tabBarLabel: 'Buscar',
          headerTitle: 'ENCONTRAR Comercios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="promos"
        options={{
          title: 'Promociones',
          tabBarLabel: 'Promos',
          headerTitle: 'Descuentos Vigentes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarLabel: 'Mapa',
          headerTitle: 'Comercios Cercanos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Mi Cuenta',
          tabBarLabel: 'Me',
          headerTitle: 'Mi Perfil y Gestión',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#0F172A',
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
  },
});