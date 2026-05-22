# CRM BRASSUR

CRM web interno para **BRASSUR**: gestión comercial de proveedores de materiales metálicos reciclables (chatarra, hierro, aluminio, cobre, inox, etc.). Centraliza proveedores, contactos, oportunidades de compra, actividades de seguimiento, inteligencia comercial y fotos de visita en campo.

---

## ¿Qué resuelve?

- Registrar y priorizar **proveedores** con ficha completa (ubicación, rubro, materiales, volumen estimado, estado comercial).
- Gestionar **contactos** vinculados a cada proveedor.
- Seguir **oportunidades de compra** (material, volumen, precios, fechas, negociación).
- Registrar **actividades** (llamadas, WhatsApp, reuniones, visitas, email).
- Ver **seguimientos** agrupados por vencidos, hoy y próximos 7 días.
- Trabajar el día a día desde **Hoy** (centro de trabajo con acciones rápidas).
- Analizar el negocio en **Inteligencia Comercial** (KPIs, ranking, materiales, geografía, recomendaciones).
- Mejorar datos con **Calidad de Datos** (duplicados, completitud, score, sugerencias).
- Capturar **fotos de visita** en campo (PWA + móvil), asignarlas después al proveedor correcto.
- Mantener un **timeline** auditable por proveedor de todo lo que ocurre en el CRM.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 8 |
| Enrutamiento | React Router 7 |
| Backend / datos | Firebase (Auth, Firestore, Storage, Hosting) |
| Base Firestore | `brassurcrm` (`getFirestore(app, "brassurcrm")`) |
| Excel | `xlsx` (importación y exportación) |
| PWA | `vite-plugin-pwa` + Service Worker |
| Estilos | CSS modular por módulo |

---

## Arquitectura general

```
Usuario (navegador / PWA instalada)
        │
        ▼
   Firebase Auth (email/contraseña)
        │
        ▼
   React SPA ──► Firestore (brassurcrm)
              └──► Storage (fotos)
              └──► Hosting (dist/)
```

- **Sin sesión** → pantalla de login.
- **Con sesión** → layout con sidebar, topbar (usuario + cerrar sesión) y módulos.
- **Cierre por inactividad** (~6 h) y datos de auditoría en altas/ediciones (`createdBy`, `updatedBy`, timestamps).

---

## Módulos y rutas

| Ruta | Módulo | Descripción |
|------|--------|-------------|
| `/` | **Dashboard** | Resumen: proveedores, contactos, actividades, oportunidades, seguimientos urgentes, fotos pendientes. |
| `/fotos` | **Bandeja de Fotos** | Tomar/subir fotos sin proveedor; asignar después. Solo muestra pendientes. |
| `/hoy` | **Centro de Trabajo (Hoy)** | Vencidos, hoy, próximos 7 días, oportunidades calientes, top proveedores; acciones rápidas. |
| `/proveedores` | **Proveedores** | Alta, edición, ficha con contactos, oportunidades, actividades, timeline y fotos asignadas. |
| `/importar-proveedores` | **Importar Proveedores** | Carga masiva desde Excel (base inicial). |
| `/contactos` | **Contactos** | Personas de contacto por proveedor. |
| `/oportunidades` | **Oportunidades de compra** | Pipeline de negociación y compras estimadas. |
| `/actividades` | **Actividades** | Llamadas, visitas, reuniones, etc. |
| `/seguimientos` | **Seguimientos** | Vista unificada de fechas de seguimiento y compras. |
| `/inteligencia` | **Inteligencia Comercial** | KPIs, ranking, gráficos, acciones recomendadas, export Excel. |
| `/calidad-datos` | **Calidad de Datos** | Duplicados, completitud, score, tiers y mejoras sugeridas. |

---

## Colecciones Firestore (principal)

| Colección | Uso |
|-----------|-----|
| `suppliers` | Proveedores (razón social, ubicación, rubro, materiales, volumen, estado, prioridad, score calidad). |
| `contacts` | Contactos por `supplierId`. |
| `activities` | Interacciones comerciales. |
| `purchaseOpportunities` | Oportunidades de compra. |
| `timeline` | Historial por proveedor (automático + notas rápidas). |
| `visitPhotos` | Fotos de visita (pendientes o asignadas a proveedor). |
| `workDayProgress` | Contador de tareas realizadas en **Hoy** por usuario y día. |

