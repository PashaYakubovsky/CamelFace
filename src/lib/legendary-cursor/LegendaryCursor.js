// import * as THREE from "three"
// import Utils from "./js/utils"
// import { linev, linef } from "./js/shaders/line"
// import { sparklev, sparklef } from "./js/shaders/sparkle"
// import { lightshaftv, lightshaftf } from "./js/shaders/lightshaft"
// import { quadclearv, quadclearf } from "./js/shaders/quadclear"

// let vec3 = function (x, y, z) {
// 	return new THREE.Vector3(x, y, z)
// }

// let LegendaryCursor = {}

// let scene
// let camera
// let renderer
// let lineMaterial
// let sparkleMaterial
// let lightShaftMaterial
// let quadClearMaterial
// let clock

// let linePoints = []
// let sparkles = []
// let lightShafts = []
// let aspectRatio = innerWidth / innerHeight

// let mouseDown = false
// let mouseMixer = 0

// let cumulativeUvy

// let speedExpFactor
// let lineSize
// let lineExpFactor
// let opacityDecrement
// let sparklesCount
// let maxOpacity

// LegendaryCursor.init = function (args) {
// 	if (!args) args = {}

// 	lineExpFactor = args.lineExpFactor || 0.6
// 	speedExpFactor = args.speedExpFactor || 0.8
// 	lineSize = args.lineSize || 0.15
// 	opacityDecrement = args.opacityDecrement || 0.55
// 	sparklesCount = args.sparklesCount || 65
// 	maxOpacity = args.maxOpacity || 1

// 	renderer = new THREE.WebGLRenderer({
// 		antialias: true,
// 		alpha: true,
// 		premultipliedAlpha: true,
// 	})
// 	renderer.autoClear = false
// 	renderer.setSize(window.innerWidth, window.innerHeight)
// 	renderer.domElement.style.pointerEvents = "none"
// 	renderer.domElement.style.position = "fixed"
// 	renderer.domElement.style.top = "0"
// 	renderer.domElement.style.left = "0"
// 	renderer.domElement.style.zIndex = "99999"
// 	document.body.appendChild(renderer.domElement)

// 	scene = new THREE.Scene()

// 	camera = new THREE.PerspectiveCamera(
// 		45,
// 		window.innerWidth / window.innerHeight,
// 		1,
// 		1000
// 	)
// 	camera.position.set(0, 0, 60)

// 	clock = new THREE.Clock()

// 	let t1, t2, t4
// 	new THREE.TextureLoader().load(
// 		args.texture1 ||
// 			"https://domenicobrz.github.io/assets/legendary-cursor/t3.jpg",
// 		function (texture) {
// 			// setting these values will prevent the texture from being downscaled internally by three.js
// 			texture.generateMipmaps = false
// 			texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
// 			texture.minFilter = THREE.LinearFilter
// 			t1 = texture
// 			onDl()
// 		}
// 	)

// 	new THREE.TextureLoader().load(
// 		args.texture2 ||
// 			"https://domenicobrz.github.io/assets/legendary-cursor/t6_1.jpg",
// 		function (texture) {
// 			// setting these values will prevent the texture from being downscaled internally by three.js
// 			texture.generateMipmaps = false
// 			texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
// 			texture.minFilter = THREE.LinearFilter
// 			t2 = texture
// 			onDl()
// 		}
// 	)

// 	new THREE.TextureLoader().load(
// 		args.texture3 ||
// 			"https://domenicobrz.github.io/assets/legendary-cursor/ts.png",
// 		function (texture) {
// 			t4 = texture
// 			onDl()
// 		}
// 	)

// 	function onDl() {
// 		if (!t1 || !t2 || !t4) return

// 		// modify line shader material
// 		let linef2 = linef.replace(
// 			"float t = 2.5 - pow(vFx.x, 0.5) * 2.7;",
// 			"float t = 2.5 - pow(vFx.x, 0.5) * " + (2.7 * maxOpacity).toFixed(2) + ";"
// 		)

// 		lineMaterial = new THREE.ShaderMaterial({
// 			uniforms: {
// 				uTime: { value: 0 },
// 				uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
// 				uUVYheadStart: { value: 0 },
// 				uUVYheadLength: { value: 0 },
// 				uCumulativeY: { value: 0 },
// 				uTexture1: { type: "t", value: t1 },
// 				uTexture2: { type: "t", value: t2 },
// 				uPass: { value: 0 },
// 				uMouseTextureDisp: { value: new THREE.Vector2(0, 0) },
// 			},

// 			side: THREE.DoubleSide,
// 			transparent: true,

// 			depthTest: false,

// 			vertexShader: linev,
// 			fragmentShader: linef2,
// 		})

// 		sparkleMaterial = new THREE.ShaderMaterial({
// 			uniforms: {
// 				uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
// 				uTexture1: { type: "t", value: t1 },
// 				uTexture2: { type: "t", value: t2 },
// 				uTexture3: { type: "t", value: t4 },
// 			},

// 			side: THREE.DoubleSide,
// 			transparent: true,

// 			depthTest: false,

// 			vertexShader: sparklev,
// 			fragmentShader: sparklef,
// 		})

// 		// lightShaftMaterial = new THREE.ShaderMaterial( {
// 		//     uniforms: {
// 		//         uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
// 		//         uTexture1: { type: "t", value: t3 },
// 		//         uTexture2: { type: "t", value: t2 },
// 		//     },

// 		//     side: THREE.DoubleSide,
// 		//     transparent: false,

// 		//     depthTest: false,

// 		//     vertexShader: lightshaftv,
// 		//     fragmentShader: lightshaftf,
// 		// } );

// 		// quadClearMaterial = new THREE.ShaderMaterial( {
// 		//     side: THREE.DoubleSide,
// 		//     transparent: true,

// 		//     blending: THREE.CustomBlending,
// 		//     blendDst: THREE.OneMinusSrcAlphaFactor,
// 		//     blendDstAlpha: THREE.ZeroFactor,
// 		//     blendSrc: THREE.ZeroFactor,
// 		//     blendSrcAlpha: THREE.ZeroFactor,

// 		//     vertexShader:   quadclearv,
// 		//     fragmentShader: quadclearf,
// 		// });

