# Justificación Técnica y Decisiones de Arquitectura
## Proyecto: Encontrar — Directorio de Comercios (Concepción del Uruguay)
### Cátedra: Desarrollo para Móviles (UNER - TUDW)

---

### 1. Patrones de Diseño y Arquitectura Aplicados

- **Capa de Servicios Desacoplada (Service Layer Pattern):**  
  *Justificación:* Ninguna pantalla de Expo Router realiza llamadas `fetch` directas ni manipula cabeceras HTTP. La comunicación con el backend (`api-directorio-comercios`) se organiza en servicios especializados (`auth.ts`, `comercios.ts`, `promociones.ts`, `resenas.ts`, `usuario.ts`, `miComercio.ts`) que delegan las peticiones en un cliente centralizado (`src/servicios/api.ts`).

- **Cliente HTTP Centralizado y Manejo Normalizado de Errores (`api.ts`):**  
  *Justificación:* `clienteHttp<T>` inyecta automáticamente el token JWT en la cabecera `Authorization: Bearer <token>`, interpreta los sobres estándar de la API (`{ datos, meta }` y `{ error: { codigo, mensaje } }`) y captura fallos de red. Esto permite que cada pantalla gestione estados explícitos de carga (`ActivityIndicator`), listas vacías (*empty states*) y reintento ante errores sin bloquear la interfaz.

- **Enrutamiento Basado en Archivos y Control por Roles (Expo Router):**  
  *Justificación:* La navegación se estructura mediante `app/_layout.tsx` (Stack raíz y listener de notificaciones) y `app/(tabs)/_layout.tsx` (navegación inferior de 4 pestañas: *Buscar*, *Promos*, *Mapa* y *Me*). La pantalla de perfil adapta dinámicamente su interfaz y permisos según el rol autenticado (`vecino` o `comercio`).

---

### 2. Estrategia de Persistencia y Seguridad

- **Almacenamiento Cifrado de Credenciales (`expo-secure-store`):**  
  *Justificación:* El token de sesión JWT (`token_sesion`) nunca se guarda en texto plano. Se resguarda en el almacén seguro del sistema operativo (Keystore en Android / Keychain en iOS) y se elimina explícitamente al cerrar sesión.

- **Preferencias de Baja Latencia (`expo-sqlite/kv-store`):**  
  *Justificación:* Se utiliza `kv-store` con lectura sincrónica (`getItemSync`) para persistir preferencias no sensibles del dispositivo —como el último rubro filtrado (`ultimo_rubro_seleccionado`) y la caché del perfil de usuario (`usuario_sesion`)—, evitando parpadeos visuales al iniciar la aplicación.

- **Autenticación Biométrica en Mostrador (`expo-local-authentication`):**  
  *Justificación:* Antes de habilitar la validación de cupones en `app/comercio/escaner.tsx`, se solicita verificación biométrica (huella dactilar o reconocimiento facial), con respaldo por credenciales del dispositivo si el hardware no está enrolado.

---

### 3. Interacción con Hardware, APIs Nativas y Lógica de Dominio

- **Cálculo Dinámico de Horarios ("Abierto ahora") (`src/utils/horarios.ts`):**  
  *Justificación:* El estado de apertura no depende de un campo estático en base de datos. Se calcula en tiempo real en el dispositivo cruzando el día y hora local contra los tramos partidos típicos de Concepción del Uruguay (ej. 08:00 a 12:00 y 16:30 a 20:30), contemplando además cierres temporales por vacaciones (`cerradoHasta`).

- **Geolocalización Defensiva (`expo-location` + `react-native-maps`):**  
  *Justificación:* Al abrir el mapa o la ficha de un local, se solicita ubicación en primer plano. Si el usuario deniega el permiso o el GPS del emulador devuelve coordenadas fuera de la zona, la aplicación aplica un *fallback* automático hacia el centro de Concepción del Uruguay (`-32.4842, -58.2335`), garantizando que el mapa siempre muestre los comercios locales.

- **Doble Uso de Cámara para Códigos QR (`expo-camera`):**  
  *Justificación:* `CameraView` cumple dos flujos reales:  
  1. **Rol Vecino:** Escaneo del QR de vidriera de un local (`CCU:com-118`) desde el directorio para abrir directamente su ficha.  
  2. **Rol Comercio:** Escaneo en mostrador del cupón generado por el cliente (`CCU-XXXX-XXXX`), con opción de ingreso manual y retroalimentación física diferenciada mediante `expo-haptics` (`Success` / `Error`).

- **Multimedia y Carga de Archivos (`expo-video`, `expo-image-picker`, `expo-image`):**  
  *Justificación:* Se emplea `useVideoPlayer` y `VideoView` (`expo-video`) con controles nativos para el video institucional de los comercios, `expo-image` para renderizado optimizado con caché, y `expo-image-picker` junto con `FormData` (`multipart/form-data` hacia `POST /archivos`) para que el comerciante suba fotos reales de su local.

- **Notificaciones Locales y Deep Linking (`expo-notifications`):**  
  *Justificación:* El usuario puede activar/desactivar alertas de promociones (`PATCH /yo`), probar recordatorios locales programados de descuentos por vencer y navegar automáticamente a la ficha del comercio al tocar una notificación desde el listener global en `app/_layout.tsx`.

---

### 4. Configuración de Entorno y Empaquetado (`eas.json` / `app.json`)

- **Variables de Entorno (`EXPO_PUBLIC_API_URL`):** Permite alternar sin modificar código entre el emulador Android (`http://10.0.2.2:3000`), pruebas en red Wi-Fi local y entornos desplegados.
- **Build Standalone Android (`eas.json`):** Configurado bajo el perfil `preview` con `buildType: "apk"` y `usesCleartextTraffic: true` (mediante `expo-build-properties`), permitiendo generar un paquete `.apk` instalable en dispositivos físicos Android para la demostración funcional.