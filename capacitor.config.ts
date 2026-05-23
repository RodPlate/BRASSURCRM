import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brassur.crm',
  appName: 'CRM BRASSUR',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  server: {
    // Contexto seguro para Firebase Auth / Storage en WebView
    androidScheme: 'https',
  },
};

export default config;
