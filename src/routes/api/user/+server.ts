import { getFirebaseAdminAuth, getFirebaseAdminStore } from '$lib/firebase/firebase.admin';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export async function POST(request: RequestEvent) {
	console.log('create new user');
	const { email, password, name, phone } = await request.request.json();
	try {
		const auth = getFirebaseAdminAuth();

		//verify that the requester is administrator
		// const token = request.cookies.get('token')!;
		// const decodedToken = await auth.verifyIdToken(token);

		//create user
		const userRecord = await auth.createUser({ email: email, password: password });
		/**
		 * you can perform additional operation here like creating firestore document for the new user
		 */

		return new Response(JSON.stringify({ id: userRecord.uid }));
	} catch (e) {
		return new Response(JSON.stringify({ error: e }), { status: 500 });
	}
}
