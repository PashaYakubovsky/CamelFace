import axios, { type AxiosResponse } from 'axios';

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
