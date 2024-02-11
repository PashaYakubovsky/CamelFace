import * as THREE from 'three';

export interface IMover {
	velocity: THREE.Vector3;
	mesh: THREE.InstancedMesh;
	acc: THREE.Vector3;
	mass: number;
	applyForce(force: THREE.Vector3): void;
	update(): void;
	attract(mover: Mover): void;
	index: number;
	show(): void;
	position: THREE.Vector3;
	dummy: THREE.Object3D;
	speedFactor: number;
	radius: number;
}

class Mover implements IMover {
	velocity: THREE.Vector3;
	mesh: THREE.InstancedMesh;
	acc: THREE.Vector3;
	mass = 1;
	index: number;
	position = new THREE.Vector3();
	dummy = new THREE.Object3D();
	speedFactor = 0.01;
	radius = 0.01;

	constructor({
		x,
		y,
		z,
		mesh,
		m,
		index,
		speedFactor,
		radius
	}: {
		x: number;
		y: number;
		z: number;
		mesh: THREE.InstancedMesh;
		m: number;
		index: number;
		speedFactor: number;
		radius: number;
	}) {
		this.speedFactor = speedFactor;
		this.velocity = new THREE.Vector3(x, y, z);
		this.velocity.multiplyScalar(0.001);
		this.mesh = mesh;
		this.acc = new THREE.Vector3(0, 0, 0);
		this.mass = m;
		this.index = index;
		this.position.set(x, y, z);
		this.radius = radius;
	}

	applyForce(force: THREE.Vector3) {
		const f = force.clone();
		f.divideScalar(this.mass);
		this.acc.add(f);
	}

	update() {
		// apply speed factor
		this.acc.setLength(this.speedFactor * 0.1);
		this.velocity.add(this.acc);
		this.position.add(this.velocity);
		this.acc.multiplyScalar(0);
	}

	attract(mover: Mover) {
		const force = this.position.clone().sub(mover.position);
		force.normalize();
		const distanceSq = force.lengthSq();
		const G = 0.1;
		const strength = +((G * (this.mass * mover.mass)) / distanceSq).toFixed(6);
		force.setLength(strength);
		mover.applyForce(force);
	}

	show() {
		if (this.index === 0) {
			const scaleTo = 5;
			const scale = new THREE.Matrix4();
			scale.makeScale(scaleTo, scaleTo, scaleTo);
			scale.setPosition(this.position);
			this.mesh.setMatrixAt(this.index, scale);
			// multiple all forces
			this.velocity.multiplyScalar(0.99);
			this.dummy.position.copy(this.position);
			this.dummy.updateMatrix();
		} else {
			this.dummy.position.copy(this.position);
			this.dummy.updateMatrix();
			this.mesh.setMatrixAt(this.index, this.dummy.matrix);
		}
	}
}

export default Mover;
