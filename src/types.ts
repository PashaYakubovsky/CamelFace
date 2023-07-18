export interface TravelBlogPost {
	id: number;
	title: string;
	author: {
		name: string;
		email: string;
		avatarUrl: string;
		phone: string;
	};
	content: {
		tags: string[];
		images: string[];
		location: string;
		date: string;
	};
}
