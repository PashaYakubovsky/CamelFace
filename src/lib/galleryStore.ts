import { writable } from "svelte/store"
import type TravelGalleryScene from "../routes/scene"

export const scene = writable<TravelGalleryScene>({})
export const attractMode = writable(false)
export const currentIndex = writable(0)
export const attractTo = writable(0)
