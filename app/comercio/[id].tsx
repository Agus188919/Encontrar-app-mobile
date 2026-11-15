import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Pressable,
    TouchableOpacity,
    TextInput,
    Linking,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { clienteHttp } from '../../src/servicios/api';
import { servicioComercios } from '../../src/servicios/comercios';
import { servicioResenas } from '../../src/servicios/resenas';
import { servicioPromociones } from '../../src/servicios/promociones';
import { servicioAuth } from '../../src/servicios/auth';
import { servicioUsuario } from '../../src/servicios/usuario';
import {
    Comercio,
    Horario,
    Promocion,
    Resena,
    Usuario,
    UsoDePromocion,
} from '../../src/tipos';
import { obtenerTagsProductos } from '../../src/utils/productos';
import { estaAbiertoAhora } from '../../src/utils/horarios';

function ReproductorPresentacion({ url }: { url: string }) {
    const player = useVideoPlayer(url, (p) => {
        p.loop = false;
    });

    return (
        <View style={styles.videoContainer}>
            <VideoView
                style={styles.video}
                player={player}
                fullscreenOptions={{ enable: true }}
                allowsPictureInPicture
            />
        </View>
    );
}

export default function FichaComercioScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const [tagsExpandidos, setTagsExpandidos] = useState(false);
    const [comercio, setComercio] = useState<Comercio | null>(null);
    const [promociones, setPromociones] = useState<Promocion[]>([]);
    const [resenas, setResenas] = useState<Resena[]>([]);
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [esFavorito, setEsFavorito] = useState(false);
    const [cargando, setCargando] = useState<boolean>(true);
    const [estrellasInput, setEstrellasInput] = useState<1 | 2 | 3 | 4 | 5>(5);
    const [comentarioInput, setComentarioInput] = useState('');
    const [editandoResenaId, setEditandoResenaId] = useState<string | null>(null);
    const [enviandoResena, setEnviandoResena] = useState(false);
    const [respondiendoId, setRespondiendoId] = useState<string | null>(null);
    const [respuestaTexto, setRespuestaTexto] = useState('');
    const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
    const [generandoPromoId, setGenerandoPromoId] = useState<string | null>(null);
    const [cuponActivo, setCuponActivo] = useState<{
        promo: Promocion;
        uso: UsoDePromocion;
    } | null>(null);

    useEffect(() => {
        if (!id) {
            setCargando(false);
            return;
        }
        cargarTodo(id);
    }, [id]);

    const cargarTodo = async (comercioId: string) => {
        setCargando(true);
        try {
            const [resComercio, resPromos, resResenas, sesion] = await Promise.all([
                servicioComercios.obtenerPorId(comercioId),
                clienteHttp<Promocion[]>(`/promociones?comercioId=${comercioId}`).catch(() => ({
                    datos: [] as Promocion[],
                })),
                servicioResenas.listarPorComercio(comercioId).catch(() => ({
                    datos: [] as Resena[],
                })),
                servicioAuth.obtenerSesionActual(),
            ]);

            setComercio(resComercio.datos);
            setPromociones(resPromos.datos ?? []);
            setResenas(resResenas.datos ?? []);
            setUsuario(sesion);

            if (sesion && sesion.rol === 'vecino') {
                try {
                    const perfilActualizado = await servicioUsuario.obtenerPerfil();
                    setUsuario(perfilActualizado.datos);
                    setEsFavorito(
                        (perfilActualizado.datos.favoritos ?? []).includes(comercioId)
                    );
                } catch {
                    setEsFavorito((sesion.favoritos ?? []).includes(comercioId));
                }
            }
        } catch {
            setComercio(null);
        } finally {
            setCargando(false);
        }
    };

    const recargarResenasYComercio = async () => {
        if (!id) return;
        try {
            const [resComercio, resResenas] = await Promise.all([
                servicioComercios.obtenerPorId(id),
                servicioResenas.listarPorComercio(id),
            ]);
            setComercio(resComercio.datos);
            setResenas(resResenas.datos ?? []);
        } catch {
            // Ignoro al refrescar
        }
    };

    const handleToggleFavorito = async () => {
        if (!comercio) return;
        if (!usuario || usuario.rol !== 'vecino') {
            Alert.alert(
                'Iniciá sesión',
                'Ingresá con una cuenta de Vecino en la pestaña "Me" para guardar favoritos.'
            );
            return;
        }

        const nuevoEstado = !esFavorito;
        setEsFavorito(nuevoEstado);
        Haptics.selectionAsync();

        try {
            if (nuevoEstado) {
                await servicioUsuario.agregarFavorito(comercio.id);
            } else {
                await servicioUsuario.quitarFavorito(comercio.id);
            }
            await servicioUsuario.obtenerPerfil();
        } catch (e: any) {
            setEsFavorito(!nuevoEstado);
            Alert.alert('Error', e?.error?.mensaje || 'No se pudo actualizar favoritos.');
        }
    };

    const handleLlamar = () => {
        if (comercio?.telefono) {
            Haptics.selectionAsync();
            Linking.openURL(`tel:${comercio.telefono}`);
        } else {
            Alert.alert('Aviso', 'Este comercio no posee teléfono registrado.');
        }
    };

    const handleWhatsApp = () => {
        if (comercio?.whatsapp) {
            Haptics.selectionAsync();
            const url = `https://wa.me/${comercio.whatsapp}?text=${encodeURIComponent(
                'Hola! Los contacto desde la App de Encontrar, Entre Rios.'
            )}`;
            Linking.openURL(url);
        } else {
            Alert.alert('Aviso', 'Este comercio no tiene WhatsApp de atención.');
        }
    };

    const handleComoLlegar = () => {
        if (!comercio?.coordenadas) {
            Alert.alert('Aviso', 'Este comercio no tiene coordenadas cargadas.');
            return;
        }
        Haptics.selectionAsync();
        const { latitud, longitud } = comercio.coordenadas;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
        Linking.openURL(url);
    };

    const handleObtenerCodigoPromo = async (promo: Promocion) => {
        if (!usuario || usuario.rol !== 'vecino') {
            Alert.alert(
                'Cuenta de Vecino requerida',
                'Iniciá sesión como Vecino en la pestaña "Me" para obtener tu código de descuento.'
            );
            return;
        }

        setGenerandoPromoId(promo.id);
        try {
            const res = await servicioPromociones.generarCodigoUso(promo.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCuponActivo({ promo, uso: res.datos });
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('No disponible', e?.error?.mensaje || 'No se pudo generar el código.');
        } finally {
            setGenerandoPromoId(null);
        }
    };

    const handleGuardarResena = async () => {
        if (!comercio) return;
        if (!comentarioInput.trim()) {
            Alert.alert('Falta comentario', 'Escribí una breve opinión sobre tu experiencia.');
            return;
        }

        setEnviandoResena(true);
        try {
            if (editandoResenaId) {
                await servicioResenas.editarResena(
                    editandoResenaId,
                    estrellasInput,
                    comentarioInput
                );
            } else {
                await servicioResenas.crearResena(
                    comercio.id,
                    estrellasInput,
                    comentarioInput
                );
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setComentarioInput('');
            setEstrellasInput(5);
            setEditandoResenaId(null);
            await recargarResenasYComercio();
        } catch (e: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('No se pudo publicar', e?.error?.mensaje || 'Error al guardar la reseña.');
        } finally {
            setEnviandoResena(false);
        }
    };

    const handleEliminarResena = (resenaId: string) => {
        Alert.alert('Eliminar reseña', '¿Querés borrar tu calificación de este comercio?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await servicioResenas.eliminarResena(resenaId);
                        Haptics.selectionAsync();
                        if (editandoResenaId === resenaId) {
                            setEditandoResenaId(null);
                            setComentarioInput('');
                        }
                        await recargarResenasYComercio();
                    } catch (e: any) {
                        Alert.alert('Error', e?.error?.mensaje || 'No se pudo eliminar la reseña.');
                    }
                },
            },
        ]);
    };

    const handleReportarResena = (resenaId: string) => {
        if (!usuario) {
            Alert.alert('Iniciá sesión', 'Tenés que iniciar sesión para reportar un comentario.');
            return;
        }
        Alert.alert('Reportar comentario', '¿Deseás reportar esta reseña como ofensiva?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Reportar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await servicioResenas.reportarResena(resenaId);
                        Alert.alert('Reporte enviado', 'Gracias por ayudarnos a moderar la comunidad.');
                        await recargarResenasYComercio();
                    } catch (e: any) {
                        Alert.alert('Aviso', e?.error?.mensaje || 'No se pudo reportar la reseña.');
                    }
                },
            },
        ]);
    };

    const handleEnviarRespuesta = async (resenaId: string) => {
        if (!respuestaTexto.trim()) return;
        setEnviandoRespuesta(true);
        try {
            await servicioResenas.responderResena(resenaId, respuestaTexto);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setRespondiendoId(null);
            setRespuestaTexto('');
            await recargarResenasYComercio();
        } catch (e: any) {
            Alert.alert('Error', e?.error?.mensaje || 'No se pudo enviar la respuesta.');
        } finally {
            setEnviandoRespuesta(false);
        }
    };

    if (cargando) {
        return (
            <View style={styles.centro}>
                <ActivityIndicator size="large" color="#0B3A5D" />
                <Text style={styles.cargandoTexto}>Cargando ficha del comercio...</Text>
            </View>
        );
    }

    if (!comercio) {
        return (
            <View style={styles.centro}>
                <Text style={styles.errorTexto}>El comercio solicitado no existe.</Text>
                <Pressable style={styles.botonVolver} onPress={() => router.back()}>
                    <Text style={styles.botonVolverTexto}>Volver al directorio</Text>
                </Pressable>
            </View>
        );
    }

    const estaDeVacaciones = Boolean(
        (comercio as Comercio & { cerradoHasta?: string | null }).cerradoHasta
    );
    const estadoHorario = estaDeVacaciones
        ? { abierto: false, mensaje: 'Cerrado por vacaciones' }
        : estaAbiertoAhora(comercio.horarios);

    const formatearDia = (dia: number): string => {
        const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return nombres[dia] ?? '';
    };

    const ordenDias = [1, 2, 3, 4, 5, 6, 0];
    const horariosAgrupados = ordenDias
        .map((dia) => {
            const turnos = (comercio.horarios ?? []).filter((h: Horario) => h.dia === dia);
            if (turnos.length === 0) return null;
            return {
                dia,
                franjas: turnos.map((t) => `${t.abre} a ${t.cierra} hs`).join('  /  '),
            };
        })
        .filter((item): item is { dia: number; franjas: string } => item !== null);

    const mediosDePago = comercio.mediosDePago ?? [];
    const tagsProductos = obtenerTagsProductos(comercio);
    const miResena = usuario ? resenas.find((r) => r.usuarioId === usuario.id) : undefined;
    const esDuenoComercio =
        usuario?.rol === 'comercio' && usuario.comercioId === comercio.id;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            {comercio.videoUrl ? (
                <ReproductorPresentacion url={comercio.videoUrl} />
            ) : comercio.imagenes && comercio.imagenes.length > 0 ? (
                <Image
                    source={{ uri: comercio.imagenes[0] }}
                    style={styles.portada}
                    contentFit="cover"
                    transition={200}
                />
            ) : (
                <View style={styles.placeholderImg}>
                    <Text style={styles.placeholderTexto}>Sin imagen de presentación</Text>
                </View>
            )}

            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.nombre}>{comercio.nombre}</Text>
                        <Text style={styles.direccion}>{comercio.direccion}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.favBtn}
                        onPress={handleToggleFavorito}
                        accessibilityLabel="Guardar en favoritos"
                    >
                        <Ionicons
                            name={esFavorito ? 'heart' : 'heart-outline'}
                            size={24}
                            color={esFavorito ? '#E11D48' : '#64748B'}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.puntajeRow}>
                    <Text style={styles.estrellas}>★ {(comercio.puntaje ?? 0).toFixed(1)}</Text>
                    <Text style={styles.resenas}>({comercio.cantidadResenas ?? 0} opiniones)</Text>
                    <View style={estadoHorario.abierto ? styles.badgeAbierto : styles.badgeCerrado}>
                        <Text
                            style={
                                estadoHorario.abierto
                                    ? styles.badgeAbiertoTexto
                                    : styles.badgeCerradoTexto
                            }
                        >
                            {estadoHorario.mensaje}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.botonera}>
                <Pressable style={styles.botonAccion} onPress={handleLlamar}>
                    <Text style={styles.botonAccionTexto}>Llamar</Text>
                </Pressable>
                <Pressable style={[styles.botonAccion, styles.btnWpp]} onPress={handleWhatsApp}>
                    <Text style={styles.botonAccionTexto}>WhatsApp</Text>
                </Pressable>
                <Pressable style={[styles.botonAccion, styles.btnMapa]} onPress={handleComoLlegar}>
                    <Text style={styles.botonAccionTexto}>Cómo llegar</Text>
                </Pressable>
            </View>

            <View style={styles.seccion}>
                <Text style={styles.seccionTitulo}>Acerca del comercio</Text>
                <Text style={styles.descripcion}>
                    {comercio.descripcion || 'Sin descripción disponible.'}
                </Text>
            </View>

            <View style={styles.seccion}>
                <TouchableOpacity
                    style={styles.seccionHeaderBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.selectionAsync();
                        setTagsExpandidos((prev) => !prev);
                    }}
                >
                    <View style={styles.seccionTituloRow}>
                        <Text style={[styles.seccionTitulo, { marginBottom: 0 }]}>
                            Productos y etiquetas
                        </Text>
                        <View style={styles.contadorTagsBadge}>
                            <Text style={styles.contadorTagsText}>{tagsProductos.length}</Text>
                        </View>
                    </View>
                    <Ionicons
                        name={tagsExpandidos ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#2C3E50"
                    />
                </TouchableOpacity>

                {tagsExpandidos && (
                    <View style={[styles.pagoWrap, { marginTop: 12 }]}>
                        {tagsProductos.map((tag) => (
                            <View key={tag} style={styles.tagChip}>
                                <Text style={styles.tagTexto}>#{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {promociones.length > 0 && (
                <View style={styles.seccion}>
                    <Text style={styles.seccionTitulo}>Promociones vigentes</Text>
                    {promociones.map((promo) => (
                        <View key={promo.id} style={styles.promoCard}>
                            <View style={styles.promoHeader}>
                                <Text style={styles.promoTitulo}>{promo.titulo}</Text>
                                {promo.descuento ? (
                                    <View style={styles.promoBadge}>
                                        <Text style={styles.promoBadgeText}>{promo.descuento}% OFF</Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text style={styles.promoDetalle}>{promo.detalle}</Text>
                            <View style={styles.promoFooter}>
                                <Text style={styles.promoVence}>
                                    Válido hasta {new Date(promo.hasta).toLocaleDateString('es-AR')}
                                </Text>
                                {promo.soloApp && (
                                    <TouchableOpacity
                                        style={styles.btnPromoCodigo}
                                        onPress={() => handleObtenerCodigoPromo(promo)}
                                        disabled={generandoPromoId === promo.id}
                                    >
                                        <Text style={styles.btnPromoCodigoText}>
                                            {generandoPromoId === promo.id ? '...' : 'Obtener código'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.seccion}>
                <Text style={styles.seccionTitulo}>Horarios de atención</Text>
                {estaDeVacaciones ? (
                    <Text
                        style={[
                            styles.sinDatosTexto,
                            { color: '#C0392B', fontStyle: 'normal', fontWeight: '600' },
                        ]}
                    >
                        Cerrado temporalmente por vacaciones.
                    </Text>
                ) : horariosAgrupados.length > 0 ? (
                    horariosAgrupados.map((item) => (
                        <View key={item.dia} style={styles.horarioFila}>
                            <Text style={styles.horarioDia}>{formatearDia(item.dia)}</Text>
                            <Text style={styles.horarioHoras}>{item.franjas}</Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.sinDatosTexto}>Horarios no especificados.</Text>
                )}
            </View>

            <View style={styles.seccion}>
                <Text style={styles.seccionTitulo}>Medios de pago aceptados</Text>
                {mediosDePago.length > 0 ? (
                    <View style={styles.pagoWrap}>
                        {mediosDePago.map((pago: string, idx: number) => (
                            <View key={idx} style={styles.pagoChip}>
                                <Text style={styles.pagoTexto}>{pago.toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.sinDatosTexto}>Consultar medios de pago en el local.</Text>
                )}
            </View>

            <View style={styles.seccion}>
                <Text style={styles.seccionTitulo}>Opiniones de vecinos ({resenas.length})</Text>

                {usuario?.rol === 'vecino' && (!miResena || editandoResenaId) && (
                    <View style={styles.formResenaBox}>
                        <Text style={styles.formResenaLabel}>
                            {editandoResenaId ? 'Editar tu reseña' : 'Dejá tu calificación'}
                        </Text>
                        <View style={styles.estrellasSelector}>
                            {([1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[]).map((num) => (
                                <TouchableOpacity
                                    key={num}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setEstrellasInput(num);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.estrellaBtn,
                                            num <= estrellasInput && styles.estrellaBtnActiva,
                                        ]}
                                    >
                                        ★
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={styles.inputResena}
                            placeholder="Contá cómo fue la atención o los productos..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            value={comentarioInput}
                            onChangeText={setComentarioInput}
                        />
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.btnPublicarResena, { flex: 1 }]}
                                onPress={handleGuardarResena}
                                disabled={enviandoResena}
                            >
                                <Text style={styles.btnPublicarResenaText}>
                                    {enviandoResena
                                        ? 'Guardando...'
                                        : editandoResenaId
                                            ? 'Guardar cambios'
                                            : 'Publicar reseña'}
                                </Text>
                            </TouchableOpacity>
                            {editandoResenaId && (
                                <TouchableOpacity
                                    style={styles.btnCancelarEdit}
                                    onPress={() => {
                                        setEditandoResenaId(null);
                                        setComentarioInput('');
                                    }}
                                >
                                    <Text style={styles.btnCancelarEditText}>Cancelar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

                {resenas.length === 0 ? (
                    <Text style={styles.sinDatosTexto}>
                        Todavía no hay opiniones para este comercio.
                    </Text>
                ) : (
                    resenas.map((r) => {
                        const esMia = usuario?.id === r.usuarioId;
                        return (
                            <View key={r.id} style={styles.resenaCard}>
                                <View style={styles.resenaTop}>
                                    <Text style={styles.resenaEstrellas}>
                                        {'★'.repeat(r.estrellas)}
                                        {'☆'.repeat(5 - r.estrellas)}
                                    </Text>
                                    <Text style={styles.resenaFecha}>
                                        {new Date(r.creadaEn).toLocaleDateString('es-AR')}
                                    </Text>
                                </View>

                                <Text style={styles.resenaComentario}>{r.comentario}</Text>

                                {r.respuesta ? (
                                    <View style={styles.respuestaComercioBox}>
                                        <Text style={styles.respuestaComercioTitulo}>
                                            Respuesta del comercio:
                                        </Text>
                                        <Text style={styles.respuestaComercioTexto}>
                                            {r.respuesta}
                                        </Text>
                                    </View>
                                ) : null}

                                <View style={styles.resenaAccionesRow}>
                                    {esMia && (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setEditandoResenaId(r.id);
                                                    setEstrellasInput(r.estrellas);
                                                    setComentarioInput(r.comentario);
                                                }}
                                            >
                                                <Text style={styles.accionLink}>Editar</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => handleEliminarResena(r.id)}
                                            >
                                                <Text style={[styles.accionLink, { color: '#DC2626' }]}>
                                                    Eliminar
                                                </Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    {!esMia && !r.reportada && (
                                        <TouchableOpacity onPress={() => handleReportarResena(r.id)}>
                                            <Text style={styles.accionReportar}>Reportar</Text>
                                        </TouchableOpacity>
                                    )}

                                    {esDuenoComercio && !r.respuesta && respondiendoId !== r.id && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setRespondiendoId(r.id);
                                                setRespuestaTexto('');
                                            }}
                                        >
                                            <Text style={styles.accionLink}>Responder</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {esDuenoComercio && respondiendoId === r.id && (
                                    <View style={styles.responderBox}>
                                        <TextInput
                                            style={styles.inputRespuesta}
                                            placeholder="Escribí la respuesta oficial del comercio..."
                                            value={respuestaTexto}
                                            onChangeText={setRespuestaTexto}
                                        />
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                                            <TouchableOpacity
                                                style={styles.btnEnviarResp}
                                                onPress={() => handleEnviarRespuesta(r.id)}
                                                disabled={enviandoRespuesta}
                                            >
                                                <Text style={styles.btnEnviarRespText}>
                                                    {enviandoRespuesta ? 'Enviando...' : 'Enviar'}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.btnCancelarEdit}
                                                onPress={() => setRespondiendoId(null)}
                                            >
                                                <Text style={styles.btnCancelarEditText}>Cancelar</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </View>

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
                            Presentá este código en el mostrador de {comercio.nombre}.
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
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    scrollContent: { paddingBottom: 40 },
    centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    cargandoTexto: { marginTop: 10, fontSize: 14, color: '#64748B' },
    errorTexto: { fontSize: 16, color: '#C0392B', marginBottom: 12 },
    botonVolver: { backgroundColor: '#0B3A5D', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    botonVolverTexto: { color: '#FFF', fontWeight: 'bold' },
    portada: { width: '100%', height: 220 },
    placeholderImg: { width: '100%', height: 180, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
    placeholderTexto: { color: '#757575', fontSize: 14 },
    videoContainer: { width: '100%', height: 220, backgroundColor: '#000' },
    video: { width: '100%', height: '100%' },
    header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EEE' },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    favBtn: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    nombre: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
    direccion: { fontSize: 14, color: '#666', marginTop: 4 },
    puntajeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 },
    estrellas: { color: '#F39C12', fontWeight: 'bold', marginRight: 2 },
    resenas: { color: '#888', fontSize: 13, marginRight: 6 },
    badgeAbierto: { backgroundColor: '#E8F8F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeAbiertoTexto: { color: '#27AE60', fontSize: 12, fontWeight: 'bold' },
    badgeCerrado: { backgroundColor: '#FDEDEC', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeCerradoTexto: { color: '#C0392B', fontSize: 12, fontWeight: 'bold' },
    botonera: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
    botonAccion: { flex: 1, backgroundColor: '#0B3A5D', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
    btnWpp: { backgroundColor: '#25D366' },
    btnMapa: { backgroundColor: '#2980B9' },
    botonAccionTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    seccion: { padding: 16, backgroundColor: '#FFF', marginTop: 10, borderBottomWidth: 1, borderColor: '#EEE' },
    seccionTitulo: { fontSize: 16, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10 },
    descripcion: { fontSize: 14, color: '#444', lineHeight: 20 },
    sinDatosTexto: { fontSize: 13, color: '#888', fontStyle: 'italic' },
    horarioFila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#F0F0F0' },
    horarioDia: { fontWeight: '600', color: '#333' },
    horarioHoras: { color: '#666' },
    pagoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pagoChip: { backgroundColor: '#EAEDED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    pagoTexto: { fontSize: 12, color: '#2C3E50', fontWeight: '600' },
    tagChip: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE' },
    tagTexto: { fontSize: 12, color: '#1E3A8A', fontWeight: '600' },
    promoCard: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    promoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    promoTitulo: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1 },
    promoBadge: { backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    promoBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    promoDetalle: { fontSize: 13, color: '#475569', marginBottom: 8 },
    promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    promoVence: { fontSize: 11, color: '#64748B' },
    btnPromoCodigo: { backgroundColor: '#1E3A8A', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
    btnPromoCodigoText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    formResenaBox: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14,
    },
    formResenaLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
    estrellasSelector: { flexDirection: 'row', gap: 6, marginBottom: 8 },
    estrellaBtn: { fontSize: 26, color: '#CBD5E1' },
    estrellaBtnActiva: { color: '#F59E0B' },
    inputResena: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        minHeight: 64,
        textAlignVertical: 'top',
        marginBottom: 8,
    },
    btnPublicarResena: {
        backgroundColor: '#0B3A5D',
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
    },
    btnPublicarResenaText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
    btnCancelarEdit: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: 6,
    },
    btnCancelarEditText: { color: '#334155', fontWeight: '600', fontSize: 12 },
    resenaCard: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    resenaTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    resenaEstrellas: { color: '#F59E0B', fontSize: 14, fontWeight: '700' },
    resenaFecha: { fontSize: 11, color: '#94A3B8' },
    resenaComentario: { fontSize: 14, color: '#334155', lineHeight: 19 },
    respuestaComercioBox: {
        marginTop: 8,
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#0B3A5D',
    },
    respuestaComercioTitulo: { fontSize: 11, fontWeight: '700', color: '#0B3A5D', marginBottom: 2 },
    respuestaComercioTexto: { fontSize: 13, color: '#475569' },
    resenaAccionesRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
    accionLink: { fontSize: 12, fontWeight: '600', color: '#1E3A8A' },
    accionReportar: { fontSize: 12, color: '#94A3B8' },
    responderBox: { marginTop: 8 },
    inputRespuesta: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        padding: 8,
        fontSize: 13,
    },
    btnEnviarResp: {
        backgroundColor: '#0B3A5D',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 6,
    },
    btnEnviarRespText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
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
    seccionHeaderBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    seccionTituloRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    contadorTagsBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    contadorTagsText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
});