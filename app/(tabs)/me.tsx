import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { clienteHttp } from '../../src/servicios/api';
import { servicioAuth } from '../../src/servicios/auth';
import { servicioUsuario } from '../../src/servicios/usuario';
import { servicioComercios } from '../../src/servicios/comercios';
import { servicioPromociones } from '../../src/servicios/promociones';
import { servicioMiComercio, ComercioPropio } from '../../src/servicios/miComercio';
import { Usuario, Comercio, Rubro, Promocion, UsoDePromocion } from '../../src/tipos';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export default function PantallaMe() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [modoAuth, setModoAuth] = useState<'ingreso' | 'registro'>('ingreso');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [avisosActivos, setAvisosActivos] = useState(true);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [comerciosFavoritos, setComerciosFavoritos] = useState<Comercio[]>([]);
  const [misUsos, setMisUsos] = useState<UsoDePromocion[]>([]);
  const [miComercio, setMiComercio] = useState<ComercioPropio | null>(null);
  const [descComercio, setDescComercio] = useState('');
  const [telComercio, setTelComercio] = useState('');
  const [wppComercio, setWppComercio] = useState('');
  const [cerradoVacaciones, setCerradoVacaciones] = useState(false);
  const [guardandoComercio, setGuardandoComercio] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [misPromos, setMisPromos] = useState<Promocion[]>([]);
  const [modalNuevaPromo, setModalNuevaPromo] = useState(false);
  const [promoTitulo, setPromoTitulo] = useState('');
  const [promoDetalle, setPromoDetalle] = useState('');
  const [promoDescuento, setPromoDescuento] = useState('');
  const [promoDias, setPromoDias] = useState('7');
  const [promoSoloApp, setPromoSoloApp] = useState(true);
  const [creandoPromo, setCreandoPromo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarEstadoCompleto();
    }, [])
  );

  const cargarEstadoCompleto = async () => {
    setCargandoSesion(true);
    try {
      const sesion = await servicioAuth.obtenerSesionActual();
      if (!sesion) {
        setUsuario(null);
        return;
      }

      let perfil = sesion;
      try {
        const resPerfil = await servicioUsuario.obtenerPerfil();
        perfil = resPerfil.datos;
      } catch {
        // Si falla uso el cacheado
      }

      setUsuario(perfil);
      setAvisosActivos(perfil.avisosActivos ?? true);

      const resRubros = await servicioComercios.obtenerRubros().catch(() => ({
        datos: [] as Rubro[],
      }));
      setRubros(resRubros.datos ?? []);

      if (perfil.rol === 'vecino') {
        await cargarDatosVecino(perfil);
      } else if (perfil.rol === 'comercio') {
        await cargarDatosComercio();
      }
    } finally {
      setCargandoSesion(false);
    }
  };

  const cargarDatosVecino = async (perfil: Usuario) => {
    const [resComercios, resUsos] = await Promise.all([
      servicioComercios.listar({ porPagina: 100 }).catch(() => ({ datos: [] as Comercio[] })),
      servicioPromociones.listarMisUsos().catch(() => ({ datos: [] as UsoDePromocion[] })),
    ]);

    const favIds = perfil.favoritos ?? [];
    setComerciosFavoritos((resComercios.datos ?? []).filter((c) => favIds.includes(c.id)));
    setMisUsos(resUsos.datos ?? []);
  };

  const cargarDatosComercio = async () => {
    const [resLocal, resPromos] = await Promise.all([
      servicioMiComercio.obtener().catch(() => null),
      servicioMiComercio.listarPromociones().catch(() => ({ datos: [] as Promocion[] })),
    ]);

    if (resLocal?.datos) {
      const local = resLocal.datos;
      setMiComercio(local);
      setDescComercio(local.descripcion ?? '');
      setTelComercio(local.telefono ?? '');
      setWppComercio(local.whatsapp ?? '');
      setCerradoVacaciones(Boolean(local.cerradoHasta));
    }

    setMisPromos(resPromos.datos ?? []);
  };

  const handleAutenticar = async () => {
    if (modoAuth === 'registro' && !nombreRegistro.trim()) {
      setErrorLogin('Ingresá tu nombre completo.');
      return;
    }
    if (!email.trim() || !clave.trim()) {
      setErrorLogin('Ingresá tu correo electrónico y contraseña.');
      return;
    }
    if (modoAuth === 'registro' && (clave.length < 8 || clave.length > 100)) {
      setErrorLogin('La contraseña debe tener entre 8 y 100 caracteres.');
      return;
    }

    setEnviando(true);
    setErrorLogin(null);

    try {
      if (modoAuth === 'registro') {
        await servicioAuth.registrar(nombreRegistro, email, clave);
      } else {
        await servicioAuth.ingresar(email, clave);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClave('');
      setNombreRegistro('');
      await cargarEstadoCompleto();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorLogin(
        e?.error?.mensaje ||
        (modoAuth === 'registro'
          ? 'No se pudo crear la cuenta.'
          : 'Credenciales incorrectas o error de conexión.')
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleCerrarSesion = async () => {
    Haptics.selectionAsync();
    await servicioAuth.cerrarSesion();
    setUsuario(null);
    setEmail('');
    setClave('');
    setNombreRegistro('');
    setErrorLogin(null);
  };

  const handleToggleAvisos = async (nuevoValor: boolean) => {
    Haptics.selectionAsync();
    setAvisosActivos(nuevoValor);
    try {
      const res = await servicioUsuario.actualizarPreferencias({ avisosActivos: nuevoValor });
      setUsuario(res.datos);

      if (nuevoValor) {
        await registrarDispositivoPush();
      }
    } catch (e: any) {
      setAvisosActivos(!nuevoValor);
      Alert.alert('Error', e?.error?.mensaje || 'No se pudo actualizar la preferencia.');
    }
  };

  const registrarDispositivoPush = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;

      let tokenExpo = 'ExponentPushToken[emulador-cdelu]';
      try {
        const tokenObj = await Notifications.getExpoPushTokenAsync();
        if (tokenObj?.data) tokenExpo = tokenObj.data;
      } catch {
      }

      await clienteHttp('/dispositivos', {
        method: 'POST',
        body: JSON.stringify({ tokenExpo }),
      });
    } catch (e: any) {
      if (e?.error?.codigo === 'NO_IMPLEMENTADO') {
        console.log('API Push: endpoint pendiente de implementar en servidor (501).');
      }
    }
  };

  const handleProbarRecordatorioLocal = async () => {
    Haptics.selectionAsync();
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Habilitá las notificaciones en los ajustes del teléfono.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '¡Promo por vencer en Encontrar!',
        body: 'Tenés descuentos vigentes por vencer en los próximos 3 días. Revisá la pestaña Promos.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });

    Alert.alert('Recordatorio programado', 'Vas a recibir una notificación local en 3 segundos.');
  };

  const handleToggleRubroInteres = async (rubroId: string) => {
    if (!usuario) return;
    Haptics.selectionAsync();
    const actuales = usuario.rubrosDeInteres ?? [];
    const nuevos = actuales.includes(rubroId)
      ? actuales.filter((id) => id !== rubroId)
      : [...actuales, rubroId];

    setUsuario({ ...usuario, rubrosDeInteres: nuevos });
    try {
      const res = await servicioUsuario.actualizarPreferencias({ rubrosDeInteres: nuevos });
      setUsuario(res.datos);
    } catch {
      setUsuario({ ...usuario, rubrosDeInteres: actuales });
    }
  };

  const handleSubirFotoComercio = async () => {
    if (!miComercio) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Habilitá el acceso a la galería para subir una foto.');
      return;
    }

    const seleccion = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (seleccion.canceled || !seleccion.assets?.length) return;

    const asset = seleccion.assets[0];
    const uri = asset.uri;
    const nombreArchivo = uri.split('/').pop() || 'foto-comercio.jpg';
    const extension = nombreArchivo.split('.').pop()?.toLowerCase();
    const tipoMime =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

    setSubiendoFoto(true);
    try {
      const token = await SecureStore.getItemAsync('token_sesion');
      const formData = new FormData();
      formData.append('archivo', {
        uri,
        name: nombreArchivo,
        type: tipoMime,
      } as any);

      const resArchivo = await fetch(`${BASE_URL}/archivos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const cuerpoArchivo = await resArchivo.json();
      if (!resArchivo.ok) {
        throw cuerpoArchivo;
      }

      const urlSubida: string =
        typeof cuerpoArchivo.datos === 'string'
          ? cuerpoArchivo.datos
          : cuerpoArchivo.datos?.url;

      const imagenesActualizadas = [...(miComercio.imagenes ?? []), urlSubida].slice(-8);

      const resActualizado = await clienteHttp<ComercioPropio>('/mi-comercio', {
        method: 'PATCH',
        body: JSON.stringify({ imagenes: imagenesActualizadas }),
      });

      setMiComercio(resActualizado.datos);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Foto subida', 'La imagen se agregó correctamente a la ficha de tu comercio.');
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('No se pudo subir', e?.error?.mensaje || 'Error al subir la imagen.');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleGuardarMiComercio = async () => {
    setGuardandoComercio(true);
    try {
      const res = await servicioMiComercio.actualizar({
        descripcion: descComercio.trim(),
        telefono: telComercio.trim() || null,
        whatsapp: wppComercio.trim() || null,
        cerradoHasta: cerradoVacaciones ? '2026-12-31' : null,
      });
      setMiComercio(res.datos);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Guardado', 'Los datos de tu comercio se actualizaron correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.error?.mensaje || 'No se pudieron guardar los cambios.');
    } finally {
      setGuardandoComercio(false);
    }
  };

  const handleCrearPromocion = async () => {
    if (!promoTitulo.trim() || !promoDetalle.trim()) {
      Alert.alert('Campos obligatorios', 'Completá el título y el detalle de la promoción.');
      return;
    }

    const descNum = promoDescuento.trim() ? parseInt(promoDescuento.trim(), 10) : null;
    if (descNum !== null && (isNaN(descNum) || descNum < 1 || descNum > 100)) {
      Alert.alert('Descuento inválido', 'Ingresá un porcentaje entero entre 1 y 100, o dejalo vacío.');
      return;
    }

    const dias = Math.max(1, parseInt(promoDias, 10) || 7);
    const ahora = new Date();
    const vencimiento = new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000);

    setCreandoPromo(true);
    try {
      await servicioMiComercio.crearPromocion({
        titulo: promoTitulo.trim(),
        detalle: promoDetalle.trim(),
        descuento: descNum,
        desde: ahora.toISOString(),
        hasta: vencimiento.toISOString(),
        soloApp: promoSoloApp,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalNuevaPromo(false);
      setPromoTitulo('');
      setPromoDetalle('');
      setPromoDescuento('');
      await cargarDatosComercio();
    } catch (e: any) {
      Alert.alert('No se pudo crear', e?.error?.mensaje || 'Verificá los datos ingresados.');
    } finally {
      setCreandoPromo(false);
    }
  };

  const handleBajaPromocion = (promo: Promocion) => {
    Alert.alert('Dar de baja promoción', `¿Querés desactivar "${promo.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dar de baja',
        style: 'destructive',
        onPress: async () => {
          try {
            await servicioMiComercio.darDeBajaPromocion(promo.id);
            Haptics.selectionAsync();
            await cargarDatosComercio();
          } catch (e: any) {
            Alert.alert('Error', e?.error?.mensaje || 'No se pudo dar de baja la promoción.');
          }
        },
      },
    ]);
  };

  if (cargandoSesion) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <View style={styles.authTabsRow}>
              <TouchableOpacity
                style={[styles.authTab, modoAuth === 'ingreso' && styles.authTabActivo]}
                onPress={() => {
                  setModoAuth('ingreso');
                  setErrorLogin(null);
                }}
              >
                <Text
                  style={[
                    styles.authTabText,
                    modoAuth === 'ingreso' && styles.authTabTextActivo,
                  ]}
                >
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTab, modoAuth === 'registro' && styles.authTabActivo]}
                onPress={() => {
                  setModoAuth('registro');
                  setErrorLogin(null);
                }}
              >
                <Text
                  style={[
                    styles.authTabText,
                    modoAuth === 'registro' && styles.authTabTextActivo,
                  ]}
                >
                  Crear Cuenta
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.loginTitle}>
              {modoAuth === 'ingreso'
                ? 'Ingresar a Encontrar'
                : 'Crear cuenta de Vecino'}
            </Text>
            <Text style={styles.loginSubtitle}>
              {modoAuth === 'ingreso'
                ? 'Iniciá sesión para gestionar tus favoritos, canjear promociones o validar códigos QR.'
                : 'Registrate gratis para guardar comercios favoritos, opinar y obtener cupones.'}
            </Text>

            {modoAuth === 'registro' && (
              <>
                <Text style={styles.inputLabel}>Nombre completo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Juan Pérez"
                  placeholderTextColor="#94A3B8"
                  value={nombreRegistro}
                  onChangeText={setNombreRegistro}
                />
              </>
            )}

            <Text style={styles.inputLabel}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>
              {modoAuth === 'registro' ? 'Contraseña (mínimo 8 caracteres)' : 'Contraseña'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              secureTextEntry
              value={clave}
              onChangeText={setClave}
            />

            {errorLogin && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorLogin}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, enviando && styles.actionBtnDisabled]}
              onPress={handleAutenticar}
              disabled={enviando}
            >
              <Text style={styles.actionBtnText}>
                {enviando
                  ? 'Procesando...'
                  : modoAuth === 'ingreso'
                    ? 'Iniciar Sesión'
                    : 'Registrarme'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  const esComercio = usuario.rol === 'comercio';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerCard}>
        <Text style={styles.nombreUsuario}>{usuario.nombre}</Text>
        <Text style={styles.emailUsuario}>{usuario.email}</Text>
        <View style={[styles.badgeContainer, esComercio && styles.badgeComercio]}>
          <Text style={[styles.rolBadge, esComercio && styles.rolBadgeComercio]}>
            {esComercio ? 'Cuenta Comercio / Socio CCU' : 'Usuario Vecino'}
          </Text>
        </View>
      </View>

      {esComercio && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mostrador y Validación QR</Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/comercio/escaner' as any);
              }}
            >
              <Text style={styles.actionBtnText}>📷 Escanear QR de Cliente</Text>
            </TouchableOpacity>
          </View>

          {miComercio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi Comercio: {miComercio.nombre}</Text>

              <Text style={styles.inputLabel}>
                Fotos del local ({miComercio.imagenes?.length ?? 0}/8)
              </Text>
              {miComercio.imagenes && miComercio.imagenes.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.fotosStrip}
                >
                  {miComercio.imagenes.map((imgUrl, idx) => (
                    <Image
                      key={`${imgUrl}-${idx}`}
                      source={{ uri: imgUrl }}
                      style={styles.fotoThumb}
                      contentFit="cover"
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.subLabel}>Aún no tenés fotos cargadas.</Text>
              )}

              <TouchableOpacity
                style={[styles.secondaryBtn, { marginTop: 4, marginBottom: 14 }]}
                onPress={handleSubirFotoComercio}
                disabled={subiendoFoto}
              >
                <Text style={styles.secondaryBtnText}>
                  {subiendoFoto ? 'Subiendo foto...' : '🖼️ Subir foto desde galería'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                multiline
                value={descComercio}
                onChangeText={setDescComercio}
              />

              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={telComercio}
                onChangeText={setTelComercio}
              />

              <Text style={styles.inputLabel}>WhatsApp (ej: 5493442...)</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={wppComercio}
                onChangeText={setWppComercio}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.label}>Cerrado por vacaciones</Text>
                  <Text style={styles.subLabel}>
                    Muestra el local cerrado temporalmente en el directorio
                  </Text>
                </View>
                <Switch
                  value={cerradoVacaciones}
                  onValueChange={setCerradoVacaciones}
                  trackColor={{ false: '#CBD5E1', true: '#FCA5A5' }}
                  thumbColor={cerradoVacaciones ? '#DC2626' : '#F1F5F9'}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { marginTop: 10 }]}
                onPress={handleGuardarMiComercio}
                disabled={guardandoComercio}
              >
                <Text style={styles.actionBtnText}>
                  {guardandoComercio ? 'Guardando...' : 'Guardar datos del local'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mis Promociones ({misPromos.length})</Text>
              <TouchableOpacity
                style={styles.btnMini}
                onPress={() => setModalNuevaPromo(true)}
              >
                <Text style={styles.btnMiniText}>+ Nueva</Text>
              </TouchableOpacity>
            </View>

            {misPromos.length === 0 ? (
              <Text style={styles.emptyText}>No tenés promociones creadas.</Text>
            ) : (
              misPromos.map((p) => (
                <View key={p.id} style={styles.itemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{p.titulo}</Text>
                    <Text style={styles.itemSub}>
                      {p.descuento ? `${p.descuento}% OFF · ` : ''}
                      Usos: {p.usos} · {p.activa ? 'Activa' : 'Dada de baja'}
                    </Text>
                  </View>
                  {p.activa && (
                    <TouchableOpacity onPress={() => handleBajaPromocion(p)}>
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        </>
      )}

      {!esComercio && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mis Códigos de Descuento ({misUsos.length})</Text>
            {misUsos.length === 0 ? (
              <Text style={styles.emptyText}>
                Todavía no generaste cupones. Entrá a la pestaña Promos para obtener uno.
              </Text>
            ) : (
              misUsos.map((uso) => (
                <View key={uso.id} style={styles.itemCard}>
                  <View>
                    <Text style={styles.codigoCupon}>{uso.codigo}</Text>
                    <Text style={styles.itemSub}>
                      {uso.validadoEn
                        ? `Canjeado el ${new Date(uso.validadoEn).toLocaleDateString('es-AR')}`
                        : 'Pendiente de presentar en mostrador'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.estadoCuponBadge,
                      uso.validadoEn && styles.estadoCuponUsado,
                    ]}
                  >
                    <Text
                      style={[
                        styles.estadoCuponText,
                        uso.validadoEn && styles.estadoCuponUsadoText,
                      ]}
                    >
                      {uso.validadoEn ? 'Validado' : 'Activo'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Comercios Favoritos ({comerciosFavoritos.length})
            </Text>
            {comerciosFavoritos.length === 0 ? (
              <Text style={styles.emptyText}>
                Marcá comercios con el corazón en su ficha para verlos acá.
              </Text>
            ) : (
              comerciosFavoritos.map((fav) => (
                <TouchableOpacity
                  key={fav.id}
                  style={styles.itemCard}
                  onPress={() => router.push(`/comercio/${fav.id}` as any)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{fav.nombre}</Text>
                    <Text style={styles.itemSub}>{fav.direccion}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {rubros.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rubros de interés</Text>
              <Text style={styles.subLabel}>
                Elegí qué rubros seguís para recibir novedades de nuevas promociones:
              </Text>
              <View style={styles.chipsWrap}>
                {rubros.map((r) => {
                  const seleccionado = (usuario.rubrosDeInteres ?? []).includes(r.id);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.interesChip,
                        seleccionado && { backgroundColor: r.color || '#1E3A8A' },
                      ]}
                      onPress={() => handleToggleRubroInteres(r.id)}
                    >
                      <Text
                        style={[
                          styles.interesChipText,
                          seleccionado && styles.interesChipTextActivo,
                        ]}
                      >
                        {r.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificaciones y Avisos</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Recibir alertas de promociones</Text>
          <Switch
            value={avisosActivos}
            onValueChange={handleToggleAvisos}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
            thumbColor={avisosActivos ? '#1E3A8A' : '#F1F5F9'}
          />
        </View>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleProbarRecordatorioLocal}>
          <Text style={styles.secondaryBtnText}>🔔 Probar alerta local (promo por vencer)</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleCerrarSesion}>
        <Text style={styles.logoutBtnText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Modal
        visible={modalNuevaPromo}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNuevaPromo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva Promoción</Text>

            <Text style={styles.inputLabel}>Título</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 15% OFF abonando en efectivo"
              value={promoTitulo}
              onChangeText={setPromoTitulo}
            />

            <Text style={styles.inputLabel}>Detalle / Condiciones</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Válido de lunes a miércoles en todo el local"
              value={promoDetalle}
              onChangeText={setPromoDetalle}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>% Descuento (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 15"
                  keyboardType="numeric"
                  value={promoDescuento}
                  onChangeText={setPromoDescuento}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Duración (días)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="7"
                  keyboardType="numeric"
                  value={promoDias}
                  onChangeText={setPromoDias}
                />
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Exclusivo App (genera código QR)</Text>
              <Switch
                value={promoSoloApp}
                onValueChange={setPromoSoloApp}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={promoSoloApp ? '#1E3A8A' : '#F1F5F9'}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setModalNuevaPromo(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleCrearPromocion}
                disabled={creandoPromo}
              >
                <Text style={styles.actionBtnText}>
                  {creandoPromo ? 'Creando...' : 'Publicar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 16, paddingBottom: 36 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#64748B' },
  authTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  authTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  authTabActivo: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  authTabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  authTabTextActivo: { color: '#1E3A8A', fontWeight: '700' },
  headerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  nombreUsuario: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emailUsuario: { fontSize: 13, color: '#64748B', marginTop: 2 },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 10,
  },
  badgeComercio: { backgroundColor: '#FEF3C7' },
  rolBadge: { fontSize: 12, color: '#1E3A8A', fontWeight: '700' },
  rolBadgeComercio: { color: '#92400E' },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10 },
  loginTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  loginSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 5 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fotosStrip: { marginBottom: 8 },
  fotoThumb: {
    width: 76,
    height: 76,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: { fontSize: 14, color: '#334155', fontWeight: '500' },
  subLabel: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  actionBtn: {
    backgroundColor: '#1E3A8A',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  actionBtnDisabled: { backgroundColor: '#94A3B8' },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondaryBtn: {
    backgroundColor: '#EFF6FF',
    padding: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryBtnText: { color: '#1E3A8A', fontWeight: '600', fontSize: 13 },
  btnMini: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnMiniText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  codigoCupon: { fontSize: 15, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1 },
  estadoCuponBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  estadoCuponUsado: { backgroundColor: '#F1F5F9' },
  estadoCuponText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  estadoCuponUsadoText: { color: '#64748B' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  interesChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  interesChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  interesChipTextActivo: { color: '#FFFFFF' },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 13,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
});