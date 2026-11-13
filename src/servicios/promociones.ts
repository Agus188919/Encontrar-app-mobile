import { clienteHttp, RespuestaApi } from './api';
import { Promocion, UsoDePromocion } from '../tipos';

export type EstadoPromoFiltro = 'vigentes' | 'proximas' | 'por-vencer';

export const servicioPromociones = {

  async listar(estado: EstadoPromoFiltro = 'vigentes'): Promise<RespuestaApi<Promocion[]>> {
    return clienteHttp<Promocion[]>(`/promociones?estado=${estado}&porPagina=100`);
  },

  async generarCodigoUso(promocionId: string): Promise<RespuestaApi<UsoDePromocion>> {
    return clienteHttp<UsoDePromocion>(`/promociones/${promocionId}/usos`, {
      method: 'POST',
    });
  },

  async listarMisUsos(): Promise<RespuestaApi<UsoDePromocion[]>> {
    return clienteHttp<UsoDePromocion[]>('/yo/usos');
  },

  async validarCodigoPromocion(codigo: string): Promise<RespuestaApi<UsoDePromocion>> {
    return clienteHttp<UsoDePromocion>('/mi-comercio/usos/validar', {
      method: 'POST',
      body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }),
    });
  },
};