### Fotos de visita (`visitPhotos`)

**Estados:**

- `Pendiente de asignar` — en bandeja (`/fotos`), `supplierId` vacío.
- `Asignada` — visible en ficha del proveedor.

**Storage:**

- Pendientes: `suppliers/unassigned/{photoId}/{fileName}`
- Asignadas (referencia en doc): ruta original en Storage; la asignación actualiza solo Firestore (sin mover archivo).

**Flujo:**

1. En **Bandeja de Fotos** o en ficha: tomar foto (cámara) o elegir galería.
2. Compresión en navegador (`src/utils/imageCompression.js`): máx. 1920 px, JPEG 80 %, sin EXIF.
3. Vista previa → subida con `uploadBytesResumable` y barra de progreso.
4. Asignar proveedor desde bandeja → desaparece de pendientes y aparece en ficha.
5. Timeline: foto subida, foto asignada, foto eliminada.

**Campos principales:** `url`, `storagePath`, `fileName`, `caption`, `originalSize`, `compressedSize`, `compressionRatio`, `uploadedAt`, `uploadedBy`, `assignedAt`, `assignedBy`.

---

## Centro de Trabajo — Hoy

- **Vencidos** — seguimientos con fecha pasada.
- **Hoy** — seguimientos, llamadas, reuniones, visitas, WhatsApp del día.
- **Próximos 7 días** — planificación semanal.
- **Oportunidades calientes** — negociando + prioridad alta + sin actividad reciente.
- **Top proveedores a contactar** — scoring por volumen, oportunidades abiertas e inactividad.

**Acciones rápidas:** llamada, WhatsApp, nota en timeline, nueva actividad, abrir ficha, marcar realizado.

**Progreso del día:** colección `workDayProgress` (por usuario y fecha).

---

## Timeline

- Historial en la **ficha del proveedor** (más reciente primero).
- Registro automático al crear/editar proveedor, importar, contactos, actividades, oportunidades, fotos y cambios de estado.
- **Nota rápida** manual desde la ficha.
- Filtros: hoy, semana, mes, tipo de evento, usuario.

---

## Inteligencia Comercial

- **KPIs:** totales, activos, nuevos del mes, oportunidades abiertas/ganadas, volumen potencial/ganado, tasa de conversión.
- **Ranking de proveedores** con score 0–100 y clasificación (Estratégico, Alto potencial, Desarrollo, Baja prioridad).
- **Análisis por material** (gráficos de barras).
- **Análisis geográfico** por departamento.
- **Acciones recomendadas** (urgente, alta, media) según seguimientos y oportunidades.
- **Exportar Excel:** proveedores, oportunidades, actividades, dashboard, reporte completo.

### Reglas del score de proveedor (resumen)

| Regla | Puntos |
|-------|--------|
| Estado Activo | +20 |
| Oportunidad abierta | +15 |
| Actividad últimos 30 días | +10 |
| Prioridad Alta | +10 |
| Sin actividad > 90 días | −20 |
| Descartado | −30 |

| Score | Clasificación |
|-------|----------------|
| 80+ | Estratégico |
| 60–79 | Alto potencial |
| 40–59 | Desarrollo |
| 0–39 | Baja prioridad |

---

## Calidad de Datos

- Detección de **duplicados** (nombre similar, mismo teléfono, mismo contacto).
- **Completitud** por proveedor (% campos clave).
- **Score y tier** A–D con sugerencias de mejora (materiales inferidos, rubro, etc.).
- **Aplicar mejoras** y **confirmar cambios** en Firestore por lotes.

---

## Seguimientos

Unifica fechas de:

- `suppliers.nextFollowUpDate`
- `activities.nextFollowUpDate`
- `purchaseOpportunities.expectedPurchaseDate`

Agrupa en: **vencidos**, **hoy**, **próximos 7 días**, **futuros**. Filtros por proveedor, tipo, estado y prioridad.

---

## Importar Proveedores

- Lectura de Excel (plantilla compatible con columna de empresa / razón social).
- Vista previa, detección de duplicados y errores por fila.
- Escritura por lotes en `suppliers` con registro en timeline.

