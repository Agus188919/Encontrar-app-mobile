// src/servicios/errorHandler.ts
import { Alert } from 'react-native';
import { AppError } from '../errores/AppError';

export function manejarError(error: unknown): void {
  if (error instanceof AppError) {
    Alert.alert('Atención', error.mensajeUsuario);
    return;
  }
  
  // Fallback si no fue capturado
  Alert.alert('Error inesperado', 'Ocurrió un problema de comunicación. Intentá de nuevo.');
  console.error('[UnhandledError]:', error);
}