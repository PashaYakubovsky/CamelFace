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

	constructor({
		x,
		y,
		z,
		mesh,
		m,
		index,
		speedFactor
	}: {
		x: number;
		y: number;
		z: number;
		mesh: THREE.InstancedMesh;
		m: number;
		index: number;
		speedFactor: number;
	}) {
		this.speedFactor = speedFactor;
		this.velocity = new THREE.Vector3(x, y, z);
		this.velocity.multiplyScalar(0.001);
		this.mesh = mesh;
		this.acc = new THREE.Vector3(0, 0, 0);
		this.mass = m;
		this.index = index;
		this.position.set(x, y, z);
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

		// if (this.index === 0) {
		// this.movers[0]
		// change scale matrix for 1 instance in instanced mesh

		// }
	}

	attract(mover: Mover) {
		const force = this.position.clone().sub(mover.position);
		force.normalize();
		const distanceSq = force.lengthSq();
		const G = 0.01;
		const strength = +((G * (this.mass * mover.mass)) / distanceSq).toFixed(6);
		force.setLength(strength);
		mover.applyForce(force);
	}

	show() {
		if (this.index === 0) {
			const scale = new THREE.Matrix4();
			scale.makeScale(5, 5, 5);
			scale.setPosition(this.position);
			this.mesh.setMatrixAt(this.index, scale);
		} else {
			this.dummy.position.copy(this.position);
			this.dummy.updateMatrix();
			this.mesh.setMatrixAt(this.index, this.dummy.matrix);
		}
	}
}

export default Mover;
