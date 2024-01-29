import * as THREE from 'three';
import vertexShader from './vertexShader.glsl';
import fragmentShader from './fragmentShader.glsl';

const IX = (x: number, y: number, N: number) => {
	return x + y * N;
};

const setBnd = (b: number, x: number[], N: number) => {
	// 2d set bnd
	for (let i = 1; i < N - 1; i++) {
		x[IX(i, 0, 0)] = b === 2 ? -x[IX(i, 1, 0)] : x[IX(i, 1, 0)];
		x[IX(i, N - 1, 0)] = b === 2 ? -x[IX(i, N - 2, 0)] : x[IX(i, N - 2, 0)];
		x[IX(0, i, 0)] = b === 1 ? -x[IX(1, i, 0)] : x[IX(1, i, 0)];
		x[IX(N - 1, i, 0)] = b === 1 ? -x[IX(N - 2, i, 0)] : x[IX(N - 2, i, 0)];
	}

	x[IX(0, 0, 0)] = 0.5 * (x[IX(1, 0, 0)] + x[IX(0, 1, 0)]);
	x[IX(0, N - 1, 0)] = 0.5 * (x[IX(1, N - 1, 0)] + x[IX(0, N - 2, 0)]);
	x[IX(N - 1, 0, 0)] = 0.5 * (x[IX(N - 2, 0, 0)] + x[IX(N - 1, 1, 0)]);
	x[IX(N - 1, N - 1, 0)] = 0.5 * (x[IX(N - 2, N - 1, 0)] + x[IX(N - 1, N - 2, 0)]);
};

const linSolve = ({
	b,
	x,
	x0,
	a,
	c,
	iter,
	N
}: {
	b: number;
	x: number[];
	x0: number[];
	a: number;
	c: number;
	iter: number;
	N: number;
}) => {
	// 2d lin solve
	const cRecip = 1.0 / c;

	for (let k = 0; k < iter; k++) {
		for (let j = 1; j < N - 1; j++) {
			for (let i = 1; i < N - 1; i++) {
				x[IX(i, j, k)] =
					(x0[IX(i, j, k)] +
						a *
							(x[IX(i + 1, j, k)] +
								x[IX(i - 1, j, k)] +
								x[IX(i, j + 1, k)] +
								x[IX(i, j - 1, k)] +
								x[IX(i, j, k + 1)] +
								x[IX(i, j, k - 1)])) *
					cRecip;
			}
		}
		setBnd(b, x, N);
	}
};

const advect = ({
	b,
	d,
	d0,
	velocX,
	velocY,
	dt,
	N
}: {
	b: number;
	d: number[];
	d0: number[];
	velocX: number[];
	velocY: number[];
	dt: number;
	N: number;
}) => {
	// 2d advect
	const dtx = dt * (N - 2);
	const dty = dt * (N - 2);

	const Nfloat = N;
	let ifloat, jfloat;
	let i, j;
	let u0: number = 0;
	let u1: number = 0;

	for (j = 1, jfloat = 1; j < N - 1; j++, jfloat++) {
		for (i = 1, ifloat = 1; i < N - 1; i++, ifloat++) {
			const tmp1 = dtx * velocX[IX(i, j, 0)];
			const tmp2 = dty * velocY[IX(i, j, 0)];
			let x = ifloat - tmp1;
			let y = jfloat - tmp2;

			if (x < 0.5) x = 0.5;
			if (x > Nfloat + 0.5) x = Nfloat + 0.5;
			const i0 = Math.floor(x);
			const i1 = i0 + 1.0;

			if (y < 0.5) y = 0.5;
			if (y > Nfloat + 0.5) y = Nfloat + 0.5;
			const j0 = Math.floor(y);
			const j1 = j0 + 1.0;

			const s1 = x - i0;
			const s0 = 1.0 - s1;
			const t1 = y - j0;
			const t0 = 1.0 - t1;

			const i0i = i0;
			const i1i = i1;
			const j0i = j0;
			const j1i = j1;

			d[IX(i, j, 0)] =
				s0 *
					(t0 * (u0 * d0[IX(i0i, j0i, 0)] + u1 * d0[IX(i0i, j0i, 1)]) +
						t1 * (u0 * d0[IX(i0i, j1i, 0)] + u1 * d0[IX(i0i, j1i, 1)])) +
				s1 *
					(t0 * (u0 * d0[IX(i1i, j0i, 0)] + u1 * d0[IX(i1i, j0i, 1)]) +
						t1 * (u0 * d0[IX(i1i, j1i, 0)] + u1 * d0[IX(i1i, j1i, 1)]));
		}
	}
	setBnd(b, d, N);
};

