export const ADS_CONFIG = {
  // Master toggle pour activer/désactiver les publicités globalement
  ENABLED: true,

  // Configuration AdSense (Web)
  ADSENSE: {
    CLIENT_ID: 'ca-pub-1431137074985627',
    TEST_MODE: import.meta.env.DEV, // En dev, on évite de charger les vraies pubs ou on met un mode test
  },

  // Configuration AdMob (Mobile)
  ADMOB: {
    // Remplacer par vos vrais IDs de production
    ANDROID_APP_ID: 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',
    IOS_APP_ID: 'ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy',

    // Banner IDs
    BANNER_ID_ANDROID: 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz',
    BANNER_ID_IOS: 'ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz',

    TEST_DEVICE_ID: '2077ef9a63d2b398840261c8221a0c9b'
  }
};
