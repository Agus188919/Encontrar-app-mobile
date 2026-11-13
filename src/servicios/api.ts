import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

export interface RespuestaApi<T> {
    datos: T;
    meta: {
        total: number;
        pagina: number;
        porPagina: number;
    } | null;
}

export interface ErrorApi {
    error: {
        codigo: string;
        mensaje: string;
    };
}

export async function clienteHttp<T>(
    endpoint: string,
    opciones: RequestInit = {}
): Promise<RespuestaApi<T>> {
    let token: string | null = null;
    try {
        token = await SecureStore.getItemAsync('token_sesion');
    } catch {
        token = null;
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(opciones.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const respuesta = await fetch(`${BASE_URL}${endpoint}`, {
            ...opciones,
            headers,
        });

        if (respuesta.status === 204) {
            return { datos: null as unknown as T, meta: null };
        }

        const cuerpo = await respuesta.json();

        if (!respuesta.ok) {
            throw cuerpo as ErrorApi;
        }

        return cuerpo as RespuestaApi<T>;
    } catch (err: any) {
        if (err?.error?.mensaje) {
            throw err;
        }
        throw {
            error: {
                codigo: 'FALLO_CONEXION',
                mensaje: 'No pudimos conectar con el servidor. Verificá tu conexión.',
            },
        } satisfies ErrorApi;
    }
}