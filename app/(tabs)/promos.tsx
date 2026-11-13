import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Promocion, UsoDePromocion } from '../../src/tipos';
import { servicioPromociones, EstadoPromoFiltro } from '../../src/servicios/promociones';
import { servicioAuth } from '../../src/servicios/auth';

export default function PantallaPromociones() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPromoFiltro>('vigentes');
  const [cargando, setCargando] = useState(true);
  const [generandoId, setGenerandoId] = useState<string | null>(null);
  const [cuponActivo, setCuponActivo] = useState<{
    promo: Promocion;
    uso: UsoDePromocion;
  } | null>(null);

  useEffect(() => {
    cargarPromos();
  }, [estadoFiltro]);

  const cargarPromos = async () => {
    setCargando(true);
    try {
      const res = await servicioPromociones.listar(estadoFiltro);
      setPromociones(res.datos);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.mensaje || 'No se pudieron cargar las promociones.');
    } finally {
      setCargando(false);
    }
  };

  const handleObtenerCodigo = async (promo: Promocion) => {
    const usuario = await servicioAuth.obtenerSesionActual();
    if (!usuario) {
      Alert.alert(
        'Iniciá sesión',
        'Tenés que ingresar con una cuenta de Vecino en la pestaña "Me" para obtener tu código.'
      );
      return;
    }

    if (usuario.rol !== 'vecino') {
      Alert.alert('Solo vecinos', 'Las cuentas de comercio no pueden canjear cupones.');
      return;
    }

    setGenerandoId(promo.id);
    try {
      const res = await servicioPromociones.generarCodigoUso(promo.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCuponActivo({ promo, uso: res.datos });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No disponible', e?.error?.mensaje || 'No se pudo generar el código.');
    } finally {
      setGenerandoId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtrosRow}>
        {(
          [
            { key: 'vigentes', label: 'Vigentes' },
            { key: 'por-vencer', label: 'Por vencer (3 días)' },
            { key: 'proximas', label: 'Próximas' },
          ] as { key: EstadoPromoFiltro; label: string }[]
        ).map((tab) => {
          const activo = estadoFiltro === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filtroChip, activo && styles.filtroChipActivo]}
              onPress={() => {
                Haptics.selectionAsync();
                setEstadoFiltro(tab.key);
              }}
            >
              <Text style={[styles.filtroText, activo && styles.filtroTextActivo]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {cargando ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1E3A8A" />
        </View>
      ) : promociones.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>No hay promociones en esta categoría.</Text>
        </View>
      ) : (
        <FlatList
          data={promociones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.cardPromo}>
              <View style={styles.topRow}>
                <View style={styles.descuentoBadge}>
                  <Text style={styles.descuentoText}>
                    {item.descuento ? `${item.descuento}% OFF` : 'PROMO'}
                  </Text>
                </View>
                {item.soloApp && (
                  <View style={styles.soloAppBadge}>
                    <Text style={styles.soloAppText}>Exclusivo App</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tituloPromo}>{item.titulo}</Text>
              <Text style={styles.detallePromo}>{item.detalle}</Text>

              <View style={styles.footerPromo}>
                <Text style={styles.venceText}>
                  Hasta: {new Date(item.hasta).toLocaleDateString('es-AR')}
                </Text>

                {item.soloApp ? (
                  <TouchableOpacity
                    style={styles.btnCanjear}
                    onPress={() => handleObtenerCodigo(item)}
                    disabled={generandoId === item.id}
                  >
                    <Text style={styles.btnCanjearText}>
                      {generandoId === item.id ? 'Generando...' : 'Obtener código'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.directoText}>Descuento directo en local</Text>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Modal
        visible={Boolean(cuponActivo)}
        transparent
        animationType="fade"
        onRequestClose={() => setCuponActivo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Tu cupón de descuento</Text>
            <Text style={styles.modalSubtitulo}>{cuponActivo?.promo.titulo}</Text>

            <View style={styles.codigoBox}>
              <Text style={styles.codigoTexto}>{cuponActivo?.uso.codigo}</Text>
            </View>

            <Text style={styles.modalAyuda}>
              Mostrá este código en el mostrador del comercio para validar tu beneficio.
            </Text>

            <TouchableOpacity
              style={styles.modalBtnCerrar}
              onPress={() => setCuponActivo(null)}
            >
              <Text style={styles.modalBtnCerrarText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filtrosRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filtroChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filtroChipActivo: { backgroundColor: '#1E3A8A' },
  filtroText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filtroTextActivo: { color: '#FFFFFF' },
  listContent: { padding: 14, gap: 12 },
  cardPromo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  descuentoBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  descuentoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  tituloPromo: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  detallePromo: { fontSize: 14, color: '#475569', marginBottom: 12 },
  footerPromo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  venceText: { fontSize: 12, color: '#64748B' },
  soloAppBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  soloAppText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },
  btnCanjear: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  btnCanjearText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  directoText: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stateText: { fontSize: 14, color: '#64748B' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 22,
    alignItems: 'center',
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSubtitulo: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 4 },
  codigoBox: {
    marginVertical: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1E3A8A',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  codigoTexto: { fontSize: 22, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.5 },
  modalAyuda: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 18 },
  modalBtnCerrar: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  modalBtnCerrarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});