// 		window.addEventListener("mousemove", onMouseMove)

// 		clock.start()
// 		animate()
// 	}

// 	window.addEventListener("mousedown", function () {
// 		mouseDown = true
// 	})
// 	window.addEventListener("mouseup", function () {
// 		mouseDown = false
// 	})

// 	window.addEventListener("resize", () => {
// 		camera.aspect = window.innerWidth / window.innerHeight
// 		camera.updateProjectionMatrix()

// 		lineMaterial.uniforms.uResolution.value = new THREE.Vector2(
// 			innerWidth,
// 			innerHeight
// 		)
// 		sparkleMaterial.uniforms.uResolution.value = new THREE.Vector2(
// 			innerWidth,
// 			innerHeight
// 		)
// 		aspectRatio = innerWidth / innerHeight

// 		renderer.setSize(window.innerWidth, window.innerHeight)
// 	})
// }

// let followCumulative = 0
// let velocityExp = 0
// function animate(now) {
// 	requestAnimationFrame(animate)

// 	now *= 0.001

// 	// DON'T MOVE THE ORDER OF THESE TWO CALLS
// 	let delta = clock.getDelta()
// 	let time = clock.getElapsedTime()

// 	followCumulative = followCumulative * 0.92 + cumulativeUvy * 0.08
// 	if (isNaN(followCumulative)) followCumulative = 0
// 	followCumulative = Math.min(followCumulative, cumulativeUvy - 0.1)

// 	lineMaterial.uniforms.uTime.value = time
// 	lineMaterial.uniforms.uUVYheadStart.value = followCumulative // cumulativeUvy - 0.1;
// 	lineMaterial.uniforms.uUVYheadLength.value = cumulativeUvy - followCumulative //0.1;
// 	lineMaterial.uniforms.uCumulativeY.value = cumulativeUvy //0.1;

// 	if (mouseDown) {
// 		mouseMixer += delta * 10
// 		mouseMixer = Math.min(mouseMixer, 1)
// 	} else {
// 		mouseMixer -= delta * 10
// 		mouseMixer = Math.max(mouseMixer, 0)
// 	}

// 	let atd = 0.01
// 	textureDisp = textureDisp
// 		.clone()
// 		.multiplyScalar(1 - atd)
// 		.add(lastTextureDisp.clone().multiplyScalar(atd))
// 	lineMaterial.uniforms.uMouseTextureDisp.value = textureDisp

// 	let a = lineExpFactor
// 	// because of the exponential averaging of lastMousePos,  minDistBeforeActivation is probably broken
// 	// and wont behave the way I've intended to
// 	let minDistBeforeActivation = 0.0 //0.0075;

// 	let newPos = vec3(
// 		currMousePos.x * a + lastMousePos.x * (1 - a),
// 		currMousePos.y * a + lastMousePos.y * (1 - a),
// 		currMousePos.z * a + lastMousePos.z * (1 - a)
// 	)

// 	let dist = lastMousePos.distanceTo(newPos)

// 	velocityExp = velocityExp * speedExpFactor + dist * (1 - speedExpFactor)

// 	if (dist > minDistBeforeActivation) {
// 		cumulativeUvy += dist // * ( 7 + Math.sin(cumulativeUvy * 5 + time * 3) * 3 );
// 		if (isNaN(cumulativeUvy)) cumulativeUvy = 0

// 		// prevents the first point from being interpolated with vec3(0,0,0)
// 		if (linePoints.length === 0) {
// 			newPos = currMousePos
// 			velocityExp = 0
// 		}

// 		let velocityOpacity = Math.min(velocityExp * 40, 1)
// 		linePoints.push({
// 			v: newPos,
// 			opacity: 1,
// 			velocityOpacity: velocityOpacity,
// 			uvy: cumulativeUvy,
// 			mouseMixer: mouseMixer,
// 		})

// 		// console.log(velocityOpacity.toFixed(2));

// 		let num = Math.floor((dist + 0.01) * sparklesCount)
// 		let rs = 5
// 		let sparkleBackDir = lastMousePos
// 			.clone()
// 			.sub(newPos)
// 			.normalize()
// 			.multiplyScalar(0.1)
// 		for (let i = 0; i < num; i++)
// 			sparkles.push({
// 				v: newPos
// 					.clone()
// 					.add(vec3(Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1, 0))
// 					.add(sparkleBackDir),
// 				opacity: 0.8 * velocityOpacity,
// 				mouseMixer: mouseMixer,
// 				vel: lastMousePos
// 					.clone()
// 					.add(newPos)
// 					.normalize()
// 					.add(
// 						vec3(
// 							Math.random() * -rs + rs * 0.5,
// 							Math.random() * -rs + rs * 0.5,
// 							Math.random() * -rs + rs * 0.5
// 						)
// 					)
// 					.multiplyScalar(0.0025),
// 				size: 0.0025 + Math.random() * 0.01,
// 			})

// 		// let minimumSpeedToShowShafts = 0.01;
// 		// if(dist > minimumSpeedToShowShafts) {
// 		//     let shaftdir = lastMousePos.clone().sub(newPos).normalize();
// 		//     shaftdir = vec3(-shaftdir.y, shaftdir.x);
// 		//     if(Math.random() > 0.5) {
// 		//         shaftdir.negate();
// 		//     }
// 		//     let shaftorigin = lastMousePos.clone().sub(shaftdir.clone().multiplyScalar(0 + 0.1 * Math.random()));
// 		//     let normal = lastMousePos.clone().sub(newPos).normalize();
// 		//     for(let i = 0; i < 20; i++)
// 		//     lightShafts.push({
// 		//         v:   shaftorigin.clone().add(normal.clone().multiplyScalar(Math.random() * 0.2)),
// 		//         dir: shaftdir,
// 		//         opacity: 1,
// 		//         n:   normal,
// 		//         lenMult: Math.random(),
// 		//         mouseMixer: mouseMixer,
// 		//     });
// 		// }

// 		lastMousePos = newPos
// 	}

// 	updateOpacity(delta)
// 	// constructLightShaftGeometry();
// 	constructSparkleGeometry()
// 	constructGeometry()