---

## Autenticación y seguridad

- Login con **email y contraseña** (Firebase Authentication).
- Solo usuarios creados en Firebase Console pueden entrar.
- Reglas Firestore/Storage: acceso con `request.auth != null` (configurar en consola del proyecto).
- La app no funciona offline para datos de negocio (Auth y Firestore requieren red).

**En Firebase Console:**

1. Activar **Authentication → Email/Password**.
2. Crear usuarios del equipo.
3. Desplegar reglas e índices según el proyecto.

---

## PWA (aplicación instalable)

- Instalable en Android, PC (Chrome/Edge) e iPhone (Añadir a pantalla de inicio).
- Iconos en `public/icons/` (generados con `npm run icons`).
- Service Worker cachea la interfaz; datos en tiempo real vienen de Firebase.
- Banner **Instalar CRM BRASSUR** cuando el navegador lo permite.
- Ideal para **fotos en visita** con cámara del celular (`capture="environment"`).

---

## Configuración local

### Requisitos

- Node.js 18+
- Cuenta Firebase con proyecto configurado
- Variables de entorno en `.env` (copiar desde `.env.example`)

### Variables de entorno

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Instalación y desarrollo

```bash
cp .env.example .env
# Editar .env con las credenciales del proyecto Firebase

npm install
npm run dev
```

Abrir la URL que muestra Vite (por defecto `http://localhost:5173`).

### Generar iconos PWA

```bash
npm run icons
```

Usa `public/pwa-source.svg` y escribe en `public/icons/`.

---

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (PWA activa en dev). |
| `npm run build` | Build de producción en `dist/` (genera iconos antes). |
| `npm run preview` | Previsualizar el build local. |
| `npm run icons` | Regenerar iconos PWA. |
| `npm run lint` | ESLint. |

---

## Despliegue

### Hosting (Firebase)

```bash
npm run build
firebase deploy --only hosting
```

El `firebase.json` apunta `public` a `dist/` y reescribe rutas al SPA.

### Índices Firestore (obligatorio para varias pantallas)

```bash
firebase deploy --only firestore:indexes
```

Índices definidos en `firestore.indexes.json`:

- `timeline`: `supplierId` + `date` (desc)
- `visitPhotos`: `status` + `uploadedAt` (desc) — bandeja
- `visitPhotos`: `supplierId` + `uploadedAt` (desc) — legacy
- `visitPhotos`: `supplierId` + `status` + `uploadedAt` (desc) — ficha proveedor

Si una pantalla muestra error de índice, desplegar índices y esperar a que Firebase termine de crearlos.

---

## Estructura del proyecto (resumen)

```
src/
├── App.jsx                 # Rutas y protección por auth
├── firebase/firebase.js    # App, Auth, Firestore (brassurcrm), Storage
├── context/AuthContext.jsx
├── pages/                  # Una carpeta por módulo
├── components/             # UI compartida, layout, PWA
├── services/               # Acceso Firestore (suppliers, photos, timeline…)
├── utils/                  # Lógica de negocio (followUps, intelligence, compresión…)
└── constants/              # Rutas, enums, estados de fotos
public/
├── icons/                  # PWA
scripts/
└── generate-pwa-icons.mjs
```

---

## Flujo recomendado para el equipo

1. **Importar** proveedores base desde Excel.
2. Revisar **Calidad de Datos** (duplicados y completitud).
3. Registrar **contactos** y **oportunidades** en fichas clave.
4. Usar **Hoy** y **Seguimientos** para la rutina diaria.
5. Subir fotos en **Bandeja de Fotos** en visita y **asignar** al volver.
6. Consultar **Inteligencia** para priorizar compras y exportar reportes.

---

## Notas

- La base de datos nombrada `brassurcrm` debe existir en el proyecto Firebase (Firestore multi-database) o configurarse según la consola.
- No subir `.env` al repositorio; contiene claves del cliente Firebase.
- Para soporte de índices o reglas, revisar los mensajes en consola del navegador (`[Fotos]`, `[Calidad]`, etc.).

---

**CRM BRASSUR** — Gestión comercial de proveedores de materiales reciclables.
