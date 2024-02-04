import axios, { type AxiosResponse } from 'axios';
import { posts } from './posts.ts';
import { PUBLIC_CMS_API } from '$env/static/public';
import type { PayloadCMSResponse, Post } from '../types.ts';
import { loading } from '$lib/loading';

export const mock = {
	docs: [
		{
			id: '65bf0e926d247cba7c190ccf',
			backgroundImage: {
				id: '65bf0ff76d247cba7c190d24',
				prefix: 'media',
				filename: 'Screenshot-2024-02-04-at-06.17.44.webp',
				mimeType: 'image/webp',
				filesize: 106244,
				width: 1728,
				height: 1018,
				createdAt: '2024-02-04T04:17:59.269Z',
				updatedAt: '2024-02-04T04:17:59.269Z',
				url: 'https://storage.googleapis.com/travel-blog/media/Screenshot-2024-02-04-at-06.17.44.webp'
			},
			title: 'Lyapunov',
			textColor: '#f6f6f6',
			backgroundColor: '#000',
			author: {
				id: '64b9878fad45225d42594b46',
				username: 'Pasha',
				email: 'yakubovskypasha@gmail.com',
				fullname: 'Pasya Yakubovsky',
				bio: 'adsd'
			},
			country: {
				id: '64b986c363176e9b4aef9db0',
				name: 'Ukraine',
				createdAt: '2023-07-20T19:10:59.935Z',
				updatedAt: '2023-07-20T19:10:59.935Z'
			},
			publishedDate: '2024-02-03T22:00:00.000Z',
			content:
				'This project is an innovative and dynamic program that visualizes the intriguing world of Lyapunov fractals using a GLSL shader. The fractals are not static; instead, they exhibit a compelling fluidic motion that simulates the soothing flow of water, creating an immersive visual experience.',
			status: 'draft',
			createdAt: '2024-02-04T04:12:02.622Z',
			updatedAt: '2024-02-04T04:18:00.114Z'
		},
		{
			id: '65bf0d856d247cba7c190c87',
			backgroundImage: {
				id: '65bf0d826d247cba7c190c7f',
				prefix: 'media',
				filename: 'Screenshot-2024-02-04-at-06.07.14.webp',
				mimeType: 'image/webp',
				filesize: 294390,
				width: 1826,
				height: 1478,
				createdAt: '2024-02-04T04:07:30.572Z',
				updatedAt: '2024-02-04T04:07:30.572Z',
				url: 'https://storage.googleapis.com/travel-blog/media/Screenshot-2024-02-04-at-06.07.14.webp'
			},
			title: 'Cardiod',
			textColor: '#f6f6f6',
			backgroundColor: '#000',
			author: {
				id: '64b9878fad45225d42594b46',
				username: 'Pasha',
				email: 'yakubovskypasha@gmail.com',
				fullname: 'Pasya Yakubovsky',
				bio: 'adsd'
			},
			country: {
				id: '64b986c363176e9b4aef9db0',
				name: 'Ukraine',
				createdAt: '2023-07-20T19:10:59.935Z',
				updatedAt: '2023-07-20T19:10:59.935Z'
			},
			publishedDate: '2024-02-03T22:00:00.000Z',
			content:
				'This GLSL shader is primarily aimed at generating an on-GPU visualization of the mathematical cardioid function. It also provides interactive controls to manipulate the number of octaves, line count, and color of the visualized cardioid.',
			category: {
				id: '65bf03326d247cba7c190a6a',
				name: 'glsl',
				createdAt: '2024-02-04T03:23:30.677Z',
				updatedAt: '2024-02-04T03:23:30.677Z'
			},
			status: 'draft',
			createdAt: '2024-02-04T04:07:33.460Z',
			updatedAt: '2024-02-04T04:07:33.460Z'
		},
		{
			id: '64ba79026db4f2ef37742891',
			backgroundImage: {
				id: '65bf025a6d247cba7c190a57',
				prefix: 'media',
				filename: 'Screenshot-2024-02-04-at-05.19.39.webp',
				mimeType: 'image/webp',
				filesize: 353670,
				width: 1578,
				height: 926,
				createdAt: '2024-02-04T03:19:54.169Z',
				updatedAt: '2024-02-04T03:19:54.169Z',
				url: 'https://storage.googleapis.com/travel-blog/media/Screenshot-2024-02-04-at-05.19.39.webp'
			},
			title: 'Galaxy',
			author: {
				id: '64b9878fad45225d42594b46',
				username: 'Pasha',
				email: 'yakubovskypasha@gmail.com',
				fullname: 'Pasya Yakubovsky',
				bio: 'adsd'
			},
			country: {
				id: '64b986c363176e9b4aef9db0',
				name: 'Ukraine',
				createdAt: '2023-07-20T19:10:59.935Z',
				updatedAt: '2023-07-20T19:10:59.935Z'
			},
			publishedDate: '2023-07-27T21:00:00.000Z',
			featured: true,
			content:
				"Harnessing Cosmic Chaos: Coding Galaxies from Particles\nDive into the mysterious intersections of coding and cosmology. Learn to simulate galaxies using particles, manipulating randomness, count, and branches for tailored cosmic designs. A journey from microcosm to macrocosm, shaping your personal Universe one-star system at a time. It's the cosmos at your fingertips!",
			category: {
				id: '65bf03326d247cba7c190a6a',
				name: 'glsl',
				createdAt: '2024-02-04T03:23:30.677Z',
				updatedAt: '2024-02-04T03:23:30.677Z'
			},
			status: 'published',
			createdAt: '2023-07-21T12:24:34.171Z',
			updatedAt: '2024-02-04T03:25:02.234Z',
			backgroundColor: '#DB4C77',
			textColor: '#F2F6F8'
		},
		{
			id: '64b9a45ab801082f167befc8',
			backgroundImage: {
				id: '65bf0aa36d247cba7c190be8',
				prefix: 'media',
				filename: 'Screenshot-2024-02-04-at-05.54.50.webp',
				mimeType: 'image/webp',
				filesize: 277224,
				width: 2030,
				height: 1226,
				createdAt: '2024-02-04T03:55:15.921Z',
				updatedAt: '2024-02-04T03:55:15.921Z',
				url: 'https://storage.googleapis.com/travel-blog/media/Screenshot-2024-02-04-at-05.54.50.webp'
			},
			title: 'Mandelbrot set',
			author: {
				id: '64b9878fad45225d42594b46',
				username: 'Pasha',
				email: 'yakubovskypasha@gmail.com',
				fullname: 'Pasya Yakubovsky',
				bio: 'adsd'
			},
			country: {
				id: '64b986c363176e9b4aef9db0',
				name: 'Ukraine',
				createdAt: '2023-07-20T19:10:59.935Z',
				updatedAt: '2023-07-20T19:10:59.935Z'
			},
			publishedDate: '2023-07-20T21:00:00.000Z',
			content:
				"GLSL Shader for Mandelbrot Visualization\nThis GLSL shader implements a viewer for the Mandelbrot set, a fractal that's renowned for its stunning complexity and infinite detail. The shader uses Graphics Library Shader Language (GLSL) to perform this complex task directly on the GPU, providing real-time rendering of the Mandelbrot set.",
			category: {
				id: '65bf03326d247cba7c190a6a',
				name: 'glsl',
				createdAt: '2024-02-04T03:23:30.677Z',
				updatedAt: '2024-02-04T03:23:30.677Z'
			},
			status: 'published',
			createdAt: '2023-07-20T21:17:14.064Z',
			updatedAt: '2024-02-04T03:58:09.022Z',
			backgroundColor: '#3CA2C8',
			textColor: '#060606'
		},
		{
			id: '64b987b1ad45225d42594b6e',
			backgroundImage: {
				id: '65bf0bb86d247cba7c190c37',
				prefix: 'media',
				filename: 'Screenshot-2024-02-04-at-05.58.59.webp',
				mimeType: 'image/webp',
				filesize: 11600,
				width: 1664,
				height: 1028,
				createdAt: '2024-02-04T03:59:52.553Z',
				updatedAt: '2024-02-04T03:59:52.553Z',
				url: 'https://storage.googleapis.com/travel-blog/media/Screenshot-2024-02-04-at-05.58.59.webp'
			},
			title: 'FBM',
			author: {
				id: '64b9878fad45225d42594b46',
				username: 'Pasha',
				email: 'yakubovskypasha@gmail.com',
				fullname: 'Pasya Yakubovsky',
				bio: 'adsd'
			},
			country: {
				id: '64b986c363176e9b4aef9db0',
				name: 'Ukraine',
				createdAt: '2023-07-20T19:10:59.935Z',
				updatedAt: '2023-07-20T19:10:59.935Z'
			},
			publishedDate: '2023-07-19T21:00:00.000Z',
			featured: true,
			content:
				'This given GLSL shader is for creating a dynamic cloud-like visual effect leveraging the principle of Fractal Brownian Motion (FBM) and it responds interactively to the mouse position. The positioning of the mouse simulates the direction of the wind, which directs the movement of these visually appealing clouds.',
			category: {
				id: '64b986ce63176e9b4aef9dcf',
				name: 'three.js',
				createdAt: '2023-07-20T19:11:10.300Z',
				updatedAt: '2024-02-04T03:23:07.254Z'
			},
			status: 'draft',
			createdAt: '2023-07-20T19:14:57.759Z',
			updatedAt: '2024-02-04T04:02:56.087Z',
			backgroundColor: '#c19ce9',
			textColor: '#fff'
		}
	],
	hasNextPage: false,
	hasPrevPage: false,
	limit: 10,
	nextPage: null,
	page: 1,
	pagingCounter: 1,
	prevPage: null,
	totalDocs: 5,
	totalPages: 1
};

