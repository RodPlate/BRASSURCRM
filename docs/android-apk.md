# CRM BRASSUR — APK Android (Capacitor)

Guía rápida para compilar la app Android interna.

## Configuración

| Parámetro | Valor |
|-----------|--------|
| appId | `com.brassur.crm` |
| appName | CRM BRASSUR |
| webDir | `dist` |
| Archivo | `capacitor.config.ts` |

## Comandos

```bash
npm run build
npx cap sync android
npx cap open android
```

Atajos npm:

```bash
npm run cap:sync
npm run cap:open
npm run cap:android
```

## APK en Android Studio

1. Abrir el proyecto (ruta `android/`).
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. Salida debug: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Iconos

```bash
npm run cap:icons
npx cap sync android
```

Fuente: `public/icons/icon-512.png` (logo Brassur).

## Permisos

Definidos en `android/app/src/main/AndroidManifest.xml`:

- INTERNET
- CAMERA
- READ_MEDIA_IMAGES
- READ_EXTERNAL_STORAGE (maxSdkVersion 32)

## Firebase

La app usa el mismo SDK web (`src/firebase/firebase.js`) y Firestore `brassurcrm`. Requiere conexión a internet; variables en el build Vite (`.env` con prefijo `VITE_`).

## Relación con PWA y Hosting

- **PWA:** sigue activa en navegador (`vite-plugin-pwa`).
- **Hosting:** `firebase deploy --only hosting` sin cambios.
- **APK:** empaqueta `dist/`; no sustituye el despliegue web.
