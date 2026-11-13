import { clienteHttp, RespuestaApi } from './api';
import { Resena } from '../tipos';

export const servicioResenas = {

  async listarPorComercio(comercioId: string): Promise<RespuestaApi<Resena[]>> {
    return clienteHttp<Resena[]>(`/comercios/${comercioId}/resenas?porPagina=50`);
  },


  async crearResena(
    comercioId: string,
    estrellas: 1 | 2 | 3 | 4 | 5,
    comentario: string
  ): Promise<RespuestaApi<Resena>> {
    return clienteHttp<Resena>(`/comercios/${comercioId}/resenas`, {
      method: 'POST',
      body: JSON.stringify({
        estrellas,
        comentario: comentario.trim(),
      }),
    });
  },


  async editarResena(
    resenaId: string,
    estrellas: 1 | 2 | 3 | 4 | 5,
    comentario: string
  ): Promise<RespuestaApi<Resena>> {
    return clienteHttp<Resena>(`/resenas/${resenaId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        estrellas,
        comentario: comentario.trim(),
      }),
    });
  },


  async eliminarResena(resenaId: string): Promise<void> {
    await clienteHttp<void>(`/resenas/${resenaId}`, {
      method: 'DELETE',
    });
  },


  async reportarResena(resenaId: string): Promise<void> {
    await clienteHttp(`/resenas/${resenaId}/reportes`, {
      method: 'POST',
    });
  },


  async responderResena(
    resenaId: string,
    respuestaTexto: string
  ): Promise<RespuestaApi<Resena>> {
    return clienteHttp<Resena>(`/resenas/${resenaId}/respuesta`, {
      method: 'POST',
      body: JSON.stringify({
        respuesta: respuestaTexto.trim(),
      }),
    });
  },
};