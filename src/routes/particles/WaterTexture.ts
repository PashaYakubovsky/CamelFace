const easeOutSine: (t: number, b: number, c: number, d: number) => number = (
	t,
	b,
	c,
	d,
) => {
	return c * Math.sin((t / d) * (Math.PI / 2)) + b
}

const easeOutQuad: (t: number, b: number, c: number, d: number) => number = (
	t,
	b,
	c,
	d,
) => {
	t /= d
	return -c * t * (t - 2) + b
}

type Point = {
	x: number
	y: number
	age?: number
	force?: number
	vx?: number
	vy?: number
}

export class WaterTexture {
	canvas!: HTMLCanvasElement
	ctx!: CanvasRenderingContext2D
	size: number
	points: Point[]
	radius: number
	width: number
	height: number
	maxAge: number
	last: Point | null

	constructor(options: { size?: number; maxAge?: number; debug?: boolean }) {
		this.size = options.size || 64
		this.points = []
		this.radius = this.size * 0.1
		this.width = this.height = this.size
		this.maxAge = options.maxAge || 64
		this.last = null

		if (options.debug) {
			this.width = 256
			this.height = 256
		}

		this.initTexture()
		if (options.debug) document.body.append(this.canvas)
	}
	// Initialize our canvas
	initTexture() {
		this.canvas = document.createElement("canvas")
		this.canvas.style.position = "fixed"
		this.canvas.style.width = "256px"
		this.canvas.style.height = "256px"
		this.canvas.style.top = "0px"
		this.canvas.style.left = "0px"
		this.canvas.style.zIndex = "10"
		this.canvas.id = "WaterTexture"
		this.canvas.width = this.width
		this.canvas.height = this.height
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		this.ctx = this.canvas.getContext("2d")!
		this.clear()
	}
	clear() {
		this.ctx.fillStyle = "black"
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
	}
	addPoint(point: Point) {
		let force = 0
		let vx = 0
		let vy = 0
		const last = this.last
		if (last) {
			const relativeX = point.x - last.x
			const relativeY = point.y - last.y
			// Distance formula
			const distanceSquared = relativeX * relativeX + relativeY * relativeY
			const distance = Math.sqrt(distanceSquared)
			// Calculate Unit Vector
			vx = relativeX / distance
			vy = relativeY / distance

			force = Math.min(distanceSquared * 10000, 1)
		}

		this.last = {
			x: point.x,
			y: point.y,
		}
		this.points.push({ x: point.x, y: point.y, age: 0, force, vx, vy })
	}
	update() {
		this.clear()
		const agePart = 1 / this.maxAge
		this.points.forEach((point, i) => {
			const slowAsOlder = 1 - (point.age || 1) / this.maxAge
			const force = (point.force || 1) * agePart * slowAsOlder
			point.x += (point.vx || 1) * force
			point.y += (point.vy || 1) * force
			if (point.age) point.age += 1
			else point.age = 1

			if (point.age > this.maxAge) {
				this.points.splice(i, 1)
			}
		})
		this.points.forEach((point) => {
			this.drawPoint(point)
		})
	}
	drawPoint(point: Point) {
		// Convert normalized position into canvas coordinates
		const pos = {
			x: point.x * this.width,
			y: point.y * this.height,
		}
		const radius = this.radius
		const ctx = this.ctx

		let intensity = 1
		if ((point.age || 1) < this.maxAge * 0.3) {
			intensity = easeOutSine((point.age || 1) / (this.maxAge * 0.3), 0, 1, 1)
		} else {
			intensity = easeOutQuad(
				1 - ((point.age || 1) - this.maxAge * 0.3) / (this.maxAge * 0.7),
				0,
				1,
				1,
			)
		}
		intensity *= point.force || 1

		// Insert data to color channels
		// RG = Unit vector
		const red = (((point.vx || 1) + 1) / 2) * 255
		const green = (((point.vy || 1) + 1) / 2) * 255
		// B = Unit vector
		const blue = intensity * 255
		const color = `${red}, ${green}, ${blue}`

		const offset = this.size * 5
		ctx.shadowOffsetX = offset
		ctx.shadowOffsetY = offset
		ctx.shadowBlur = radius * 1
		ctx.shadowColor = `rgba(${color},${0.2 * intensity})`

		this.ctx.beginPath()
		this.ctx.fillStyle = "rgba(255,0,0,1)"
		this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2)
		this.ctx.fill()
	}
}
