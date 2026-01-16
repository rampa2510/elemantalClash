// firebase.config.ts - Firebase configuration
// Copy this to your src/ directory and update with your Firebase credentials

import { initializeApp } from 'firebase/app';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  try {
    connectDatabaseEmulator(database, 'localhost', 9000);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Connected to Firebase emulators');
  } catch (e) {
    console.warn('Could not connect to emulators:', e);
  }
}

// Environment variable template for .env files:
/*
.env.development:
VITE_FIREBASE_API_KEY=your-dev-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

.env.production:
VITE_FIREBASE_API_KEY=your-prod-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
*/
