// src/utils/distancia.ts
import { Coordenadas } from '../tipos';

/**
 * Radio de la Tierra en kilómetros.
 */
const RADIO_TIERRA_KM = 6371;

/**
 * Convierte grados sexagesimales a radianes.
 */
function gradosARadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Calcula la distancia ortodrómica en kilómetros entre dos pares de coordenadas
 * utilizando la fórmula de Haversine.
 */
export function calcularDistanciaKm(origen: Coordenadas, destino: Coordenadas): number {
  const dLat = gradosARadianes(destino.latitud - origen.latitud);
  const dLon = gradosARadianes(destino.longitud - origen.longitud);

  const lat1 = gradosARadianes(origen.latitud);
  const lat2 = gradosARadianes(destino.latitud);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return RADIO_TIERRA_KM * c;
}

/**
 * Formatea la distancia calculada para mostrar al usuario en la interfaz.
 * Ejemplo: 350 m o 1.4 km
 */
export function formatearDistancia(distanciaKm: number): string {
  if (distanciaKm < 1) {
    const metros = Math.round(distanciaKm * 1000);
    return `a ${metros} m`;
  }
  return `a ${distanciaKm.toFixed(1)} km`;
}