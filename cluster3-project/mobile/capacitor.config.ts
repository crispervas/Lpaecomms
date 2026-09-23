import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for the mobile storefront. appId/appName identify
// the app to iOS and Android; webDir is Vite's build output.
const config: CapacitorConfig = {
  appId: 'com.lpaecomms.mobile',
  appName: 'Lpaecomms',
  webDir: 'dist'
};

export default config;
