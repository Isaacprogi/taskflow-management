import type { CapacitorConfig } from '@capacitor/cli';

// npm scripts set CAP_ENV. Anything but "production" is treated as development.
const isDev = process.env.CAP_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.taskflow', // permanent identity on the stores: change it NOW
  appName: 'TaskFlow',
  webDir: 'dist',
  android: {
    // Dev only: lets the https://localhost WebView call http://10.0.2.2. Always false for release.
    allowMixedContent: isDev,
  },
};

export default config;