// 	// lightShaftMaterial.transparent = true;
// 	// lightShaftMaterial.blending = THREE.CustomBlending;
// 	// lightShaftMaterial.blendSrc = THREE.OneFactor;
// 	// lightShaftMaterial.blendDst = THREE.OneFactor;
// 	// lightShaftMaterial.blendSrcAlpha = THREE.OneFactor;
// 	// lightShaftMaterial.blendDstAlpha = THREE.OneFactor;
// 	// // renderer.render(scene, camera);

// 	// if(scene.getObjectByName("line"))
// 	//     scene.getObjectByName("line").material.visible = false;
// 	// if(scene.getObjectByName("sparkles"))
// 	//     scene.getObjectByName("sparkles").material.visible = false;
// 	// if(scene.getObjectByName("lightShafts"))
// 	//     scene.getObjectByName("lightShafts").material.visible = true;
// 	// renderer.render(scene, camera);

// 	// scene.background = undefined;
// 	// if(scene.getObjectByName("line"))
// 	//     scene.getObjectByName("line").material.visible = true;
// 	// if(scene.getObjectByName("sparkles"))
// 	//     scene.getObjectByName("sparkles").material.visible = true;
// 	// if(scene.getObjectByName("lightShafts"))
// 	//     scene.getObjectByName("lightShafts").material.visible = false;
// 	renderer.render(scene, camera)
// }

// // let omncesaf = 0;
// function updateOpacity(delta) {
// 	for (let linePoint of linePoints) {
// 		linePoint.opacity -= delta * opacityDecrement
// 	}
// 	// this filter routine might need a modification to solve TODO .1
// 	linePoints = linePoints.filter((e, i) => {
// 		// if(e.opacity < -0.2 && omncesaf === 0) {
// 		//     console.log(linePoints[0] === e);
// 		//     console.log(e);
// 		//     omncesaf = 1;
// 		// }

// 		// we can't delete an element if the successor still has some opacity left, this can cause little artifacts
// 		// if we move lines really fast
// 		if (linePoints.length > i + 1) {
// 			return e.opacity > -0.2 || linePoints[i + 1].opacity > -0.2
// 		}

// 		return e.opacity > -0.2
// 	})

// 	for (let sparkle of sparkles) {
// 		sparkle.opacity -= delta * opacityDecrement * 1.54
// 	}
// 	// this filter routine might need a modification to solve TODO .1
// 	sparkles = sparkles.filter((e) => e.opacity > 0)

// 	for (let lightShaft of lightShafts) {
// 		lightShaft.opacity -= delta * 1.385
// 	}
// 	// this filter routine might need a modification to solve TODO .1
// 	lightShafts = lightShafts.filter((e) => e.opacity > 0)
// }

// function constructGeometry() {
// 	// this has to run at the beginning of the function otherwise we run the risk of never deleting stale lines
// 	let prevMesh = scene.getObjectByName("line")
// 	if (prevMesh) {
// 		scene.remove(prevMesh)
// 	}

// 	// this if-statement might need a modification to solve TODO .1
// 	if (linePoints.length < 3) return

// 	let newPoints = []
// 	function CubicInterpolate(y0, y1, y2, y3, mu) {
// 		let a0, a1, a2, a3, mu2

// 		mu2 = mu * mu

// 		a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3
// 		a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3
// 		a2 = -0.5 * y0 + 0.5 * y2
// 		a3 = y1

// 		return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3
// 	}

// 	// create fake first element if necessary
// 	linePoints.splice(0, 0, {
// 		v: linePoints[0].v
// 			.clone()
// 			.add(
// 				linePoints[1].v
// 					.clone()
// 					.sub(linePoints[0].v)
// 					.normalize()
// 					.multiplyScalar(-0.02)
// 			),
// 		opacity: linePoints[0].opacity,
// 		velocityOpacity: linePoints[0].velocityOpacity,
// 	})

// 	// cube spline new points
// 	for (let i = 1; i < linePoints.length - 2; i++) {
// 		let p0 = linePoints[i - 1].v
// 		let p1 = linePoints[i].v
// 		let p2 = linePoints[i + 1].v
// 		let p3 = linePoints[i + 2].v

// 		let n0 = p0.clone().sub(p1).normalize()
// 		let n1 = p1.clone().sub(p2).normalize()
// 		let n2 = p2.clone().sub(p3).normalize()

// 		let uvy1 = linePoints[i].uvy
// 		let uvy2 = linePoints[i + 1].uvy

// 		let vo1 = linePoints[i].velocityOpacity
// 		let vo2 = linePoints[i + 1].velocityOpacity

// 		let mm1 = linePoints[i].mouseMixer
// 		let mm2 = linePoints[i + 1].mouseMixer

// 		let dot1 = n0.dot(n1)
// 		let dot2 = n0.dot(n2)
// 		let biggestProblematicDot = dot1 < dot2 ? dot1 : dot2

// 		let dotT = (biggestProblematicDot * -1 + 1) / 2

// 		let o0 = linePoints[i].opacity
// 		let o1 = linePoints[i + 1].opacity

// 		let segments = Math.max(30 * dotT, 1)

// 		// these two lines below seems to solve a very obscure bug that drove me crazy for 2 hours
// 		let js = 1
// 		if (i === 1) js = 0

// 		for (let j = js; j <= segments; j++) {
// 			let mu = j / segments

// 			let x = CubicInterpolate(p0.x, p1.x, p2.x, p3.x, mu)
// 			let y = CubicInterpolate(p0.y, p1.y, p2.y, p3.y, mu)

// 			let o = o0 * (1 - mu) + o1 * mu

// 			newPoints.push({
// 				v: vec3(x, y, 0),
// 				opacity: o,
// 				velocityOpacity: vo1 * (1 - mu) + vo2 * mu,
// 				uvy: uvy1 * (1 - mu) + uvy2 * mu,
// 				mouseMixer: mm1 * (1 - mu) + mm2 * mu,
// 			})
// 		}
// 	}

// 	// delete fake first element
// 	linePoints.shift()

// 	// compute initially intermediary normals, the normals at the begin and the end of the trail will be handled separately
// 	for (let i = 1; i < newPoints.length - 1; i++) {
// 		let p0 = newPoints[i - 1].v
// 		let p1 = newPoints[i].v
// 		let p2 = newPoints[i + 1].v

