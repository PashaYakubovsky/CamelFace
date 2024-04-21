import { getFirebaseAdminAuth } from '$lib/firebase/firebase.admin';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(request: RequestEvent) {
	const { token } = await request.request.json();

	//delete the previous token in cookies
	request.cookies.delete('token', { path: '/' });

	const auth = getFirebaseAdminAuth();

	try {
		//decode the token to make sure it's valid, you can add additional logic here
		const decodedToken = await auth.verifyIdToken(token);

		//set the token with path option to make the token accessible in all API paths
		request.cookies.set('token', token, { path: '/' });
	} catch (e) {
		console.log(`error verifying ID Token : ${e}`);
	}

	return new Response();
}
