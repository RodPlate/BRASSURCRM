# CRM BRASSUR — Firebase Setup

Documentación de la configuración Firebase usada por el CRM BRASSUR (React + Vite). Los valores sensibles viven en `.env` local; no se commitean.

---

## Proyecto Firebase

| Campo | Valor |
|--------|--------|
| **Project ID** | `crm-brassur` |
| **Alias CLI** | `default` → `crm-brassur` (`.firebaserc`) |

---

## Hosting

| Campo | Valor |
|--------|--------|
| **URL producción** | https://brassurcrm.web.app |
| **Target** | `brassurcrm` |
| **Carpeta publicada** | `dist` (salida de `vite build`) |
| **SPA** | Rewrite `**` → `/index.html` |

Configuración en `firebase.json`: caché desactivada para `sw.js`, `workbox-*.js` y cabecera correcta para `manifest.webmanifest` (PWA).

---

## Servicios usados

- **Firestore** — base de datos principal (instancia nombrada, no la default)
- **Authentication** — acceso a la app
- **Storage** — fotos de visitas
- **Hosting** — despliegue del frontend

No hay Cloud Functions ni Realtime Database en este repositorio.

---

## Firestore

### Instancia (`databaseId`)

La app **no** usa la base `(default)`. En código se inicializa así:

```js
export const db = getFirestore(firebaseApp, 'brassurcrm');
```

Archivo: `src/firebase/firebase.js`.

En la consola de Firebase debe existir la base de datos con ID **`brassurcrm`**.

### Colecciones actuales

| Colección | Uso |
|-----------|-----|
| `suppliers` | Proveedores / fichas |
| `contacts` | Contactos |
| `activities` | Actividades comerciales |
| `purchaseOpportunities` | Oportunidades de compra |
| `timeline` | Historial unificado por proveedor |
| `visitPhotos` | Bandeja y galería de fotos de visita |
| `workDayProgress` | Progreso del día (módulo «Hoy») |

### Índices compuestos

Definidos en `firestore.indexes.json`. Desplegar cuando cambien consultas o aparezca el error de índice faltante:

```bash
firebase deploy --only firestore:indexes
```

Índices configurados:

- `timeline`: `supplierId` + `date` (desc)
- `visitPhotos`: `supplierId` + `uploadedAt` (desc)
- `visitPhotos`: `status` + `uploadedAt` (desc)
- `visitPhotos`: `supplierId` + `status` + `uploadedAt` (desc)

---

## Authentication

- **Proveedor:** Email + contraseña
- **Uso en app:** `getAuth(firebaseApp)` en `src/firebase/firebase.js`
- Los usuarios deben crearse en Firebase Console → Authentication (o flujo que use el equipo)

Sin proveedores sociales ni anónimo en el código actual.

---

## Storage

Uso principal: **fotos de visitas** (compresión en cliente, subida resumable).

### Rutas

| Estado | Ruta |
|--------|------|
| Pendiente de asignar | `suppliers/unassigned/{photoId}/{fileName}` |
| Asignada a proveedor | `suppliers/{supplierId}/visits/{photoId}/{fileName}` |

Lógica en `src/services/visitPhotosService.js`. La asignación actualiza **solo Firestore** (no mueve el archivo en Storage) para evitar bloqueos en la bandeja.

### Colección vinculada

Documentos en `visitPhotos` con campos como `storagePath`, `url`, `status`, `supplierId`, `uploadedAt`, etc.

---

## Variables de entorno (Vite)

Copiar `.env.example` a `.env` en la raíz del proyecto y completar con los valores del proyecto **crm-brassur** (Firebase Console → Configuración del proyecto → Tus apps → SDK web).

