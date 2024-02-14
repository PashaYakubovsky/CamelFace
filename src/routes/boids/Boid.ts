import * as THREE from 'three';

export class Boid {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	acceleration: THREE.Vector3;
	force: number;
	mesh: THREE.Mesh | null;
	cohesionRadius: number;
	alignmentRadius: number;
	fog: THREE.Fog | null = null;
	speedFactor = 0.01;
	perceptionRadius = 0.1;
	_initialState = {
		velocity: new THREE.Vector3(0, 0, 0),
		acceleration: new THREE.Vector3(0, 0, 0),
		force: 0,
		position: new THREE.Vector3(0, 0, 0)
	};
	_modules = {
		aligment: true,
		cohesion: false,
		separation: false
	};

	constructor({
		pos: { x, y, z },
		force,
		velocity,
		acceleration,
		mesh,
		cohesionRadius,
		alignmentRadius,
		perceptionRadius
	}: {
		pos: { x: number; y: number; z: number };
		force: number;
		velocity: THREE.Vector3;
		acceleration: THREE.Vector3;
		mesh: THREE.Mesh | null;
		cohesionRadius: number;
		alignmentRadius: number;
		perceptionRadius: number;
	}) {
		this.position = new THREE.Vector3(x, y, z);
		this.velocity = velocity.clone();
		this.acceleration = acceleration.clone();
		this.force = force;
		this.mesh = mesh;
		this.cohesionRadius = cohesionRadius;
		this.alignmentRadius = alignmentRadius;
		this.perceptionRadius = perceptionRadius;

		this._initialState = {
			velocity: this.velocity.clone(),
			acceleration: this.acceleration.clone(),
			force,
			position: this.position.clone()
		};
	}

	update() {
		this.velocity.add(this.acceleration);
		this.velocity.clampLength(0, this.speedFactor);
		this.position.add(this.velocity);
		this.acceleration.multiplyScalar(0);
	}

	show() {
		if (this.mesh) {
			this.mesh.position.copy(this.position);
			// set the rotation of the cone
			const quaternion = new THREE.Quaternion();
			quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.velocity.clone().normalize());
			this.mesh.setRotationFromQuaternion(quaternion);
		}
	}

	flock(boids: Boid[]) {
		if (this._modules.aligment) {
			const alignment = this.aligment(boids);
			// update acceleration
			this.acceleration.add(alignment);
		}
		if (this._modules.cohesion) {
			const cohesion = this.cohesion(boids);
			this.acceleration.add(cohesion);
		}
		if (this._modules.separation) {
			const separation = this.separation(boids);
			this.acceleration.add(separation);
		}
	}

	boundaries() {
		// if flock is out of bounds, move it to the other side and change its velocity
		const d = 1;
		const force = 5;
		const desired = new THREE.Vector3();
		if (this.position.x < -d) {
			this.velocity.x = Math.abs(this.velocity.x);
		} else if (this.position.x > d) {
			this.velocity.x = -Math.abs(this.velocity.x);
		}

		if (this.position.y < -d) {
			this.velocity.y = Math.abs(this.velocity.y);
		} else if (this.position.y > d) {
			this.velocity.y = -Math.abs(this.velocity.y);
		}

		if (this.position.z < -d) {
			this.velocity.z = Math.abs(this.velocity.z);
		} else if (this.position.z > d) {
			this.velocity.z = -Math.abs(this.velocity.z);
		}

		if (desired.length() > 0) {
			desired.normalize();
			desired.multiplyScalar(this.speedFactor);
			const steer = new THREE.Vector3();
			steer.subVectors(desired, this.velocity);
			steer.clampLength(0, this.speedFactor);
			this.acceleration.add(steer);
		}
	}

	// 3 rules for boids
	aligment(boids: Boid[]) {
		const perceptionRadius = this.alignmentRadius;
		const steering = new THREE.Vector3();
		let total = 0;

		for (const other of boids) {
			const d = this.position.distanceTo(other.position);
			if (other != this && d < perceptionRadius) {
				steering.add(other.velocity);
				total++;
			}
		}

		if (total > 0) {
			steering.divideScalar(total);
			steering.sub(this.velocity);
		}

		return steering;
	}
	cohesion(boids: Boid[]) {
		const perceptionRadius = this.cohesionRadius;
		const steering = new THREE.Vector3();
		let total = 0;
		for (const other of boids) {
			const d = this.position.distanceTo(other.position);
			if (other != this && d < perceptionRadius) {
				steering.add(other.position);
				total++;
			}
		}
		if (total > 0) {
			steering.divideScalar(total);
			steering.sub(this.position);
			steering.sub(this.velocity);
		}
		return steering;
	}
	separation(boids: Boid[]) {
		const perceptionRadius = this.perceptionRadius;
		const steering = new THREE.Vector3();
		let total = 0;
		for (const other of boids) {
			const d = this.position.distanceTo(other.position);
			if (other != this && d < perceptionRadius) {
				const diff = new THREE.Vector3();
				diff.subVectors(this.position, other.position);
				diff.divideScalar(d);
				steering.add(diff);
				total++;
			}
		}
		if (total > 0) {
			steering.divideScalar(total);
		}
		return steering;
	}

	remove() {
		if (this.mesh) {
			this.mesh.geometry.dispose();
			this.mesh = null;
		}
	}
}
