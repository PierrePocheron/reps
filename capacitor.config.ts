import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pierre.reps.app',
  appName: 'Reps',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#6366f1',
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff',
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      iosClientId: '1074964811481-26v9jdrdk8l2pu3srjektdf3e2g9um2a.apps.googleusercontent.com',
      serverClientId: '1074964811481-bfuf7migh96dkgtdlsf13l4bq6uqt223.apps.googleusercontent.com', // REMPLACER PAR VOTRE "ID client Web" (Firebase Console > Authentication > Google > Web SDK configuration)
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;