| Variable | Descripción |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Suele ser `{projectId}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `crm-brassur` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket de Storage (p. ej. `{projectId}.firebasestorage.app`) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

Ejemplo de plantilla (sin valores reales):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Tras cambiar `.env`, reiniciar `npm run dev`.

---

## Deploy

### Requisitos

- Node.js y dependencias (`npm install`)
- Firebase CLI (`npm i -g firebase-tools` o `npx firebase`)
- Sesión: `firebase login`
- Proyecto activo: `firebase use crm-brassur`

### Hosting (frontend)

```bash
npm run build
firebase deploy --only hosting
```

`prebuild` genera iconos PWA antes del build.

### Solo índices Firestore

```bash
firebase deploy --only firestore:indexes
```

### Archivos relevantes

| Archivo | Rol |
|---------|-----|
| `.firebaserc` | Proyecto `crm-brassur`, target hosting `brassurcrm` |
| `firebase.json` | Hosting → `dist`, headers PWA, rewrites SPA |
| `firestore.indexes.json` | Índices compuestos |

---

## Solución de errores comunes

### Pantalla en «Cargando…» sin fin

**Causa habitual:** varias suscripciones a Firestore y un contador de «listo» que no marca todas las fuentes como cargadas.

**Qué hacer:** en la página afectada, asegurar que cada `onSnapshot` / subscribe llame a `onReady` o `setLoading(false)` también en el callback de **error**. Revisar consola del navegador.

---

### `FirebaseError: The query requires an index`

**Causa:** falta un índice compuesto en la instancia `brassurcrm`.

**Qué hacer:**

1. Abrir el enlace del error en la consola (crea el índice) **o**
2. Añadir el índice en `firestore.indexes.json` y ejecutar:

   ```bash
   firebase deploy --only firestore:indexes
   ```

3. Esperar a que el índice pase a estado **Enabled** (puede tardar minutos).

---

### Bandeja de fotos vacía o sin actualizar

**Comprobar:**

- Usuario autenticado (reglas de Storage/Firestore en consola).
- Documentos en `visitPhotos` con `status` acorde (p. ej. pendiente de asignar).
- Índices de `visitPhotos` desplegados (consultas con `where` + `orderBy`).
- Consola: logs `[Fotos]` en `visitPhotosService.js`.

---

### Subida o vista de foto falla (`storage/unauthorized`, URL vacía)

**Causas frecuentes:**

- `fileName` vacío → ruta Storage inválida. El proyecto usa `safeFileName` / `resolvePhotoFileName` en `imageCompression.js`.
- Reglas de Storage que no permiten escritura/lectura al path `suppliers/...`.
- `.env` incompleto o `VITE_FIREBASE_STORAGE_BUCKET` incorrecto.

**Qué hacer:** verificar reglas en Firebase Console y que `storagePath` en Firestore coincida con el archivo subido.

---

### «Asignando…» infinito al asignar foto

**Causa histórica:** intentar mover el archivo en Storage (`getBytes` + re-upload) durante la asignación.

**Comportamiento actual:** la asignación actualiza metadatos en Firestore y timeline; **no** mueve el blob en Storage. Si persiste el problema, revisar red, reglas y errores en consola en `assignPhotoToSupplier`.

---

### `auth/invalid-credential` o no entra tras deploy

- Confirmar Email/Password habilitado en Authentication.
- Usuario existente en el mismo proyecto `crm-brassur`.
- `VITE_FIREBASE_AUTH_DOMAIN` y `VITE_FIREBASE_PROJECT_ID` alineados con la consola.

---

### Build local OK pero producción muestra app en blanco o rutas 404

- Deploy debe usar `firebase deploy --only hosting` tras `npm run build`.
- Hosting debe servir `dist` con rewrite SPA (`firebase.json` ya lo define).
- Hard refresh o limpiar caché del service worker si se ve una versión antigua.

---

### Variables `undefined` en runtime

Todas las claves Firebase deben llevar prefijo `VITE_` para que Vite las exponga. Sin `.env`, `import.meta.env.VITE_*` será `undefined` y Firebase fallará al iniciar.

---

## Referencia rápida

```text
Proyecto:     crm-brassur
Hosting:      https://brassurcrm.web.app
Firestore DB: brassurcrm
Auth:         Email + Password
Deploy:       npm run build && firebase deploy --only hosting
Índices:      firebase deploy --only firestore:indexes
```
