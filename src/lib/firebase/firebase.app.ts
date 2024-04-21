import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Your firebase client SDK config goes here
 */
const FIREBASE_CONFIG_SDK = import.meta.env.VITE_FIREBASE_CONFIG_SDK;
const firebaseConfig = JSON.parse(FIREBASE_CONFIG_SDK ?? '{}');

let firebaseApp: FirebaseApp | undefined;
// create singleton of firebase client app
if (!getApps().length) {
	firebaseApp = initializeApp(firebaseConfig);
} else {
	firebaseApp = getApps()[0];
}

const firebaseAuth = getAuth(firebaseApp);

// export the firebase app
export { firebaseApp, firebaseAuth };
