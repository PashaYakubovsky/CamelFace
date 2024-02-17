<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { createNoise2D } from 'simplex-noise';
	import { goto } from '$app/navigation';
	import { Hamburger } from 'svelte-hamburgers';

	const noise = createNoise2D();

	class Particle {
		pos: {
			x: number;
			y: number;
		};
		color: string;
		radius: number;
		vel: {
			x: number;
			y: number;
		};
		life: number;

		constructor(x: number, y: number) {
			this.pos = {
				x: x,
				y: y
			};
			this.color = '#f6f6f6';
			this.radius = 50 + Math.random() * 10;
			this.vel = {
				x: Math.random() * 2 - 1,
				y: Math.random() * 2 - 1
			};
			this.life = 0;
		}

		move() {
			this.life++;

			if (this.radius > 3) this.radius *= 0.99;
			this.vel.x *= 0.99;
			this.vel.y *= 0.99;

			this.pos.x += this.vel.x;
			this.pos.y += this.vel.y;
		}

		draw(ctx: CanvasRenderingContext2D) {
			ctx.fillStyle = this.color;
			ctx.beginPath();
			ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI);
			ctx.closePath();
			ctx.fill();
		}
	}

	let navContainer: HTMLButtonElement;
	let isOpen = false;
	let dots: Particle[] = [];

	onMount(() => {
		const canvas = menuPlate;
		const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		navParent.addEventListener('mousemove', (e) => {
			const xOff = e.screenX - e.clientX;
			const yOff = e.screenY - e.clientY;
			const p = new Particle(e.screenX - xOff, e.screenY - yOff);
			const simplexNoiseColor = noise(p.pos.x, p.pos.y) * 150;
			// create smooth colors changes
			p.color = `hsl(${simplexNoiseColor}, 50%, 30%)`;
			dots.push(p);
		});

		function draw() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			dots.forEach((e, index) => {
				e.move();
				e.draw(ctx);

				if (e.vel.x < 0.01) {
					dots.splice(index, 1);
				}
			});
		}

		function Render() {
			draw();
			window.requestAnimationFrame(Render);
		}

		Render();

		return () => {};
	});

	const handleLinkClick = (e: MouseEvent, url: string) => {
		e.preventDefault();
		goto(url);
		handleOpen(isOpen);
		isOpen = false;
	};

	let menuPlate: HTMLCanvasElement;
	let navParent: HTMLElement;

	const handleOpen = (isOpen: boolean) => {
		const tl = gsap.timeline();

		tl.to(menuPlate, {
			width: isOpen ? 0 : '100vw',
			height: isOpen ? 0 : '100vh',
			opacity: isOpen ? 0.5 : 1,
			borderRadius: isOpen ? '50%' : 0,
			duration: 0.5,
			ease: 'power4.inOut'
		})
			.to(navParent, { opacity: isOpen ? 0 : 1, duration: 0.5 }, '-=0.5')
			.to(
				navParent.children,
				{
					opacity: !isOpen ? 1 : 0,
					x: !isOpen ? 0 : -20,
					stagger: 0.1,
					duration: 0.5
				},
				'-=0.5'
			);
	};
</script>

<button
	bind:this={navContainer}
	on:click={(e) => {
		e.stopPropagation();
		handleOpen(isOpen);
		isOpen = !isOpen;
	}}
	class="menu"
>
	<Hamburger
		--color="white"
		on:click={() => {
			isOpen = !isOpen;
		}}
		type="3dxy-r"
		bind:open={isOpen}
	/>
</button>

<canvas bind:this={menuPlate} class={`menu-plate ${isOpen ? 'menu-plate_open' : 'pulse'}`} />

<!-- {#if isOpen} -->
<nav bind:this={navParent} style={`display:${isOpen ? 'flex' : 'none'};`} class="nav-parent">
	<button on:click={(e) => handleLinkClick(e, '/')} class="nav-link">Home</button>
	<button on:click={(e) => handleLinkClick(e, '/galaxy')} class="nav-link">Galaxy</button>
	<button on:click={(e) => handleLinkClick(e, '/mandelbrot')} class="nav-link"
		>Mandelbrot set</button
	>
	<button on:click={(e) => handleLinkClick(e, '/fbm')} class="nav-link"
		>Fractal browning motion</button
	>
	<button on:click={(e) => handleLinkClick(e, '/cardioid')} class="nav-link">Cardioid</button>
	<button on:click={(e) => handleLinkClick(e, '/lyapunov')} class="nav-link"
		>Lyapunov fractal</button
	>
	<button on:click={(e) => handleLinkClick(e, '/particles-noise')} class="nav-link"
		>Particles & Simplex noise</button
	>
	<button on:click={(e) => handleLinkClick(e, '/boids')} class="nav-link">Boids simulation</button>
	<button on:click={(e) => handleLinkClick(e, '/mutual-attraction')} class="nav-link"
		>Mutual attraction</button
	>
</nav>

<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
	<defs>
		<filter id="liquid">
			<feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
			<feColorMatrix
				in="blur"
				mode="matrix"
				values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 40 -10"
			/>
		</filter>
	</defs>
</svg>

<!-- {/if} -->

<style>
	.menu {
		position: absolute;
		top: 0;
		left: 0;
		background-color: transparent;
		padding: 1rem;
		width: fit-content;
		height: fit-content;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		cursor: pointer;
		z-index: 1000;
		transition: background-color 0.3s ease;
		color: var(--primary);
	}
	/* pulsing animation */
	.menu-plate {
		position: absolute;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		background-color: #060606;
		filter: url(#liquid);
		z-index: 10;
	}

	.nav-parent {
		opacity: 0;
		width: 100vw;
		height: 100vh;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
	}
	.nav-link {
		font-size: 1.5rem;
		color: #f6f6f6;
		background-color: transparent !important;
		text-decoration: none;
		transition: color 0.3s ease;
	}
	.nav-link:hover {
		color: var(--primary);
	}
</style>
