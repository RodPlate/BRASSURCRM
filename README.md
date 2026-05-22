# CRM BRASSUR

CRM interno para proveedores de materiales metálicos reciclables.

**Stack:** React + Vite + Firebase (Auth + Firestore `brassurcrm`) + xlsx + PWA

## Fotos de visita (Firebase Storage)

- Colección `visitPhotos` + archivos en `suppliers/{supplierId}/visits/{photoId}/{fileName}`
- En la ficha del proveedor: subir varias fotos, cámara móvil (`capture="environment"`), descripción, galería y vista ampliada
- Compresión en navegador (`src/utils/imageCompression.js`): máx. 1920px, JPEG 80%, muestra tamaño original/comprimido y % de reducción
- Registro en timeline: **Foto de visita subida**

## Centro de Trabajo — Hoy (Fase 9)

- Ruta: `/hoy`
- Secciones: **Vencidos**, **Hoy** (llamadas, reuniones, visitas), **Próximos 7 días**, **Oportunidades calientes**, **Top proveedores a contactar**
- Acciones rápidas: llamada, WhatsApp, nota, actividad, ficha, marcar realizado
- Contador de tareas realizadas hoy (colección Firestore `workDayProgress`)

## Timeline (Fase 8)

- Colección Firestore: `timeline` (base `brassurcrm`)
- Historial en la **ficha del proveedor** (orden descendente por fecha)
- Registro automático: alta/edición proveedor, importación, contactos, actividades (llamada, WhatsApp, reunión, visita…), oportunidades y cambios de estado
- **Agregar nota rápida** manual
- Filtros: hoy, semana, mes, tipo, usuario

Índice compuesto requerido (`supplierId` + `date` desc). Desplegar con:

```bash
firebase deploy --only firestore:indexes
```

## Autenticación (Fase 6)

- Login con **email y contraseña** (Firebase Authentication)
- Sin sesión → pantalla de login; con sesión → CRM completo
- Topbar: email del usuario y **Cerrar sesión**
- Documentos con `createdBy`, `updatedBy`, `createdAt`, `updatedAt`

En Firebase Console: activar **Authentication → Email/Password** y crear usuarios autorizados.

## Módulos

| Ruta | Módulo |
|------|--------|
| `/` | Dashboard |
| `/hoy` | Centro de Trabajo (Hoy) |
| `/inteligencia` | Inteligencia Comercial (Fase 5) |
| `/seguimientos` | Seguimientos |
| `/proveedores` | Proveedores |
| `/importar-proveedores` | Importar Proveedores (Excel base inicial) |
| `/contactos` | Contactos |
| `/oportunidades` | Oportunidades de compra |
| `/actividades` | Actividades |
| `/calidad-datos` | Calidad de Datos |

## Fase 5 — Inteligencia Comercial

- **KPIs:** proveedores, activos, nuevos del mes, oportunidades, volúmenes, conversión
- **Ranking** con score automático (0–100) y clasificación
- **Análisis por material** (gráficos de barras)
- **Análisis geográfico** por departamento
- **Acciones recomendadas** según seguimientos, inactividad y oportunidades
- **Exportar Excel** (xlsx): proveedores, oportunidades, actividades, dashboard, reporte completo

### Score de proveedor

| Regla | Puntos |
|-------|--------|
| Activo | +20 |
| Oportunidad abierta | +15 |
| Actividad últimos 30 días | +10 |
| Prioridad alta | +10 |
| Sin actividad >90 días | −20 |
| Descartado | −30 |

Clasificación: 80+ Estratégico · 60–79 Alto potencial · 40–59 Desarrollo · 0–39 Baja prioridad

## PWA (Fase 7 — Progressive Web App)

- **vite-plugin-pwa** con `registerType: "autoUpdate"`
- Manifest: `CRM BRASSUR` / `BRASSUR CRM`, tema `#0f172a`, modo `standalone`
- Iconos: `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- Aviso **Instalar CRM BRASSUR** cuando el navegador lo permita (Android/PC); guía iOS en iPhone
- Service Worker: caché de la interfaz; **Firebase Auth y Firestore requieren conexión**

```bash
npm install
npm run icons    # Genera iconos desde public/pwa-source.svg
npm run dev      # PWA activa también en desarrollo
npm run build
firebase deploy --only hosting
```

**Instalar:** Chrome/Edge → icono de instalar en la barra de direcciones o el banner en la app. iPhone → Compartir → Añadir a pantalla de inicio.

## Configuración

```bash
cp .env.example .env
npm install
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
