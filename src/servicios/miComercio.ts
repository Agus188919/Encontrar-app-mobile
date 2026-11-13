import { clienteHttp, RespuestaApi } from './api';
import { Comercio, Promocion } from '../tipos';

export interface ComercioPropio extends Comercio {
    cerradoHasta?: string | null;
}

export interface CrearPromocionInput {
    titulo: string;
    detalle: string;
    descuento: number | null;
    desde: string;
    hasta: string;
    soloApp: boolean;
}

export const servicioMiComercio = {
    async obtener(): Promise<RespuestaApi<ComercioPropio>> {
        return clienteHttp<ComercioPropio>('/mi-comercio');
    },

    async actualizar(datos: {
        descripcion?: string;
        telefono?: string | null;
        whatsapp?: string | null;
        cerradoHasta?: string | null;
    }): Promise<RespuestaApi<ComercioPropio>> {
        return clienteHttp<ComercioPropio>('/mi-comercio', {
            method: 'PATCH',
            body: JSON.stringify(datos),
        });
    },

    async listarPromociones(): Promise<RespuestaApi<Promocion[]>> {
        return clienteHttp<Promocion[]>('/mi-comercio/promociones?porPagina=50');
    },

    async crearPromocion(datos: CrearPromocionInput): Promise<RespuestaApi<Promocion>> {
        return clienteHttp<Promocion>('/mi-comercio/promociones', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },

    async darDeBajaPromocion(id: string): Promise<void> {
        await clienteHttp<void>(`/mi-comercio/promociones/${id}`, {
            method: 'DELETE',
        });
    },
};