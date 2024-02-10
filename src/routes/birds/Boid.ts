import gsap from 'gsap';
import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';

export class Boid {
	position: THREE.Vector3;
	velocity: THREE.Vector3;
	acceleration: THREE.Vector3;
	force: number;
	mesh: THREE.Object3D | null;
	cohesionRadius: number;
	alignmentRadius: number;
	fog: THREE.Fog | null = null;
	speedFactor = 0.01;
	instanceMesh: THREE.InstancedMesh | null = null;
	index = 0;
	perceptionRadius = 0.1;
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
		perceptionRadius,
		instanceMesh,
		index,
		__modules
	}: {
		pos: { x: number; y: number; z: number };
		force: number;
		velocity: THREE.Vector3;
		acceleration: THREE.Vector3;
		mesh: THREE.Object3D | null;
		cohesionRadius: number;
		alignmentRadius: number;
		perceptionRadius: number;
		instanceMesh: THREE.InstancedMesh | null;
		index: number;
		__modules?: {
			aligment: boolean;
			cohesion: boolean;
			separation: boolean;
		};
	}) {
		this.position = new THREE.Vector3(x, y, z);
		this.velocity = velocity.clone();
		// this.acceleration = acceleration.clone();
		this.acceleration = acceleration.clone();
		this.force = force;
		this.mesh = mesh;
		this.cohesionRadius = cohesionRadius;
		this.alignmentRadius = alignmentRadius;
		this.perceptionRadius = perceptionRadius;
		this.instanceMesh = instanceMesh;
		this.index = index;
		if (__modules) {
			this._modules = __modules;
		}
	}
	noise = createNoise2D();
	update() {
		// check if the next position be out y <= 0.5 then change the direction
		if (this.position.y <= gsap.utils.random(-0.2, -0.6)) {
			this.velocity.y = Math.abs(this.velocity.y);
			this.acceleration.y = Math.abs(this.acceleration.y);
		}
		this.velocity.add(this.acceleration);
		this.velocity.clampLength(0, this.speedFactor);
		this.position.add(this.velocity);

		// Don't forget to reset acceleration after applying all the forces!
		this.acceleration.set(0, 0, 0);
	}

	show() {
		if (this.instanceMesh) {
			const dummy = new THREE.Object3D();
			dummy.position.copy(this.position);

			// set the rotation of the cone
			const quaternion = new THREE.Quaternion();
			quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.velocity.normalize());
			dummy.setRotationFromQuaternion(quaternion);
			dummy.updateMatrix();
			this.instanceMesh.setMatrixAt(this.index, dummy.matrix);
		}
	}

	flock(boids: Boid[]) {
		if (this._modules.aligment) {
			const alignment = this.aligment(boids);
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
			this.mesh.remove();
			this.mesh = null;
		}
	}
}