// 		let pn = p0.clone().sub(p2).normalize()
// 		let n = vec3(-pn.y, pn.x, 0)
// 		newPoints[i].n = n
// 	}

// 	// tail normal
// 	{
// 		let p0 = newPoints[0].v
// 		let p1 = newPoints[1].v

// 		let pn = p0.clone().sub(p1).normalize()
// 		let n = vec3(-pn.y, pn.x, 0)
// 		newPoints[0].n = n
// 	}

// 	// head normal
// 	{
// 		let p0 = newPoints[newPoints.length - 2].v
// 		let p1 = newPoints[newPoints.length - 1].v

// 		let pn = p0.clone().sub(p1).normalize()
// 		let n = vec3(-pn.y, pn.x, 0)
// 		newPoints[newPoints.length - 1].n = n
// 	}

// 	// construct geometry
// 	let vertices = []
// 	let uvs = []
// 	let fxs = []
// 	for (let i = 0; i < newPoints.length - 1; i++) {
// 		// Get the current and next points
// 		let p1 = newPoints[i].v
// 		let p2 = newPoints[i + 1].v

// 		// Get the mouse mixer values for the current and next points
// 		let mm1 = newPoints[i].mouseMixer
// 		let mm2 = newPoints[i + 1].mouseMixer

// 		// Get the UVY values for the current and next points
// 		let uvy1 = newPoints[i].uvy
// 		let uvy2 = newPoints[i + 1].uvy

// 		// Get the normals for the current and next points
// 		let n1 = newPoints[i].n
// 		let n2 = newPoints[i + 1].n

// 		// Initialize vectors for the vertices
// 		let v1 = vec3(0, 0, 0)
// 		let v2 = vec3(0, 0, 0)
// 		let v3 = vec3(0, 0, 0)
// 		let v4 = vec3(0, 0, 0)

// 		// Calculate the positions of the vertices
// 		v1.copy(p1.clone().sub(n1.clone().multiplyScalar(lineSize)))
// 		v2.copy(p1.clone().add(n1.clone().multiplyScalar(lineSize)))
// 		v3.copy(p2.clone().sub(n2.clone().multiplyScalar(lineSize)))
// 		v4.copy(p2.clone().add(n2.clone().multiplyScalar(lineSize)))

// 		// Calculate the direction vectors for the lines
// 		let lineDirv1 = v3.clone().sub(v1)
// 		let lineDirv2 = v4.clone().sub(v2)
// 		let lineDirv3 = v3.clone().sub(v1)
// 		let lineDirv4 = v4.clone().sub(v2)

// 		// If not the last segment, calculate the direction vectors for the next segment
// 		if (i < newPoints.length - 2) {
// 			let v5 = vec3(0, 0, 0)
// 			let v6 = vec3(0, 0, 0)
// 			v5.copy(
// 				newPoints[i + 2].v
// 					.clone()
// 					.sub(newPoints[i + 2].n.clone().multiplyScalar(lineSize))
// 			)
// 			v6.copy(
// 				newPoints[i + 2].v
// 					.clone()
// 					.add(newPoints[i + 2].n.clone().multiplyScalar(lineSize))
// 			)

// 			lineDirv3 = v5.clone().sub(v3)
// 			lineDirv4 = v6.clone().sub(v4)
// 		}

// 		// Add the vertices to the vertices array
// 		vertices.push(v1.x, v1.y, v1.z)
// 		vertices.push(v2.x, v2.y, v2.z)
// 		vertices.push(v3.x, v3.y, v3.z)

// 		vertices.push(v2.x, v2.y, v2.z)
// 		vertices.push(v3.x, v3.y, v3.z)
// 		vertices.push(v4.x, v4.y, v4.z)

// 		// Add the UV coordinates to the uvs array
// 		uvs.push(1, uvy1)
// 		uvs.push(0, uvy1)
// 		uvs.push(1, uvy2)

// 		uvs.push(0, uvy1)
// 		uvs.push(1, uvy2)
// 		uvs.push(0, uvy2)

// 		// Add the fx values to the fxs array
// 		fxs.push(
// 			newPoints[i].opacity * newPoints[i].velocityOpacity,
// 			mm1,
// 			lineDirv1.x,
// 			lineDirv1.y
// 		)
// 		fxs.push(
// 			newPoints[i].opacity * newPoints[i].velocityOpacity,
// 			mm1,
// 			lineDirv2.x,
// 			lineDirv2.y
// 		)
// 		fxs.push(
// 			newPoints[i + 1].opacity * newPoints[i + 1].velocityOpacity,
// 			mm2,
// 			lineDirv3.x,
// 			lineDirv3.y
// 		)

// 		fxs.push(
// 			newPoints[i].opacity * newPoints[i].velocityOpacity,
// 			mm1,
// 			lineDirv2.x,
// 			lineDirv2.y
// 		)
// 		fxs.push(
// 			newPoints[i + 1].opacity * newPoints[i + 1].velocityOpacity,
// 			mm2,
// 			lineDirv3.x,
// 			lineDirv3.y
// 		)
// 		fxs.push(
// 			newPoints[i + 1].opacity * newPoints[i + 1].velocityOpacity,
// 			mm2,
// 			lineDirv4.x,
// 			lineDirv4.y
// 		)
// 	}

// 	let geometry = new THREE.BufferGeometry()
// 	geometry.setAttribute(
// 		"position",
// 		new THREE.BufferAttribute(new Float32Array(vertices), 3)
// 	)
// 	geometry.setAttribute(
// 		"fx",
// 		new THREE.BufferAttribute(new Float32Array(fxs), 4)
// 	)
// 	geometry.setAttribute(
// 		"uv",
// 		new THREE.BufferAttribute(new Float32Array(uvs), 2)
// 	)
// 	let mesh = new THREE.Mesh(geometry, lineMaterial)
// 	mesh.name = "line"

// 	scene.add(mesh)

// 	// if(window.maxv === undefined) window.maxv = 0;
// 	// if(window.maxv < (vertices.length / 3)) {
// 	//     window.maxv = vertices.length / 3;
// 	//     console.log(window.maxv);
// 	// }
// }

