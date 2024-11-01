<script lang="ts">
	import "../styles/globals.scss"
	import "../styles/app.css"
	import Copyright from "$lib/ui/Copyright.svelte"
	import Analytics from "$lib/analytics.svelte"
	import { io } from "socket.io-client"
	import { onMount } from "svelte"
	// import { PUBLIC_API_URL } from "$env/static/public"
	// import LegendaryCursor from "../lib/legendary-cursor/LegendaryCursor"

	const generateHexFromId = (id: string) => {
		const hash = id.split("").reduce((acc, char) => {
			acc = (acc << 5) - acc + char.charCodeAt(0)
			return acc & acc
		}, 0)
		return `#${(0x1000000 + hash).toString(16).slice(1, 7)}`
	}
	let userSocketId: string = ""
	let mouses: { id: string; x: number; y: number; color: string }[] = []

	const createMouseHandler = (socket: any) => (e: MouseEvent) => {
		const { clientX, clientY } = e
		socket.emit("mousemove", { x: clientX, y: clientY })
	}

	onMount(() => {
		const socket = io(import.meta.env.VITE_PUBLIC_API_URL)

		socket.on("connect", () => {
			console.log("connected")
			window.addEventListener("mousemove", createMouseHandler(socket))
		})

		socket.on("disconnect", () => {
			console.log("disconnected")
			window.removeEventListener("mousemove", createMouseHandler(socket))
		})

		socket.on("users", (data: any) => {
			userSocketId = socket.id || ""
			mouses = Object.values(data) || []
			mouses = mouses.map((mouse) => ({
				...mouse,
				color: generateHexFromId(mouse.id),
			}))
		})

		return () => {
			socket.disconnect()
		}
	})
</script>

<slot />

<!-- display mouses from ws -->
{#each mouses as mouse}
	<!-- filter current user -->
	{#if mouse.id !== userSocketId}
		<svg
			stroke="currentColor"
			fill="currentColor"
			stroke-width="0"
			viewBox="0 0 256 256"
			style="z-index: 10;position: absolute; top: {mouse.y}px; left: {mouse.x}px;"
			height="20px"
			width="20px"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fill={mouse.color}
				d="M168,132.69,214.08,115l.33-.13A16,16,0,0,0,213,85.07L52.92,32.8A15.95,15.95,0,0,0,32.8,52.92L85.07,213a15.82,15.82,0,0,0,14.41,11l.78,0a15.84,15.84,0,0,0,14.61-9.59l.13-.33L132.69,168,184,219.31a16,16,0,0,0,22.63,0l12.68-12.68a16,16,0,0,0,0-22.63ZM195.31,208,144,156.69a16,16,0,0,0-26,4.93c0,.11-.09.22-.13.32l-17.65,46L48,48l159.85,52.2-45.95,17.64-.32.13a16,16,0,0,0-4.93,26h0L208,195.31Z"
			/>
		</svg>
	{/if}
{/each}

<Analytics />

<Copyright />
