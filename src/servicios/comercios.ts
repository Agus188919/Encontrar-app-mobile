import { clienteHttp, RespuestaApi } from './api';
import { Comercio, Rubro } from '../tipos';

export interface FiltrosComercios {
  busqueda?: string;
  rubroId?: string;
  latitud?: number;
  longitud?: number;
  radioMetros?: number;
  orden?: 'nombre' | 'distancia' | 'puntaje';
  pagina?: number;
  porPagina?: number;
}

export const servicioComercios = {

  async obtenerRubros(): Promise<RespuestaApi<Rubro[]>> {
    return clienteHttp<Rubro[]>('/rubros');
  },

  async listar(filtros: FiltrosComercios = {}): Promise<RespuestaApi<Comercio[]>> {
    const params = new URLSearchParams();

    if (filtros.busqueda) params.append('q', filtros.busqueda);
    if (filtros.rubroId) params.append('rubroId', filtros.rubroId);
    if (filtros.latitud !== undefined) params.append('latitud', String(filtros.latitud));
    if (filtros.longitud !== undefined) params.append('longitud', String(filtros.longitud));
    if (filtros.radioMetros !== undefined) params.append('radioMetros', String(filtros.radioMetros));
    if (filtros.orden) params.append('orden', filtros.orden);
    if (filtros.pagina) params.append('pagina', String(filtros.pagina));

    params.append('porPagina', String(filtros.porPagina ?? 100));

    const query = params.toString();
    return clienteHttp<Comercio[]>(`/comercios${query ? `?${query}` : ''}`);
  },


  async obtenerPorId(id: string): Promise<RespuestaApi<Comercio>> {
    return clienteHttp<Comercio>(`/comercios/${id}`);
  },


  async obtenerPorQr(codigo: string): Promise<RespuestaApi<Comercio>> {
    return clienteHttp<Comercio>(`/comercios/qr/${encodeURIComponent(codigo)}`);
  },
};