// function constructSparkleGeometry() {
// 	// update velocities
// 	for (let i = 0; i < sparkles.length - 1; i++) {
// 		let sparkle = sparkles[i]
// 		sparkle.vel.x *= 0.97
// 		sparkle.vel.y *= 0.97

// 		sparkle.v.add(sparkle.vel)
// 	}

// 	// construct geometry
// 	let vertices = []
// 	let fxs = []
// 	for (let i = 0; i < sparkles.length - 1; i++) {
// 		let sparkle = sparkles[i]
// 		let v = sparkle.v
// 		let mm = sparkle.mouseMixer
// 		let size = sparkle.size

// 		let opacity = sparkle.opacity
// 		if (opacity > 0.7) {
// 			opacity = 1 - (opacity - 0.7) / 0.3
// 		} else {
// 			opacity = opacity / 0.7
// 		}

// 		opacity *= 0.7

// 		vertices.push(v.x, v.y, v.z)
// 		fxs.push(opacity, mm, size, 0)
// 	}

// 	var geometry = new THREE.BufferGeometry()
// 	geometry.setAttribute(
// 		"position",
// 		new THREE.BufferAttribute(new Float32Array(vertices), 3)
// 	)
// 	geometry.setAttribute(
// 		"fx",
// 		new THREE.BufferAttribute(new Float32Array(fxs), 4)
// 	)
// 	var mesh = new THREE.Points(geometry, sparkleMaterial)
// 	mesh.name = "sparkles"

// 	let prevMesh = scene.getObjectByName("sparkles")
// 	if (prevMesh) {
// 		scene.remove(prevMesh)
// 	}

// 	scene.add(mesh)
// }

// function constructLightShaftGeometry() {
// 	// construct geometry
// 	let vertices = []
// 	let uvs = []
// 	let fxs = []
// 	for (let i = 0; i < lightShafts.length; i++) {
// 		let lightShaft = lightShafts[i]
// 		let v = lightShaft.v
// 		let dir = lightShaft.dir
// 		let mm = lightShaft.mouseMixer
// 		let strength = lightShaft.strength
// 		// let mm = lightShaft.mouseMixer;

// 		let shaftSide = 0.05
// 		let shaftLength = 0.1 + lightShaft.lenMult * 0.2
// 		let n = lightShaft.n

// 		let v1 = v.clone().add(n.clone().multiplyScalar(shaftSide))
// 		let v2 = v.clone().sub(n.clone().multiplyScalar(shaftSide))
// 		let v3 = v
// 			.clone()
// 			.add(dir.clone().multiplyScalar(shaftLength))
// 			.add(n.clone().multiplyScalar(shaftSide))
// 		let v4 = v
// 			.clone()
// 			.add(dir.clone().multiplyScalar(shaftLength))
// 			.sub(n.clone().multiplyScalar(shaftSide))

// 		let opacity = lightShaft.opacity

// 		vertices.push(v1.x, v1.y, v1.z)
// 		vertices.push(v2.x, v2.y, v2.z)
// 		vertices.push(v3.x, v3.y, v3.z)

// 		vertices.push(v2.x, v2.y, v2.z)
// 		vertices.push(v3.x, v3.y, v3.z)
// 		vertices.push(v4.x, v4.y, v4.z)

// 		uvs.push(0, 0)
// 		uvs.push(1, 0)
// 		uvs.push(0, 1)

// 		uvs.push(1, 0)
// 		uvs.push(0, 1)
// 		uvs.push(1, 1)

// 		fxs.push(opacity, mm, n.x, n.y)
// 		fxs.push(opacity, mm, n.x, n.y)
// 		fxs.push(opacity, mm, n.x, n.y)

// 		fxs.push(opacity, mm, n.x, n.y)
// 		fxs.push(opacity, mm, n.x, n.y)
// 		fxs.push(opacity, mm, n.x, n.y)
// 	}

// 	var geometry = new THREE.BufferGeometry()
// 	geometry.setAttribute(
// 		"position",
// 		new THREE.BufferAttribute(new Float32Array(vertices), 3)
// 	)
// 	geometry.setAttribute(
// 		"uv",
// 		new THREE.BufferAttribute(new Float32Array(uvs), 2)
// 	)
// 	geometry.setAttribute(
// 		"fx",
// 		new THREE.BufferAttribute(new Float32Array(fxs), 4)
// 	)
// 	var mesh = new THREE.Mesh(geometry, lightShaftMaterial)
// 	mesh.name = "lightShafts"

// 	var clearMesh = new THREE.Mesh(
// 		new THREE.PlaneBufferGeometry(2, 2),
// 		quadClearMaterial
// 	)
// 	clearMesh.name = "quadClear"

// 	let prevMesh = scene.getObjectByName("lightShafts")
// 	let prevMesh2 = scene.getObjectByName("quadClear")
// 	if (prevMesh) {
// 		scene.remove(prevMesh)
// 	}
// 	if (prevMesh2) {
// 		scene.remove(prevMesh2)
// 	}

// 	scene.add(mesh)
// 	scene.add(clearMesh)
// }

// let currMousePos = vec3(0, 0, 0)
// let lastMousePos = vec3(0, 0, 0)
// let textureDisp = new THREE.Vector2(0, 0)
// let lastTextureDisp = new THREE.Vector2(0, 0)

// function onMouseMove(e) {
// 	let ux = (e.clientX / innerWidth) * 2 - 1
// 	let uy = ((innerHeight - e.clientY) / innerHeight) * 2 - 1

// 	let v = vec3(ux * aspectRatio, uy, 0)

// 	currMousePos = v

// 	lastTextureDisp = new THREE.Vector2(ux, uy)
// }

// export default LegendaryCursor

import * as THREE from "three"
import { linev, linef } from "./js/shaders/line"
import { sparklev, sparklef } from "./js/shaders/sparkle"