const project = ({
	velocX,
	velocY,
	p,
	div,
	iter,
	N
}: {
	velocX: number[];
	velocY: number[];
	p: number[];
	div: number[];
	iter: number;
	N: number;
}) => {
	// 2d project
	for (let j = 1; j < N - 1; j++) {
		for (let i = 1; i < N - 1; i++) {
			div[IX(i, j, 0)] =
				(-0.5 *
					(velocX[IX(i + 1, j, 0)] -
						velocX[IX(i - 1, j, 0)] +
						velocY[IX(i, j + 1, 0)] -
						velocY[IX(i, j - 1, 0)])) /
				N;
			p[IX(i, j, 0)] = 0;
		}
	}
	setBnd(0, div, N);
	setBnd(0, p, N);

	linSolve({ b: 0, x: p, x0: div, a: 1, c: 6, iter, N });

	for (let j = 1; j < N - 1; j++) {
		for (let i = 1; i < N - 1; i++) {
			velocX[IX(i, j, 0)] -= 0.5 * (p[IX(i + 1, j, 0)] - p[IX(i - 1, j, 0)]) * N;
			velocY[IX(i, j, 0)] -= 0.5 * (p[IX(i, j + 1, 0)] - p[IX(i, j - 1, 0)]) * N;
		}
	}
	setBnd(1, velocX, N);
	setBnd(2, velocY, N);
};

const diffuse = ({
	b,
	x,
	x0,
	diff,
	dt,
	iter,
	N
}: {
	b: number;
	x: number[];
	x0: number[];
	diff: number;
	dt: number;
	iter: number;
	N: number;
}) => {
	const a = dt * diff * (N - 2) * (N - 2);
	linSolve(b, x, x0, a, 1 + 6 * a, iter, N);
};

class FluidCube {
	private size: number;
	private dt: number;
	private diff: number;
	private visc: number;

	private s: number[];
	private density: number[];

	private Vx: number[];
	private Vy: number[];
	private Vz: number[];

	private Vx0: number[];
	private Vy0: number[];
	private Vz0: number[];

	constructor({ N = 64, dt = 0.1, diffusion = 0.0001, viscosity = 0.0001 }) {
		this.size = N;
		this.dt = dt;
		this.diff = diffusion;
		this.visc = viscosity;

		this.s = new Array(N * N).fill(0);
		this.density = new Array(N * N).fill(0);

		this.Vx = new Array(N * N).fill(0);
		this.Vy = new Array(N * N).fill(0);
		this.Vz = new Array(N * N).fill(0);

		this.Vx0 = new Array(N * N).fill(0);
		this.Vy0 = new Array(N * N).fill(0);
		this.Vz0 = new Array(N * N).fill(0);
	}

	public onDestroy() {
		this.s = [];
		this.density = [];

		this.Vx = [];
		this.Vy = [];
		this.Vz = [];

		this.Vx0 = [];
		this.Vy0 = [];
		this.Vz0 = [];
	}

	public addDensity(x: number, y: number, amount: number) {
		const index = IX(x, y, this.size);
		this.density[index] += amount;
	}

	public addVelocity(x: number, y: number, amountX: number, amountY: number) {
		const index = IX(x, y, this.size);
		this.Vx[index] += amountX;
		this.Vy[index] += amountY;
	}
}

class FluidsScene {
	private scene: THREE.Scene = new THREE.Scene();
	public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	public renderer: THREE.WebGLRenderer | null = null;
	private material: THREE.ShaderMaterial | null = null;
	private geometry: THREE.PlaneGeometry | null = null;

	constructor(el: HTMLCanvasElement) {
		this.camera.position.z = 1;
		this.renderer = new THREE.WebGLRenderer({
			canvas: el
		});
		this.renderer.setClearColor('#000000');
		this.renderer.setSize(window.innerWidth, window.innerHeight);

		this.init();
		this.animate();

		window.addEventListener('mousemove', this.onMouseMove.bind(this));
		window.addEventListener('resize', this.onResize.bind(this));
	}

	public init() {
		// // width and height 100% of the screen
		// this.geometry = new THREE.PlaneGeometry(5, 5, 32, 32);
		// // make geometry responsive
		// this.geometry.scale(1.5, 1.5, 1.5);

		// this.material = new THREE.ShaderMaterial({
		// 	side: THREE.DoubleSide,
		// 	uniforms: {
		// 		u_time: { value: 0 },
		// 		u_resolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
		// 		u_mouse: { value: new THREE.Vector4() }
		// 	},
		// 	vertexShader,
		// 	fragmentShader
		// });

		// const mesh = new THREE.Mesh(this.geometry, this.material);

		// mesh.position.x = 0;
		// mesh.position.y = 0;
		// mesh.position.z = 0;

		// this.scene.add(mesh);

		// create fluids
		const fluids = new FluidCube({ N: 128 });
	}

	onMouseMove(event: MouseEvent) {
		if (this.material) {
			this.material.uniforms.u_mouse.value.x = event.clientX;
			this.material.uniforms.u_mouse.value.y = event.clientY;
		}
	}

	onResize() {
		if (this.material) {
			this.material.uniforms.u_resolution.value.x = window.innerWidth;
			this.material.uniforms.u_resolution.value.y = window.innerHeight;
		}

		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer?.setSize(window.innerWidth, window.innerHeight);
	}

	public animate() {
		requestAnimationFrame(this.animate.bind(this));
		if (this.material) {
			this.material.uniforms.u_time.value += 0.01;
		}
		if (this.renderer) this.renderer.render(this.scene, this.camera);
	}
}

export default FluidsScene;
