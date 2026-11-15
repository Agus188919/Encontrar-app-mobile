import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Comercio, Rubro } from '../../src/tipos';
import { servicioComercios } from '../../src/servicios/comercios';
import { estaAbiertoAhora, EstadoHorario } from '../../src/utils/horarios';
import { obtenerTagsProductos } from '../../src/utils/productos';

const normalizarTexto = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function obtenerEstadoComercio(comercio: Comercio): EstadoHorario {
  const estaDeVacaciones = Boolean(
    (comercio as Comercio & { cerradoHasta?: string | null }).cerradoHasta
  );
  if (estaDeVacaciones) {
    return { abierto: false, mensaje: 'Cerrado por vacaciones' };
  }
  return estaAbiertoAhora(comercio.horarios);
}

export default function PantallaDirectorio() {
  const router = useRouter();
  const [permisoCamara, solicitarPermisoCamara] = useCameraPermissions();

  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);

  const [rubroSeleccionado, setRubroSeleccionado] = useState<string | null>(() => {
    try {
      const guardado = Storage.getItemSync('ultimo_rubro_seleccionado');
      return guardado && guardado !== 'todos' ? guardado : null;
    } catch {
      return null;
    }
  });

  const [busqueda, setBusqueda] = useState('');
  const [soloAbiertos, setSoloAbiertos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalQrVisible, setModalQrVisible] = useState(false);
  const [escaneandoQr, setEscaneandoQr] = useState(true);
  const [codigoQrManual, setCodigoQrManual] = useState('');
  const [buscandoQr, setBuscandoQr] = useState(false);

  const cargarRubros = async () => {
    try {
      const res = await servicioComercios.obtenerRubros();
      setRubros(res.datos);
    } catch (e: any) {
      console.error('Error al cargar rubros:', e);
    }
  };

  const cargarComercios = useCallback(async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const res = await servicioComercios.listar({
        rubroId: rubroSeleccionado || undefined,
        porPagina: 200,
      });
      setComercios(res.datos);
    } catch (e: any) {
      setErrorMsg(e?.error?.mensaje || 'No se pudo conectar con el servicio local.');
    } finally {
      setCargando(false);
    }
  }, [rubroSeleccionado]);

  useEffect(() => {
    cargarRubros();
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarComercios();
    }, [cargarComercios])
  );

  const handleSeleccionarRubro = (idRubro: string) => {
    Haptics.selectionAsync();
    const nuevoRubro = idRubro === 'todos' ? null : idRubro;
    setRubroSeleccionado(nuevoRubro);
    try {
      Storage.setItemSync('ultimo_rubro_seleccionado', nuevoRubro ?? 'todos');
    } catch (e) {
      console.warn('No se pudo guardar la preferencia:', e);
    }
  };

  const abrirEscanerComercio = async () => {
    Haptics.selectionAsync();
    if (!permisoCamara?.granted) {
      await solicitarPermisoCamara();
    }
    setEscaneandoQr(true);
    setCodigoQrManual('');
    setModalQrVisible(true);
  };

  const consultarComercioPorQr = async (codigoRaw: string) => {
    const codigo = codigoRaw.trim();
    if (!codigo || buscandoQr) return;

    setEscaneandoQr(false);
    setBuscandoQr(true);

    try {
      const res = await servicioComercios.obtenerPorQr(codigo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalQrVisible(false);
      router.push(`/comercio/${res.datos.id}` as any);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'QR no reconocido',
        e?.error?.mensaje || 'Ese código no pertenece a un comercio asociado.',
        [{ text: 'Reintentar', onPress: () => setEscaneandoQr(true) }]
      );
    } finally {
      setBuscandoQr(false);
    }
  };

  const terminoNormalizado = normalizarTexto(busqueda.trim());

  const comerciosFiltrados = comercios.filter((comercio) => {
    if (soloAbiertos && !obtenerEstadoComercio(comercio).abierto) {
      return false;
    }

    if (!terminoNormalizado) return true;

    const nombreNorm = normalizarTexto(comercio.nombre);
    const descNorm = normalizarTexto(comercio.descripcion || '');
    const tags = obtenerTagsProductos(comercio);
    const coincideTag = tags.some((tag) => normalizarTexto(tag).includes(terminoNormalizado));

    return (
      nombreNorm.includes(terminoNormalizado) ||
      descNorm.includes(terminoNormalizado) ||
      coincideTag
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar local o producto: 'queso, pintura, otro'"
          value={busqueda}
          onChangeText={setBusqueda}
          placeholderTextColor="#94A3B8"
          clearButtonMode="while-editing"
        />
        <TouchableOpacity
          style={styles.qrBtn}
          onPress={abrirEscanerComercio}
          accessibilityLabel="Escanear QR de comercio"
        >
          <Ionicons name="qr-code-outline" size={22} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <View style={styles.rubrosWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'todos', nombre: 'Todos', color: '#1E293B', icono: '', orden: 0 }, ...rubros]}
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
                onPress={() => handleSeleccionarRubro(item.id)}
              >
                {item.icono ? (
                  <Ionicons
                    name={item.icono as any}
                    size={15}
                    color={activo ? '#FFFFFF' : item.color || '#334155'}
                    style={{ marginRight: 6 }}
                  />
                ) : null}
                <Text
                  style={[
                    styles.chipRubroText,
                    activo && styles.chipRubroTextActivo,
                  ]}
                >
                  {item.nombre}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.filtroAbiertoRow}>
        <Text style={styles.filtroAbiertoLabel}>Mostrar solo abiertos ahora</Text>
        <Switch
          value={soloAbiertos}
          onValueChange={(val) => {
            Haptics.selectionAsync();
            setSoloAbiertos(val);
          }}
          trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
          thumbColor={soloAbiertos ? '#1E3A8A' : '#F1F5F9'}
        />
      </View>

      {cargando ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.stateText}>Buscando comercios en la ciudad...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Sin conexión a comercios</Text>
          <Text style={styles.stateText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={cargarComercios}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : comerciosFiltrados.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.stateText}>
            No se encontraron comercios que coincidan con tu búsqueda.
          </Text>
        </View>
      ) : (
        <FlatList
          data={comerciosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const estado = obtenerEstadoComercio(item);
            const tags = obtenerTagsProductos(item);
            const tagCoincidente = terminoNormalizado
              ? tags.find((t) => normalizarTexto(t).includes(terminoNormalizado))
              : null;

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/comercio/${item.id}` as any);
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                  <Text style={styles.cardPuntaje}>★ {(item.puntaje ?? 0).toFixed(1)}</Text>
                </View>
                <Text style={styles.cardDireccion}>{item.direccion}</Text>

                {tagCoincidente && (
                  <View style={styles.tagMatchBadge}>
                    <Text style={styles.tagMatchText}>Producto: #{tagCoincidente}</Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.cardHorario,
                    estado.abierto ? styles.horarioAbierto : styles.horarioCerrado,
                  ]}
                >
                  {estado.mensaje}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal
        visible={modalQrVisible}
        animationType="slide"
        onRequestClose={() => setModalQrVisible(false)}
      >
        <View style={styles.qrModalContainer}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>Escanear QR del Comercio</Text>
            <TouchableOpacity onPress={() => setModalQrVisible(false)}>
              <Ionicons name="close" size={26} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {permisoCamara?.granted ? (
            <View style={styles.cameraWrapper}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={
                  escaneandoQr ? ({ data }) => consultarComercioPorQr(data) : undefined
                }
              />
              <View style={styles.qrVisorOverlay}>
                <View style={styles.qrCuadro} />
                <Text style={styles.qrAyudaCamara}>
                  Apuntá al código QR de la vidriera del local
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.sinCamaraBox}>
              <Text style={styles.stateText}>
                Permiso de cámara no concedido. Podés ingresar el código del local abajo.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={solicitarPermisoCamara}>
                <Text style={styles.retryBtnText}>Habilitar cámara</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.qrManualBox}>
            <Text style={styles.qrManualLabel}>Ingresar código QR del comercio:</Text>
            <View style={styles.qrManualRow}>
              <TextInput
                style={styles.qrManualInput}
                placeholder="Ej: CCU:com-118"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={codigoQrManual}
                onChangeText={setCodigoQrManual}
              />
              <TouchableOpacity
                style={styles.qrManualBtn}
                onPress={() => consultarComercioPorQr(codigoQrManual)}
                disabled={buscandoQr || !codigoQrManual.trim()}
              >
                <Text style={styles.qrManualBtnText}>
                  {buscandoQr ? '...' : 'Ir al local'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  qrBtn: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rubrosWrapper: { backgroundColor: '#FFFFFF', paddingBottom: 10, paddingHorizontal: 8 },
  chipRubro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    marginRight: 8,
  },
  chipRubroText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  chipRubroTextActivo: { color: '#FFFFFF', fontWeight: '700' },
  filtroAbiertoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  filtroAbiertoLabel: { fontSize: 14, color: '#475569', fontWeight: '500' },
  listContent: { padding: 12, gap: 10 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardPuntaje: { fontSize: 14, fontWeight: '700', color: '#D97706' },
  cardDireccion: { fontSize: 13, color: '#64748B', marginBottom: 6 },
  tagMatchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  tagMatchText: { fontSize: 11, fontWeight: '600', color: '#1E3A8A' },
  cardHorario: { fontSize: 13, fontWeight: '600' },
  horarioAbierto: { color: '#16A34A' },
  horarioCerrado: { color: '#DC2626' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  qrModalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  qrModalTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  cameraWrapper: { flex: 1, backgroundColor: '#000' },
  qrVisorOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  qrCuadro: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: 16,
  },
  qrAyudaCamara: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  sinCamaraBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrManualBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  qrManualLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  qrManualRow: { flexDirection: 'row', gap: 8 },
  qrManualInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qrManualBtn: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  qrManualBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});