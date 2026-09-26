import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configuration for the mobile storefront. appId/appName identify
// the app to iOS and Android; webDir is Vite's build output.
const config: CapacitorConfig = {
  appId: 'com.lpaecomms.mobile',
  appName: 'Lpaecomms',
  webDir: 'dist',
  plugins: {
    // The native launch screen alone vanishes as soon as the web view paints,
    // which on a real device is too fast to see. The plugin keeps the same
    // Splash image up for a fixed time, then fades it out.
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#14161a',
      showSpinner: false
    }
  }
};

export default config;
