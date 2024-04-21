//Import Firebase Admin Service Account with $env functionality in Svelte
import { FIREBASE_ADMIN_KEY } from '$env/static/private';
//Import firebase admin SDK
import admin from 'firebase-admin';

let firebaseAdmin: admin.app.App;
let firebaseAdminAuth: admin.auth.Auth;
/**
 * create firebase admin singleton
 */
export function getFirebaseAdmin(): admin.app.App {
	if (!firebaseAdmin) {
		if (admin.apps.length == 0) {
			const adminKey = FIREBASE_ADMIN_KEY;
			firebaseAdmin = admin.initializeApp({
				credential: admin.credential.cert(JSON.parse(adminKey))
			});
		} else {
			firebaseAdmin = admin.apps[0]!;
		}
	}

	return firebaseAdmin;
}
/**
 * create firebase admin auth singleton
 */
export function getFirebaseAdminAuth(): admin.auth.Auth {
	const currentAdmin: admin.app.App = getFirebaseAdmin();
	if (!firebaseAdminAuth) {
		firebaseAdminAuth = currentAdmin.auth();
	}
	return firebaseAdminAuth;
}
