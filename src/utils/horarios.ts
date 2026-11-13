// src/utils/horarios.ts
import { Horario } from '../tipos';

export interface EstadoHorario {
  abierto: boolean;
  mensaje: string; // Ej: "Abierto - cierra 12:00" o "Cerrado - abre 16:30"
}

/**
 * Convierte "HH:mm" a minutos desde las 00:00 para comparaciones numéricas directas.
 */
function horaAMinutos(horaStr: string): number {
  const [horas, minutos] = horaStr.split(':').map(Number);
  return horas * 60 + minutos;
}

/**
 * Evalúa si un comercio está abierto en este instante según sus tramos horarios.
 */
export function estaAbiertoAhora(horarios: Horario[], fechaReferencia: Date = new Date()): EstadoHorario {
  if (!horarios || horarios.length === 0) {
    return { abierto: false, mensaje: 'Cerrado temporalmente' };
  }

  const diaActual = fechaReferencia.getDay() as Horario['dia']; // 0 = Domingo, 1 = Lunes, etc.
  const minutosActuales = fechaReferencia.getHours() * 60 + fechaReferencia.getMinutes();

  // Filtrar tramos del día de hoy ordenados cronológicamente
  const tramosHoy = horarios
    .filter((h) => h.dia === diaActual)
    .sort((a, b) => horaAMinutos(a.abre) - horaAMinutos(b.abre));

  if (tramosHoy.length === 0) {
    return { abierto: false, mensaje: 'Cerrado hoy' };
  }

  // 1. Verificar si está dentro de algún tramo actual
  for (const tramo of tramosHoy) {
    const minAbre = horaAMinutos(tramo.abre);
    const minCierra = horaAMinutos(tramo.cierra);

    if (minutosActuales >= minAbre && minutosActuales < minCierra) {
      return {
        abierto: true,
        mensaje: `Abierto - cierra ${tramo.cierra}`,
      };
    }
  }

  // 2. Si no está en un tramo, ver si abre más tarde hoy
  const proximoTramoHoy = tramosHoy.find((t) => horaAMinutos(t.abre) > minutosActuales);
  if (proximoTramoHoy) {
    return {
      abierto: false,
      mensaje: `Cerrado - abre ${proximoTramoHoy.abre}`,
    };
  }

  // 3. Ya cerró por hoy
  return {
    abierto: false,
    mensaje: 'Cerrado hasta mañana',
  };
}