import axios, { type AxiosResponse } from "axios"
import { posts } from "./posts.ts"
// import { PUBLIC_CMS_API } from '$env/static/public';
import type { PayloadCMSResponse, Post } from "../types.ts"
import { loading } from "$lib/loading"

export const mock = {
	docs: [],
	hasNextPage: false,
	hasPrevPage: false,
	limit: 10,
	nextPage: null,
	page: 1,
	pagingCounter: 1,
	prevPage: null,
	totalDocs: 5,
	totalPages: 1,
}

export const getPosts = async () => {
	loading.update((state) => ({ ...state, loading: true }))
	try {
		const response: AxiosResponse<PayloadCMSResponse<Post[]>> = await axios.get(
			`${import.meta.env.VITE_PUBLIC_CMS_API}/posts`,
			{
				headers: {
					"Content-Type": "application/json",
				},
				params: {
					limit: 100,
				},
			},
		)
		if (response.status === 200) {
			const data = response.data.docs || mock.docs
			data.sort((a, b) => {
				return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			})
			posts.set(data)
		}
	} catch (error) {
		posts.set(mock.docs as unknown as Post[])
		console.log(error)
	}

	loading.update((state) => ({ ...state, loading: false }))
}

export const getPost = async ({ postId }: { postId: string }) => {
	loading.update((state) => ({ ...state, loading: true }))

	try {
		const response: AxiosResponse<Post> = await axios.get(
			`${import.meta.env.VITE_PUBLIC_CMS_API}/posts/${postId}`,
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		)

		return response.data
	} catch (error) {
		console.log(error)
	}

	loading.update((state) => ({ ...state, loading: false }))

	return null
}
