# Variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Firebase Configuration
# Récupérez ces valeurs depuis la console Firebase : https://console.firebase.google.com
# Allez dans Project Settings > General > Your apps

VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Environment
VITE_APP_ENV=development
```

## Comment obtenir vos clés Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez votre projet (ou créez-en un nouveau)
3. Cliquez sur l'icône d'engrenage ⚙️ > **Project Settings**
4. Dans l'onglet **General**, faites défiler jusqu'à **Your apps**
5. Si vous n'avez pas encore d'app web, cliquez sur **Add app** > **Web** (</>)
6. Copiez les valeurs de configuration et collez-les dans votre fichier `.env`

## Sécurité

⚠️ **Important** : Ne commitez jamais votre fichier `.env` dans Git. Il est déjà dans `.gitignore`.

Pour la production, configurez les variables d'environnement directement dans votre plateforme de déploiement (Firebase Hosting, Vercel, Netlify, etc.).

