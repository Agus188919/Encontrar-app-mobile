# Encontrar — Directorio de Comercios de Concepción del Uruguay

Aplicación móvil desarrollada con **React Native**, **Expo Router** y **TypeScript** para la cátedra **Desarrollo para Móviles (UNER - TUDW)**. Permite a los vecinos explorar comercios locales, filtrar por rubro o producto, ubicar locales en el mapa, dejar reseñas y generar cupones QR, mientras que los comerciantes gestionan su ficha, fotos y validación de descuentos en mostrador.

## Requisitos previos

- **Node.js** 20+
- **API Backend** (`api-directorio-comercios`) ejecutándose con PostgreSQL en el puerto `3000`.
- **Expo Go** en dispositivo físico o **Android Studio Emulator**.

## Instalación y ejecución

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno copiando `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
   - Para emulador Android: `EXPO_PUBLIC_API_URL=[http://10.0.2.2:3000](http://10.0.2.2:3000)`
   - Para teléfono físico en la misma red Wi-Fi: `EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3000`

3. Iniciar el servidor de desarrollo:
   ```bash
   npx expo start
   ```

## Estructura del proyecto

- `app/_layout.tsx`: Navegación raíz (Stack) y listener global de notificaciones.
- `app/(tabs)/`: Pantallas principales (*Buscar*, *Promos*, *Mapa*, *Me*).
- `app/comercio/[id].tsx`: Ficha pública del comercio (horarios dinámicos, favoritos, promociones, reseñas, ubicación y video).
- `app/comercio/escaner.tsx`: Validación de cupones QR y manual en mostrador con autenticación biométrica.
- `src/servicios/`: Capa de acceso a la API (`api.ts`, `auth.ts`, `comercios.ts`, `promociones.ts`, `resenas.ts`, `usuario.ts`, `miComercio.ts`).
- `src/utils/`: Cálculo dinámico de horarios (`horarios.ts`) y etiquetas de productos (`productos.ts`).

## Cuentas de prueba (Base de datos sembrada)

- **Rol Vecino:** `marta@mail.com` / `demo1234` (también admite registro de nuevos vecinos desde la pestaña *Me*).
- **Rol Comercio:** `tornillo@demo.ar` / `demo1234` (asociado al comercio `com-118`, QR `CCU:com-118`).

## Documentación técnica

- Las decisiones de arquitectura, seguridad, persistencia y uso de APIs nativas se detallan en [`decisiones_tecnicas.md`](./decisiones_tecnicas.md).