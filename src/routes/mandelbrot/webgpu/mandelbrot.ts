import gsap from 'gsap';

class MandelbrotScene {
	mousePosition = { x: 0, y: 0 };
	zoomLevel = 1.0;
	xOff = 0;
	yOff = 0;
	canvasElement: HTMLCanvasElement;
	context!: GPUCanvasContext | null;
	adapter!: GPUAdapter | null;
	device!: GPUDevice | undefined;
	pipeline?: GPUComputePipeline;
	module: GPUShaderModule | undefined;
	paused = false;

	constructor(el: HTMLCanvasElement) {
		this.draw(el);
		this.canvasElement = el;

		this.retrieveLocalStorage();
		this.init();

		document.addEventListener('mousemove', this.onMouseMove.bind(this));
		document.addEventListener('wheel', this.onMouseWheel.bind(this));
		document.addEventListener('keypress', this.onKeyPress.bind(this));
	}

	async init() {
		// Initialize GPU access
		this.adapter = await navigator.gpu.requestAdapter();
		this.device = await this.adapter?.requestDevice();

		// Create a WebGPU compatible canvas
		this.context = this.canvasElement.getContext('webgpu');
		if (!this.device || !this.context) {
			throw new Error('WebGPU is not supported');
		}

		// Setup canvas so our compute shader can write into it.
		this.context?.configure({
			device: this.device,
			format: 'rgba8unorm',
			usage: GPUTextureUsage.STORAGE_BINDING
		});

		await this.draw(this.canvasElement);
	}

	async draw(canvas: HTMLCanvasElement) {
		if (!this.context) {
			return;
		}
		if (!this.device) {
			return;
		}

		console.log('Drawing frame');
		console.log('Zoom level:', this.zoomLevel);

		this.module = this.device.createShaderModule({
			code: `
			@group(0) @binding(0)
			var my_texture: texture_storage_2d<rgba8unorm, write>;
		
			fn mandelbrot(coord: vec2f) -> u32 {
				var z = vec2f(0.0);
				var iterations = 0u;
				var maxIterations = 255u;
		
				while (iterations < maxIterations && length(z) < 25.0) {
					z = coord + vec2f(
						pow(z.x, 2.0) - pow(z.y, 2.0),
						2.0 * z.x * z.y
					);
					iterations += 1u;
				}
				return iterations;
			}
		
			@compute @workgroup_size(8, 8)
			fn kernel(@builtin(global_invocation_id) id: vec3u) {
				var c = vec2f(
					// apply zoom and offset
					((f32(id.x) / f32(textureDimensions(my_texture).x)) * 4.0 - 2.0) / ${this.zoomLevel} + ${this.xOff},
					((f32(id.y) / f32(textureDimensions(my_texture).y)) * 4.0 - 2.0) / ${this.zoomLevel} + ${this.yOff}
				);
		
				let iterations = f32(mandelbrot(c));
		
				var red = iterations / 255.0;
				var green = iterations / 225.0;
				var blue = iterations / 105.0;
		
				textureStore(my_texture, id.xy, vec4f(red, green, blue, 1.0));
			}
        `
		});

		// Draw frame
		this.pipeline = await this.device.createComputePipelineAsync({
			layout: 'auto',
			compute: {
				module: this.module,
				entryPoint: 'kernel'
			}
		});

		// Access the currently being rendered canvas texture
		const texture = this.context.getCurrentTexture();
		if (!this.pipeline) {
			throw new Error('Pipeline not created');
		}
		// Put the texture in a bind group so shader can access it
		const bindgroup = this.device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
				{
					binding: 0,
					resource: texture.createView()
				}
			]
		});

		// Begin recording commands for the GPU
		const encoder = this.device.createCommandEncoder();

		// Set "arguments" for the compute shader pass and dispatch it
		const computePass = encoder.beginComputePass();
		computePass.setPipeline(this.pipeline);
		computePass.setBindGroup(0, bindgroup);
		computePass.dispatchWorkgroups(
			Math.ceil(this.canvasElement.width / 8),
			Math.ceil(this.canvasElement.height / 8)
		);
		computePass.end();

		// Finish recording the command buffer
		const commandBuffer = encoder.finish();

		// Submit just the one command buffer to the GPU
		this.device.queue.submit([commandBuffer]);

		requestAnimationFrame(() => this.draw(canvas));
	}

	retrieveLocalStorage() {
		// Retrieve zoom level from local storage
		const zoomLevel = localStorage.getItem('zoomLevel');
		if (zoomLevel && Number(zoomLevel) > 0.5) {
			this.zoomLevel = parseFloat(zoomLevel);
		}

		// Retrieve offset from local storage
		const offset = localStorage.getItem('offset');
		if (offset) {
			const [xOff, yOff] = offset.split(' ');
			this.xOff = parseFloat(xOff);
			this.yOff = parseFloat(yOff);
		}

		// Retrieve paused state from local storage
		const paused = localStorage.getItem('paused');
		if (paused) {
			this.paused = paused === 'true';
		}
	}

	onMouseMove(event: MouseEvent) {
		if (this.paused) return;

		// if mouse not close enough to the center, move to the mouse position
		const x = event.clientX;
		const y = event.clientY;

		this.mousePosition = { x, y };

		const offsetXToCenter = (x / window.innerWidth) * this.zoomLevel - this.zoomLevel / 2;
		const offsetYToCenter = (y / window.innerHeight) * this.zoomLevel - this.zoomLevel / 2;

		if (Math.abs(offsetXToCenter) > 0.1) {
			gsap.to(this, { xOff: this.xOff + offsetXToCenter * 0.01, duration: 0.5 });
		}
		if (Math.abs(offsetYToCenter) > 0.1) {
			gsap.to(this, {
				yOff: this.yOff + offsetYToCenter * 0.01,
				duration: 0.5
			});
		}

		// save position to local storage
		localStorage.setItem('offset', this.xOff + ' ' + this.yOff);
	}
	onMouseWheel(event: WheelEvent) {
		// Update the zoom level based on the scroll event
		this.zoomLevel += +(event.deltaY * 0.01 * this.zoomLevel).toFixed(2);

		// save to local storage
		localStorage.setItem('zoomLevel', this.zoomLevel.toString());
	}
	onKeyPress(event: KeyboardEvent) {
		// if pressed M then stop moving the mandelbrot set
		if (event.key === 'm') {
			this.paused = !this.paused;

			// save to local storage
			localStorage.setItem('paused', this.paused.toString());
		}

		// if pressed R reset the zoom level and offset
		if (event.key === 'r') {
			this.zoomLevel = 1.0;
			this.xOff = 0;
			this.yOff = 0;

			// save to local storage
			localStorage.setItem('zoomLevel', this.zoomLevel.toString());
			localStorage.setItem('offset', this.xOff + ' ' + this.yOff);
		}

		// calculate the offset if zoom bigger ofsset will be smaller
		const offset = 0.1 / this.zoomLevel;

		// if arrow keys are pressed, move the mandelbrot set
		if (event.key === 's') {
			this.yOff += offset;
		}
		if (event.key === 'w') {
			this.yOff -= offset;
		}
		if (event.key === 'a') {
			this.xOff -= offset;
		}
		if (event.key === 'd') {
			this.xOff += offset;
		}
	}

	destroy() {
		document.removeEventListener('mousemove', this.onMouseMove.bind(this));
		document.removeEventListener('wheel', this.onMouseWheel.bind(this));
		document.removeEventListener('keypress', this.onKeyPress.bind(this));

		if (this.context) {
			this.context.unconfigure();
		}
	}
}

export default MandelbrotScene;