class LegendaryCursor {
	constructor(args = {}) {
		this.lineExpFactor = args.lineExpFactor || 0.6
		this.speedExpFactor = args.speedExpFactor || 0.8
		this.lineSize = args.lineSize || 0.15
		this.opacityDecrement = args.opacityDecrement || 0.55
		this.sparklesCount = args.sparklesCount || 65
		this.maxOpacity = args.maxOpacity || 1
		this.texture1 = args.texture1
		this.texture2 = args.texture2
		this.texture3 = args.texture3

		this.scene = new THREE.Scene()
		this.camera = new THREE.PerspectiveCamera(
			45,
			window.innerWidth / window.innerHeight,
			1,
			1000
		)
		this.camera.position.set(0, 0, 120)

		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			premultipliedAlpha: true,
		})
		this.renderer.autoClear = false
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.domElement.style.pointerEvents = "none"
		this.renderer.domElement.style.position = "fixed"
		this.renderer.domElement.style.top = "0"
		this.renderer.domElement.style.left = "0"
		this.renderer.domElement.style.zIndex = "99999"

		this.clock = new THREE.Clock()

		this.linePoints = []
		this.sparkles = []
		this.aspectRatio = window.innerWidth / window.innerHeight

		this.mouseDown = false
		this.mouseMixer = 0

		this.cumulativeUvy = 0
		this.followCumulative = 0
		this.velocityExp = 0

		this.currMousePos = new THREE.Vector3(0, 0, 0)
		this.lastMousePos = new THREE.Vector3(0, 0, 0)
		this.textureDisp = new THREE.Vector2(0, 0)
		this.lastTextureDisp = new THREE.Vector2(0, 0)

		this.boundAnimate = this.animate.bind(this)
		this.boundOnMouseMove = this.onMouseMove.bind(this)
		this.boundOnResize = this.onResize.bind(this)
		this.boundOnMouseDown = () => {
			this.mouseDown = true
		}
		this.boundOnMouseUp = () => {
			this.mouseDown = false
		}
	}

	async init() {
		document.body.appendChild(this.renderer.domElement)

		const [texture1, texture2, texture4] = await Promise.all([
			this.loadTexture(
				this.texture1 ||
					"https://domenicobrz.github.io/assets/legendary-cursor/t3.jpg"
			),
			this.loadTexture(
				this.texture2 ||
					"https://domenicobrz.github.io/assets/legendary-cursor/t6_1.jpg"
			),
			this.loadTexture(
				this.texture3 ||
					"https://domenicobrz.github.io/assets/legendary-cursor/ts.png"
			),
		])

		this.initMaterials(texture1, texture2, texture4)

		window.addEventListener("mousemove", this.boundOnMouseMove)
		window.addEventListener("mousedown", this.boundOnMouseDown)
		window.addEventListener("mouseup", this.boundOnMouseUp)
		window.addEventListener("resize", this.boundOnResize)

		this.clock.start()
		this.animate()
	}

	loadTexture(url) {
		return new Promise((resolve) => {
			new THREE.TextureLoader().load(url, (texture) => {
				texture.generateMipmaps = false
				texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
				texture.minFilter = THREE.LinearFilter
				resolve(texture)
			})
		})
	}

	initMaterials(texture1, texture2, texture4) {
		const linef2 = linef.replace(
			"float t = 2.5 - pow(vFx.x, 0.5) * 2.7;",
			`float t = 2.5 - pow(vFx.x, 0.5) * ${(2.7 * this.maxOpacity).toFixed(2)};`
		)

		this.lineMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
				uUVYheadStart: { value: 0 },
				uUVYheadLength: { value: 0 },
				uCumulativeY: { value: 0 },
				uTexture1: { type: "t", value: texture1 },
				uTexture2: { type: "t", value: texture2 },
				uPass: { value: 0 },
				uMouseTextureDisp: { value: new THREE.Vector2(0, 0) },
			},
			side: THREE.DoubleSide,
			transparent: true,
			depthTest: false,
			vertexShader: linev,
			fragmentShader: linef2,
		})

		this.sparkleMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
				uTexture1: { type: "t", value: texture1 },
				uTexture2: { type: "t", value: texture2 },
				uTexture3: { type: "t", value: texture4 },
			},
			side: THREE.DoubleSide,
			transparent: true,
			depthTest: false,
			vertexShader: sparklev,
			fragmentShader: sparklef,
		})
	}

	animate() {
		requestAnimationFrame(this.boundAnimate)

		const now = this.clock.getElapsedTime()
		const delta = this.clock.getDelta()

		this.updateFollowCumulative()
		this.updateLineUniforms(now)
		this.updateMouseMixer(delta)
		this.updateTextureDisp()
		this.updateCursorPosition(delta)
		this.updateOpacity(delta)
		this.constructSparkleGeometry()
		this.constructGeometry()

		this.renderer.render(this.scene, this.camera)
	}

	updateFollowCumulative() {
		this.followCumulative =
			this.followCumulative * 0.92 + this.cumulativeUvy * 0.08
		if (isNaN(this.followCumulative)) this.followCumulative = 0
		this.followCumulative = Math.min(
			this.followCumulative,
			this.cumulativeUvy - 0.1
		)
	}

	updateLineUniforms(time) {
		this.lineMaterial.uniforms.uTime.value = time
		this.lineMaterial.uniforms.uUVYheadStart.value = this.followCumulative
		this.lineMaterial.uniforms.uUVYheadLength.value =
			this.cumulativeUvy - this.followCumulative
		this.lineMaterial.uniforms.uCumulativeY.value = this.cumulativeUvy
	}

	updateMouseMixer(delta) {
		if (this.mouseDown) {
			this.mouseMixer += delta * 10
			this.mouseMixer = Math.min(this.mouseMixer, 1)
		} else {
			this.mouseMixer -= delta * 10
			this.mouseMixer = Math.max(this.mouseMixer, 0)
		}
	}

	updateTextureDisp() {
		const atd = 0.01
		this.textureDisp = this.textureDisp
			.clone()
			.multiplyScalar(1 - atd)
			.add(this.lastTextureDisp.clone().multiplyScalar(atd))
		this.lineMaterial.uniforms.uMouseTextureDisp.value = this.textureDisp
	}

	updateCursorPosition(delta) {
		const newPos = new THREE.Vector3(
			this.currMousePos.x * this.lineExpFactor +
				this.lastMousePos.x * (1 - this.lineExpFactor),
			this.currMousePos.y * this.lineExpFactor +
				this.lastMousePos.y * (1 - this.lineExpFactor),
			this.currMousePos.z * this.lineExpFactor +
				this.lastMousePos.z * (1 - this.lineExpFactor)
		)

		const dist = this.lastMousePos.distanceTo(newPos)

		this.velocityExp =
			this.velocityExp * this.speedExpFactor + dist * (1 - this.speedExpFactor)

		if (dist > 0) {
			this.cumulativeUvy += dist
			if (isNaN(this.cumulativeUvy)) this.cumulativeUvy = 0

			if (this.linePoints.length === 0) {
				newPos.copy(this.currMousePos)
				this.velocityExp = 0
			}

			const velocityOpacity = Math.min(this.velocityExp * 40, 1)
			this.linePoints.push({
				v: newPos,
				opacity: 1,
				velocityOpacity: velocityOpacity,
				uvy: this.cumulativeUvy,
				mouseMixer: this.mouseMixer,
			})

			this.addSparkles(newPos, dist, velocityOpacity)

			this.lastMousePos.copy(newPos)
		}
	}

	addSparkles(newPos, dist, velocityOpacity) {
		const num = Math.floor((dist + 0.01) * this.sparklesCount)
		const sparkleBackDir = this.lastMousePos
			.clone()
			.sub(newPos)
			.normalize()
			.multiplyScalar(0.1)

		for (let i = 0; i < num; i++) {
			this.sparkles.push({
				v: newPos
					.clone()
					.add(
						new THREE.Vector3(
							Math.random() * 0.2 - 0.1,
							Math.random() * 0.2 - 0.1,
							0
						)
					)
					.add(sparkleBackDir),
				opacity: 0.8 * velocityOpacity,
				mouseMixer: this.mouseMixer,
				vel: this.lastMousePos
					.clone()
					.add(newPos)
					.normalize()
					.add(
						new THREE.Vector3(
							Math.random() * -5 + 2.5,
							Math.random() * -5 + 2.5,
							Math.random() * -5 + 2.5
						)
					)
					.multiplyScalar(0.0025),
				size: 0.0025 + Math.random() * 0.01,
			})
		}
	}

	updateOpacity(delta) {
		this.linePoints.forEach((point) => (point.opacity -= 0.01))
		this.linePoints = this.linePoints.filter((e, i) => {
			if (this.linePoints.length > i + 1) {
				return e.opacity > -0.2 || this.linePoints[i + 1].opacity > -0.2
			}
			return e.opacity > -0.2
		})

		this.sparkles.forEach((sparkle) => {
			sparkle.opacity -= 0.01
			sparkle.vel.x *= 0.97
			sparkle.vel.y *= 0.97
			sparkle.v.add(sparkle.vel)
		})
		this.sparkles = this.sparkles.filter((e) => e.opacity > 0)
	}

	constructGeometry() {
		const prevMesh = this.scene.getObjectByName("line")
		if (prevMesh) {
			this.scene.remove(prevMesh)
		}

		if (this.linePoints.length < 3) return

		const newPoints = this.interpolatePoints(this.linePoints)
		const { vertices, uvs, fxs } = this.createLineGeometryData(newPoints)

		const geometry = new THREE.BufferGeometry()
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(vertices), 3)
		)
		geometry.setAttribute(
			"fx",
			new THREE.BufferAttribute(new Float32Array(fxs), 4)
		)
		geometry.setAttribute(
			"uv",
			new THREE.BufferAttribute(new Float32Array(uvs), 2)
		)

		const mesh = new THREE.Mesh(geometry, this.lineMaterial)
		mesh.name = "line"
		this.scene.add(mesh)
	}

	interpolatePoints() {
		const newPoints = []

		function cubicInterpolate(y0, y1, y2, y3, mu) {
			const mu2 = mu * mu
			const a0 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3
			const a1 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3
			const a2 = -0.5 * y0 + 0.5 * y2
			const a3 = y1

			return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3
		}

		// Create fake first element if necessary
		this.linePoints.unshift({
			v: this.linePoints[0].v
				.clone()
				.add(
					this.linePoints[1].v
						.clone()
						.sub(this.linePoints[0].v)
						.normalize()
						.multiplyScalar(-0.02)
				),
			opacity: this.linePoints[0].opacity,
			velocityOpacity: this.linePoints[0].velocityOpacity,
		})

		// Cubic spline interpolation
		for (let i = 1; i < this.linePoints.length - 2; i++) {
			const p0 = this.linePoints[i - 1].v
			const p1 = this.linePoints[i].v
			const p2 = this.linePoints[i + 1].v
			const p3 = this.linePoints[i + 2].v

			const n0 = p0.clone().sub(p1).normalize()
			const n1 = p1.clone().sub(p2).normalize()
			const n2 = p2.clone().sub(p3).normalize()

			const uvy1 = this.linePoints[i].uvy
			const uvy2 = this.linePoints[i + 1].uvy

			const vo1 = this.linePoints[i].velocityOpacity
			const vo2 = this.linePoints[i + 1].velocityOpacity

			const mm1 = this.linePoints[i].mouseMixer
			const mm2 = this.linePoints[i + 1].mouseMixer

			const dot1 = n0.dot(n1)
			const dot2 = n0.dot(n2)
			const biggestProblematicDot = Math.min(dot1, dot2)

			const dotT = (biggestProblematicDot * -1 + 1) / 2

			const o0 = this.linePoints[i].opacity
			const o1 = this.linePoints[i + 1].opacity

			const segments = Math.max(30 * dotT, 1)

			const js = i === 1 ? 0 : 1

			for (let j = js; j <= segments; j++) {
				const mu = j / segments

				const x = cubicInterpolate(p0.x, p1.x, p2.x, p3.x, mu)
				const y = cubicInterpolate(p0.y, p1.y, p2.y, p3.y, mu)

				const o = o0 * (1 - mu) + o1 * mu

				newPoints.push({
					v: new THREE.Vector3(x, y, 0),
					opacity: o,
					velocityOpacity: vo1 * (1 - mu) + vo2 * mu,
					uvy: uvy1 * (1 - mu) + uvy2 * mu,
					mouseMixer: mm1 * (1 - mu) + mm2 * mu,
				})
			}
		}

		// Delete fake first element
		this.linePoints.shift()

		// Compute normals
		for (let i = 1; i < newPoints.length - 1; i++) {
			const p0 = newPoints[i - 1].v
			const p1 = newPoints[i].v
			const p2 = newPoints[i + 1].v

			const pn = p0.clone().sub(p2).normalize()
			const n = new THREE.Vector3(-pn.y, pn.x, 0)
			newPoints[i].n = n
		}

		// Tail normal
		const tailP0 = newPoints[0].v
		const tailP1 = newPoints[1].v
		const tailPn = tailP0.clone().sub(tailP1).normalize()
		newPoints[0].n = new THREE.Vector3(-tailPn.y, tailPn.x, 0)

		// Head normal
		const headP0 = newPoints[newPoints.length - 2].v
		const headP1 = newPoints[newPoints.length - 1].v
		const headPn = headP0.clone().sub(headP1).normalize()
		newPoints[newPoints.length - 1].n = new THREE.Vector3(
			-headPn.y,
			headPn.x,
			0
		)

		return newPoints
	}

	createLineGeometryData(newPoints) {
		const vertices = []
		const uvs = []
		const fxs = []

		for (let i = 0; i < newPoints.length - 1; i++) {
			const p1 = newPoints[i].v
			const p2 = newPoints[i + 1].v
			const mm1 = newPoints[i].mouseMixer
			const mm2 = newPoints[i + 1].mouseMixer
			const uvy1 = newPoints[i].uvy
			const uvy2 = newPoints[i + 1].uvy
			const n1 = newPoints[i].n
			const n2 = newPoints[i + 1].n

			const v1 = p1.clone().sub(n1.clone().multiplyScalar(this.lineSize))
			const v2 = p1.clone().add(n1.clone().multiplyScalar(this.lineSize))
			const v3 = p2.clone().sub(n2.clone().multiplyScalar(this.lineSize))
			const v4 = p2.clone().add(n2.clone().multiplyScalar(this.lineSize))

			const lineDirv1 = v3.clone().sub(v1)
			const lineDirv2 = v4.clone().sub(v2)
			let lineDirv3 = v3.clone().sub(v1)
			let lineDirv4 = v4.clone().sub(v2)

			if (i < newPoints.length - 2) {
				const v5 = newPoints[i + 2].v
					.clone()
					.sub(newPoints[i + 2].n.clone().multiplyScalar(this.lineSize))
				const v6 = newPoints[i + 2].v
					.clone()
					.add(newPoints[i + 2].n.clone().multiplyScalar(this.lineSize))
				lineDirv3 = v5.clone().sub(v3)
				lineDirv4 = v6.clone().sub(v4)
			}

			vertices.push(
				v1.x,
				v1.y,
				v1.z,
				v2.x,
				v2.y,
				v2.z,
				v3.x,
				v3.y,
				v3.z,
				v2.x,
				v2.y,
				v2.z,
				v3.x,
				v3.y,
				v3.z,
				v4.x,
				v4.y,
				v4.z
			)

			uvs.push(1, uvy1, 0, uvy1, 1, uvy2, 0, uvy1, 1, uvy2, 0, uvy2)

			const opacity1 = newPoints[i].opacity * newPoints[i].velocityOpacity
			const opacity2 =
				newPoints[i + 1].opacity * newPoints[i + 1].velocityOpacity

			fxs.push(
				opacity1,
				mm1,
				lineDirv1.x,
				lineDirv1.y,
				opacity1,
				mm1,
				lineDirv2.x,
				lineDirv2.y,
				opacity2,
				mm2,
				lineDirv3.x,
				lineDirv3.y,
				opacity1,
				mm1,
				lineDirv2.x,
				lineDirv2.y,
				opacity2,
				mm2,
				lineDirv3.x,
				lineDirv3.y,
				opacity2,
				mm2,
				lineDirv4.x,
				lineDirv4.y
			)
		}

		return { vertices, uvs, fxs }
	}

	constructSparkleGeometry() {
		const { vertices, fxs } = this.createSparkleGeometryData()

		const geometry = new THREE.BufferGeometry()
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(vertices), 3)
		)
		geometry.setAttribute(
			"fx",
			new THREE.BufferAttribute(new Float32Array(fxs), 4)
		)

		const mesh = new THREE.Points(geometry, this.sparkleMaterial)
		mesh.name = "sparkles"

		const prevMesh = this.scene.getObjectByName("sparkles")
		if (prevMesh) {
			this.scene.remove(prevMesh)
		}

		this.scene.add(mesh)
	}

	createSparkleGeometryData() {
		const vertices = []
		const fxs = []

		for (let i = 0; i < this.sparkles.length - 1; i++) {
			const sparkle = this.sparkles[i]
			const v = sparkle.v
			const mm = sparkle.mouseMixer
			const size = sparkle.size

			let opacity = sparkle.opacity
			if (opacity > 0.7) {
				opacity = 1 - (opacity - 0.7) / 0.3
			} else {
				opacity = opacity / 0.7
			}

			opacity *= 0.7

			vertices.push(v.x, v.y, v.z)
			fxs.push(opacity, mm, size, 0)
		}

		return { vertices, fxs }
	}

	onMouseMove(e) {
		const ux = (e.clientX / innerWidth) * 2 - 1
		const uy = ((innerHeight - e.clientY) / innerHeight) * 2 - 1

		this.currMousePos.set(ux * this.aspectRatio, uy, 0)
		this.lastTextureDisp.set(ux, uy)
	}

	onResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.updateProjectionMatrix()

		this.lineMaterial.uniforms.uResolution.value.set(innerWidth, innerHeight)
		this.sparkleMaterial.uniforms.uResolution.value.set(innerWidth, innerHeight)
		this.aspectRatio = innerWidth / innerHeight

		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	cleanup() {
		window.removeEventListener("mousemove", this.boundOnMouseMove)
		window.removeEventListener("mousedown", this.boundOnMouseDown)
		window.removeEventListener("mouseup", this.boundOnMouseUp)
		window.removeEventListener("resize", this.boundOnResize)

		this.scene.remove(this.scene.getObjectByName("line"))
		this.scene.remove(this.scene.getObjectByName("sparkles"))

		this.renderer.dispose()
		this.lineMaterial.dispose()
		this.sparkleMaterial.dispose()

		document.body.removeChild(this.renderer.domElement)
	}
}

export default LegendaryCursor
