import axios, { type AxiosResponse } from 'axios';
import { posts } from './posts.ts';
import { PUBLIC_CMS_API } from '$env/static/public';
import type { PayloadCMSResponse, Post } from '../types.ts';

const mock = {
	docs: [
		{
			id: '64ba79026db4f2ef37742891',
			backgroundImage: {
				id: '64ba78ca6db4f2ef37742880',
				prefix: 'media',
				filename: '2022-01-24-16.50.16.webp',
				mimeType: 'image/webp',
				filesize: 36972,
				width: 750,
				height: 588,
				createdAt: '2023-07-21T12:23:38.348Z',
				updatedAt: '2023-07-21T12:23:38.348Z',
				url: 'https://storage.googleapis.com/travel-blog/media/2022-01-24-16.50.16.webp'
			},
			title: 'Super Title',
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
			content: 'Super content 123',
			category: {
				id: '64b986ce63176e9b4aef9dcf',
				name: 'Food',
				createdAt: '2023-07-20T19:11:10.300Z',
				updatedAt: '2023-07-20T19:11:10.300Z'
			},
			status: 'draft',
			createdAt: '2023-07-21T12:24:34.171Z',
			updatedAt: '2023-07-22T14:51:22.866Z',
			backgroundColor: '#DB4C77',
			textColor: '#F2F6F8'
		},
		{
			id: '64b9a45ab801082f167befc8',
			backgroundImage: {
				id: '64b9a441b801082f167befb7',
				prefix: 'media',
				filename: '2022-01-19-15.20.49.webp',
				mimeType: 'image/webp',
				filesize: 55312,
				width: 693,
				height: 558,
				createdAt: '2023-07-20T21:16:49.568Z',
				updatedAt: '2023-07-20T21:16:49.568Z',
				url: 'https://storage.googleapis.com/travel-blog/media/2022-01-19-15.20.49.webp'
			},
			title: 'Sup bro',
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
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
			category: {
				id: '64b986ce63176e9b4aef9dcf',
				name: 'Food',
				createdAt: '2023-07-20T19:11:10.300Z',
				updatedAt: '2023-07-20T19:11:10.300Z'
			},
			status: 'draft',
			createdAt: '2023-07-20T21:17:14.064Z',
			updatedAt: '2023-07-22T14:51:56.932Z',
			backgroundColor: '#3CA2C8',
			textColor: '#D7D6D2'
		},
		{
			id: '64b987b1ad45225d42594b6e',
			backgroundImage: {
				id: '64b9879bad45225d42594b5d',
				prefix: 'media',
				filename: '2022-01-16-17.10.10-min.webp',
				mimeType: 'image/webp',
				filesize: 30724,
				width: 675,
				height: 1200,
				createdAt: '2023-07-20T19:14:35.718Z',
				updatedAt: '2023-07-20T19:14:35.718Z',
				url: 'https://storage.googleapis.com/travel-blog/media/2022-01-16-17.10.10-min.webp'
			},
			title: 'Super post',
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
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
			category: {
				id: '64b986ce63176e9b4aef9dcf',
				name: 'Food',
				createdAt: '2023-07-20T19:11:10.300Z',
				updatedAt: '2023-07-20T19:11:10.300Z'
			},
			status: 'draft',
			createdAt: '2023-07-20T19:14:57.759Z',
			updatedAt: '2023-07-21T19:09:10.007Z',
			backgroundColor: '#c19ce9',
			textColor: '#fff'
		}
	],
	totalDocs: 3,
	limit: 10,
	totalPages: 1,
	page: 1,
	pagingCounter: 1,
	hasPrevPage: false,
	hasNextPage: false,
	prevPage: null,
	nextPage: null
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
			posts.set(response.data.docs);
		} else {
			posts.set(mock.docs as Post[]);
		}
	} catch (error) {
		console.log(error);
	}
};

export const getPost = async ({ postId }: { postId: string }) => {
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

	return null;
};
