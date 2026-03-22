import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liminal.adhd',
  appName: 'Liminal',
  webDir: 'frontend/.next-clean',
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#F3F4F6',
    },
  },
  server: {
    // Allow connections to the backend API
    allowNavigation: ['*'],
  },
};

export default config;
