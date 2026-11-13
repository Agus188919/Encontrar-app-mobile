// src/hooks/useConexion.ts
import { useState, useEffect } from 'react';
import * as Network from 'expo-network';

export function useConexion() {
  const [conectado, setConectado] = useState<boolean>(true);

  useEffect(() => {
    let montado = true;

    const chequearRed = async () => {
      try {
        const estado = await Network.getNetworkStateAsync();
        if (montado) {
          setConectado(Boolean(estado.isConnected && estado.isInternetReachable !== false));
        }
      } catch (e) {
        if (montado) setConectado(false);
      }
    };

    chequearRed();
    const intervalo = setInterval(chequearRed, 5000);

    return () => {
      montado = false;
      clearInterval(intervalo);
    };
  }, []);

  return { conectado };
}