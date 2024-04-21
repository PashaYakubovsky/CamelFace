import { getDatabase, ref, set } from 'firebase/database';
import type { RequestEvent } from './$types';
import { firebaseApp } from '$lib/firebase/firebase.app';

export async function POST(request: RequestEvent) {
	console.log(firebaseApp);
	const { mouse, userId } = await request.request.json();

	try {
		const db = getDatabase();

		await set(ref(db, 'mousePos/' + userId), {
			x: mouse.x,
			y: mouse.y
		});

		return new Response(
			JSON.stringify({
				success: true
			})
		);
	} catch (e) {
		return new Response(JSON.stringify({ error: e }), { status: 500 });
	}
}
