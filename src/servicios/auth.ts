import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import { clienteHttp } from './api';
import { Usuario } from '../tipos';

const KEY_TOKEN = 'token_sesion';
const KEY_USUARIO = 'usuario_sesion';

export interface RespuestaIngreso {
  token: string;
  usuario: Usuario;
}

export const servicioAuth = {
  async ingresar(email: string, clave: string): Promise<Usuario> {
    const res = await clienteHttp<RespuestaIngreso>('/auth/ingreso', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        contrasena: clave,
      }),
    });

    const { token, usuario } = res.datos;

    await SecureStore.setItemAsync(KEY_TOKEN, token);

    try {
      Storage.setItemSync(KEY_USUARIO, JSON.stringify(usuario));
    } catch {
      // Si falla, no bloqueamos el inicio de sesión
    }

    return usuario;
  },


  async registrar(nombre: string, email: string, clave: string): Promise<Usuario> {
    const res = await clienteHttp<any>('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        contrasena: clave,
      }),
    });

    if (res.datos?.token && res.datos?.usuario) {
      await SecureStore.setItemAsync(KEY_TOKEN, res.datos.token);
      try {
        Storage.setItemSync(KEY_USUARIO, JSON.stringify(res.datos.usuario));
      } catch {
        // Se ignora
      }
      return res.datos.usuario as Usuario;
    }

    return this.ingresar(email, clave);
  },


  async obtenerSesionActual(): Promise<Usuario | null> {
    try {
      const token = await SecureStore.getItemAsync(KEY_TOKEN);
      if (!token) return null;

      const usuarioGuardado = Storage.getItemSync(KEY_USUARIO);
      if (usuarioGuardado) {
        return JSON.parse(usuarioGuardado) as Usuario;
      }

      const res = await clienteHttp<Usuario>('/yo');
      Storage.setItemSync(KEY_USUARIO, JSON.stringify(res.datos));
      return res.datos;
    } catch {
      await this.cerrarSesion();
      return null;
    }
  },


  async cerrarSesion(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY_TOKEN);
    } catch {
      // Se ignora
    }
    try {
      Storage.removeItemSync(KEY_USUARIO);
    } catch {
      // Se ignora
    }
  },
};