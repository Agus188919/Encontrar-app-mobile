import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Comercio, Rubro, Coordenadas } from '../../src/tipos';
import { servicioComercios } from '../../src/servicios/comercios';
import { calcularDistanciaKm, formatearDistancia } from '../../src/utils/distancia';

const COORDENADAS_CENTRO_CDELU: Coordenadas = {
  latitud: -32.4842,
  longitud: -58.2335,
};

export default function PantallaMapa() {
  const router = useRouter();

  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(null);

  const [ubicacionUsuario, setUbicacionUsuario] = useState<Coordenadas | null>(null);
  const [permisoUbicacionConcedido, setPermisoUbicacionConcedido] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    setCargando(true);
    await Promise.all([cargarUbicacion(), cargarDatos()]);
    setCargando(false);
  };

  const cargarUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermisoUbicacionConcedido(false);
        return;
      }

      setPermisoUbicacionConcedido(true);
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const estaEnCdelU =
        Math.abs(loc.coords.latitude - COORDENADAS_CENTRO_CDELU.latitud) < 1 &&
        Math.abs(loc.coords.longitude - COORDENADAS_CENTRO_CDELU.longitud) < 1;

      setUbicacionUsuario(
        estaEnCdelU
          ? { latitud: loc.coords.latitude, longitud: loc.coords.longitude }
          : COORDENADAS_CENTRO_CDELU
      );
    } catch (e) {
      setPermisoUbicacionConcedido(false);
    }
  };

  const cargarDatos = async () => {
    try {
      const [resComercios, resRubros] = await Promise.all([
        servicioComercios.listar(),
        servicioComercios.obtenerRubros(),
      ]);
      setComercios(resComercios.datos);
      setRubros(resRubros.datos);
    } catch (e) {
      console.error(e);
    }
  };

  const comerciosEnMapa = rubroSeleccionado
    ? comercios.filter((c) => c.rubroId === rubroSeleccionado)
    : comercios;

  const centroCamara = ubicacionUsuario || COORDENADAS_CENTRO_CDELU;

  if (cargando) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Cargando mapa de Concepción del Uruguay...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permisoUbicacionConcedido === false && (
        <View style={styles.avisoPermiso}>
          <Text style={styles.avisoPermisoTexto}>
            Ubicación desactivada: mostrando el centro de la ciudad. Podés buscar en el mapa igualmente.
          </Text>
        </View>
      )}

      <View style={styles.filtroRubros}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'todos', nombre: 'Todos', color: '#1E293B' }, ...rubros]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const activo =
              (item.id === 'todos' && rubroSeleccionado === null) ||
              item.id === rubroSeleccionado;
            return (
              <TouchableOpacity
                style={[
                  styles.chipRubro,
                  activo && { backgroundColor: item.color || '#1E3A8A' },
                ]}
                onPress={() =>
                  setRubroSeleccionado(item.id === 'todos' ? null : item.id)
                }
              >
                <Text style={[styles.chipRubroText, activo && styles.chipRubroTextActivo]}>
                  {item.nombre}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: centroCamara.latitud,
          longitude: centroCamara.longitud,
          latitudeDelta: 0.035,
          longitudeDelta: 0.035,
        }}
        showsUserLocation={Boolean(ubicacionUsuario)}
      >
        {comerciosEnMapa.map((comercio) => {
          if (!comercio.coordenadas?.latitud || !comercio.coordenadas?.longitud) {
            return null;
          }

          const rubro = rubros.find((r) => r.id === comercio.rubroId);
          const distanciaStr = ubicacionUsuario
            ? formatearDistancia(calcularDistanciaKm(ubicacionUsuario, comercio.coordenadas))
            : null;

          return (
            <Marker
              key={comercio.id}
              coordinate={{
                latitude: comercio.coordenadas.latitud,
                longitude: comercio.coordenadas.longitud,
              }}
              title={comercio.nombre}
              description={comercio.direccion}
              pinColor={rubro?.color || '#1E3A8A'}
            >
              <Callout
                tooltip={false}
                onPress={() => router.push(`/comercio/${comercio.id}` as any)}
              >
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitulo}>{comercio.nombre}</Text>
                  <Text style={styles.calloutDireccion}>{comercio.direccion}</Text>
                  {distanciaStr && (
                    <Text style={styles.calloutDistancia}>📍 {distanciaStr}</Text>
                  )}
                  <Text style={styles.calloutLink}>Tocar para ver ficha completa</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  map: {
    width: Dimensions.get('window').width,
    flex: 1,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748B',
  },
  avisoPermiso: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  avisoPermisoTexto: {
    color: '#92400E',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  filtroRubros: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 10,
  },
  chipRubro: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  chipRubroText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  chipRubroTextActivo: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calloutContainer: {
    width: 190,
    padding: 4,
  },
  calloutTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  calloutDireccion: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  calloutDistancia: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  calloutLink: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
});