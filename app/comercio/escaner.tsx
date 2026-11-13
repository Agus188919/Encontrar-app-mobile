import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { servicioPromociones } from '../../src/servicios/promociones';

export default function PantallaEscanerPromo() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();

    const [autenticadoBiometria, setAutenticadoBiometria] = useState(false);
    const [verificandoBiometria, setVerificandoBiometria] = useState(true);

    const [escaneando, setEscaneando] = useState(true);
    const [codigoManual, setCodigoManual] = useState('');
    const [validandoManual, setValidandoManual] = useState(false);
    const [resultadoValidacion, setResultadoValidacion] = useState<string | null>(null);

    useEffect(() => {
        autenticarComerciante();
    }, []);

    const autenticarComerciante = async () => {
        setVerificandoBiometria(true);
        try {
            const tieneHardware = await LocalAuthentication.hasHardwareAsync();
            const estaEnrolado = await LocalAuthentication.isEnrolledAsync();

            if (!tieneHardware || !estaEnrolado) {
                setAutenticadoBiometria(true);
                return;
            }

            const res = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirmá tu identidad para validar promociones',
                cancelLabel: 'Cancelar',
                fallbackLabel: 'Usar PIN del dispositivo',
            });

            if (res.success) {
                setAutenticadoBiometria(true);
            } else {
                Alert.alert('Acceso cancelado', 'Se requiere autenticación para operar el escáner.', [
                    { text: 'Volver', onPress: () => router.back() },
                    { text: 'Reintentar', onPress: autenticarComerciante },
                ]);
            }
        } catch {
            setAutenticadoBiometria(true);
        } finally {
            setVerificandoBiometria(false);
        }
    };

    const validarCodigo = async (codigo: string) => {
        const limpio = codigo.trim();
        if (!limpio) return;

        setEscaneando(false);
        setValidandoManual(true);

        try {
            const res = await servicioPromociones.validarCodigoPromocion(limpio);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setResultadoValidacion(
                `¡Código ${res.datos.codigo} validado con éxito!\nID Canje: ${res.datos.id}`
            );
            setCodigoManual('');
        } catch (e: any) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Código no válido',
                e?.error?.mensaje || 'El cupón no es aplicable o ya fue utilizado.',
                [{ text: 'Aceptar', onPress: () => setEscaneando(true) }]
            );
        } finally {
            setValidandoManual(false);
        }
    };

    const procesarCodigoEscaneado = ({ data }: { data: string }) => {
        if (!escaneando) return;
        validarCodigo(data);
    };

    const resetearEscaner = () => {
        setResultadoValidacion(null);
        setEscaneando(true);
    };

    if (verificandoBiometria) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#1E3A8A" />
                <Text style={styles.infoText}>Verificando identidad del comercio...</Text>
            </View>
        );
    }

    if (!autenticadoBiometria) {
        return null;
    }

    if (!permission) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.infoText}>Solicitando permisos de cámara...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorTitle}>Cámara no autorizada</Text>
                <Text style={styles.infoText}>
                    El comercio necesita la cámara para registrar el canje de promociones en el mostrador.
                </Text>
                <TouchableOpacity style={styles.btnPermiso} onPress={requestPermission}>
                    <Text style={styles.btnPermisoText}>Conceder permiso</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {resultadoValidacion ? (
                <View style={styles.exitoContainer}>
                    <Text style={styles.exitoTitulo}>Canje Registrado</Text>
                    <Text style={styles.exitoMensaje}>{resultadoValidacion}</Text>
                    <TouchableOpacity style={styles.btnNuevoEscaneo} onPress={resetearEscaner}>
                        <Text style={styles.btnNuevoEscaneoText}>Escanear otro código</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnVolver} onPress={() => router.back()}>
                        <Text style={styles.btnVolverText}>Volver al perfil</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={escaneando ? procesarCodigoEscaneado : undefined}
                >
                    <View style={styles.overlay}>
                        <View style={styles.mascaraVisor} />
                        <Text style={styles.instruccion}>
                            Enfocá el código QR que muestra el vecino en su pantalla
                        </Text>

                        <View style={styles.manualBox}>
                            <Text style={styles.manualLabel}>O ingresá el código manualmente:</Text>
                            <View style={styles.manualRow}>
                                <TextInput
                                    style={styles.manualInput}
                                    placeholder="Ej: CCU-7KQ4-M9XH"
                                    placeholderTextColor="#94A3B8"
                                    autoCapitalize="characters"
                                    value={codigoManual}
                                    onChangeText={setCodigoManual}
                                />
                                <TouchableOpacity
                                    style={styles.manualBtn}
                                    onPress={() => validarCodigo(codigoManual)}
                                    disabled={validandoManual || !codigoManual.trim()}
                                >
                                    <Text style={styles.manualBtnText}>
                                        {validandoManual ? '...' : 'Validar'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.btnCancelar} onPress={() => router.back()}>
                            <Text style={styles.btnCancelarText}>Cerrar cámara</Text>
                        </TouchableOpacity>
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F8FAFC',
    },
    errorTitle: { fontSize: 18, fontWeight: '700', color: '#DC2626', marginBottom: 8 },
    infoText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 10, marginBottom: 16 },
    btnPermiso: {
        backgroundColor: '#1E3A8A',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    btnPermisoText: { color: '#FFFFFF', fontWeight: '700' },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
    },
    mascaraVisor: {
        width: 220,
        height: 220,
        borderWidth: 2,
        borderColor: '#38BDF8',
        backgroundColor: 'transparent',
        borderRadius: 16,
    },
    instruccion: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    manualBox: {
        width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: 12,
        borderRadius: 10,
        marginTop: 20,
    },
    manualLabel: { color: '#CBD5E1', fontSize: 12, marginBottom: 6, fontWeight: '600' },
    manualRow: { flexDirection: 'row', gap: 8 },
    manualInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '700',
    },
    manualBtn: {
        backgroundColor: '#16A34A',
        paddingHorizontal: 16,
        justifyContent: 'center',
        borderRadius: 6,
    },
    manualBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    btnCancelar: {
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    btnCancelarText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
    exitoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#F8FAFC',
    },
    exitoTitulo: { fontSize: 22, fontWeight: '800', color: '#16A34A', marginBottom: 8 },
    exitoMensaje: {
        fontSize: 15,
        color: '#334155',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    btnNuevoEscaneo: {
        backgroundColor: '#1E3A8A',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 10,
    },
    btnNuevoEscaneoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
    btnVolver: {
        paddingVertical: 10,
        width: '100%',
        alignItems: 'center',
    },
    btnVolverText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
});