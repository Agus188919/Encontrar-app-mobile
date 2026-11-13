import Storage from 'expo-sqlite/kv-store';
import { clienteHttp, RespuestaApi } from './api';
import { Usuario } from '../tipos';

const KEY_USUARIO = 'usuario_sesion';

export const servicioUsuario = {
    async obtenerPerfil(): Promise<RespuestaApi<Usuario>> {
        const res = await clienteHttp<Usuario>('/yo');
        try {
            Storage.setItemSync(KEY_USUARIO, JSON.stringify(res.datos));
        } catch {
            // Se ignora
        }
        return res;
    },


    async actualizarPreferencias(datos: {
        nombre?: string;
        rubrosDeInteres?: string[];
        avisosActivos?: boolean;
    }): Promise<RespuestaApi<Usuario>> {
        const res = await clienteHttp<Usuario>('/yo', {
            method: 'PATCH',
            body: JSON.stringify(datos),
        });
        try {
            Storage.setItemSync(KEY_USUARIO, JSON.stringify(res.datos));
        } catch {
            // Se ignora
        }
        return res;
    },

    async agregarFavorito(comercioId: string): Promise<void> {
        await clienteHttp(`/yo/favoritos/${comercioId}`, {
            method: 'PUT',
        });
    },


    async quitarFavorito(comercioId: string): Promise<void> {
        await clienteHttp(`/yo/favoritos/${comercioId}`, {
            method: 'DELETE',
        });
    },
};