export const getPhoto = async () => {
	// get random photo from pexels
	const response: AxiosResponse<{ photos: { src: { medium: string } }[] }> = await axios.get(
		`https://api.pexels.com/v1/search?query=travel&per_page=1&page=${
			Math.floor(Math.random() * 100) + 1
		}`,
		{
			headers: {
				Authorization: '563492ad6f91700001000001675f5a9bb62a485e8aa80436ea5d6241'
			}
		}
	);

	return response.data.photos[0].src.medium;
};

export const getPosts = async () => {
	loading.update((state) => ({ ...state, loading: true }));

	try {
		const response: AxiosResponse<PayloadCMSResponse<Post[]>> = await axios.get(
			`${PUBLIC_CMS_API}/posts`,
			{
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
		if (response.status === 200) {
			posts.set(response.data.docs || mock.docs);
		}
	} catch (error) {
		posts.set(mock.docs as unknown as Post[]);
		console.log(error);
	}

	loading.update((state) => ({ ...state, loading: false }));
};

export const getPost = async ({ postId }: { postId: string }) => {
	loading.update((state) => ({ ...state, loading: true }));

	try {
		const response: AxiosResponse<Post> = await axios.get(`${PUBLIC_CMS_API}/posts/${postId}`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		return response.data;
	} catch (error) {
		console.log(error);
	}

	loading.update((state) => ({ ...state, loading: false }));

	return null;
};
