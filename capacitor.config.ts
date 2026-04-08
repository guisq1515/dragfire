import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dragfire.app',
  appName: 'DragFire',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "724970175479-vjo8gincv3j166h0h1c2cef4o30rgu90.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
