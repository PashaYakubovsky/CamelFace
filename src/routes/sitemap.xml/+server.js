import axios from "axios"

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		"Content-Type": "application/xml",
	})

	const site = "https://www.camelface.pro"
	const response = await axios.get(`${process.env.VITE_PUBLIC_API_URL}/posts`, {
		headers: {
			"Content-Type": "application/json",
		},
		params: {
			limit: 100,
		},
	})

	if (response.status !== 200) {
		console.log(response)
		throw new Error("Failed to fetch")
	}

	const posts = response.data.docs || []

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
                    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                    <url>
                    <loc>${site}</loc>
                    <changefreq>daily</changefreq>
                    <priority>0.7</priority>
                    </url>
                    ${posts
											.map(
												(post) => `
                              <url>
                              <loc>${site}${post.slug}</loc>
                              <changefreq>weekly</changefreq>
                              <lastmod>${post.updatedAt.split("T")[0]}</lastmod>
                              </url>
                              `,
											)
											.join("")}
          </urlset>`
	return new Response(sitemap)
}
