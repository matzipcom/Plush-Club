// Photoreal look for the arcade: procedural fabric textures, stuffed-plush shapes, real-world materials and lighting environment.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Deterministic PRNG so textures, plush shapes and resting poses are identical on every load.
export function seededRandom(seed) {
	let state = (seed >>> 0) || 1;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

// Soft indoor reflections for glass, chrome, plastic eyes and fabric sheen. Each WebGL renderer needs its own copy.
export function createEnvironment(renderer) {
	const pmrem = new THREE.PMREMGenerator(renderer);
	const room = new RoomEnvironment();
	const texture = pmrem.fromScene(room, 0.04).texture;
	room.dispose();
	pmrem.dispose();
	return texture;
}

function dataTexture(pixels, size, colorSpace) {
	const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipmapLinearFilter;
	texture.generateMipmaps = true;
	texture.anisotropy = 4;
	texture.colorSpace = colorSpace;
	texture.needsUpdate = true;
	return texture;
}

// Minky plush pile: thousands of short fibres combed in one direction. Low-frequency lumps come from puffGeometry instead,
// since any periodic shading here would tile into a visible pattern.
function createFurMaps(size = 512) {
	const random = seededRandom(7);
	const mask = size - 1;
	const height = new Float32Array(size * size);
	for (let strand = 0; strand < size * size * 0.8; strand += 1) {
		const x = random() * size;
		const y = random() * size;
		const angle = Math.PI / 2 + (random() - 0.5) * 1.3;
		const length = 2 + random() * 6;
		const strength = 0.25 + random() * 0.75;
		const stepX = Math.cos(angle);
		const stepY = Math.sin(angle);
		for (let t = 0; t < length; t += 1) {
			const index = ((Math.floor(y + stepY * t) & mask) * size) + (Math.floor(x + stepX * t) & mask);
			height[index] += strength * (1 - t / length);
		}
	}
	const blurred = new Float32Array(size * size);
	let max = 0;
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			let sum = 0;
			for (let oy = -1; oy <= 1; oy += 1) {
				for (let ox = -1; ox <= 1; ox += 1) sum += height[(((y + oy) & mask) * size) + ((x + ox) & mask)];
			}
			blurred[y * size + x] = sum / 9;
			max = Math.max(max, sum / 9);
		}
	}
	const normal = new Uint8Array(size * size * 4);
	const color = new Uint8Array(size * size * 4);
	const strength = 1.8;
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const at = (px, py) => blurred[((py & mask) * size) + (px & mask)] / max;
			const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
			const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
			const length = Math.hypot(dx, dy, 1);
			const offset = (y * size + x) * 4;
			normal[offset] = (-dx / length * 0.5 + 0.5) * 255;
			normal[offset + 1] = (-dy / length * 0.5 + 0.5) * 255;
			normal[offset + 2] = (1 / length * 0.5 + 0.5) * 255;
			normal[offset + 3] = 255;
			const shade = (0.82 + at(x, y) * 0.18) * 255;
			color[offset] = shade;
			color[offset + 1] = shade;
			color[offset + 2] = shade;
			color[offset + 3] = 255;
		}
	}
	const normalMap = dataTexture(normal, size, THREE.NoColorSpace);
	const colorMap = dataTexture(color, size, THREE.SRGBColorSpace);
	normalMap.repeat.set(8, 4);
	colorMap.repeat.set(8, 4);
	return { normalMap, colorMap };
}

const fur = createFurMaps();

export function tiledFurNormal(repeatX, repeatY) {
	const texture = fur.normalMap.clone();
	texture.repeat.set(repeatX, repeatY);
	return texture;
}

const fabricCache = new Map();

// Polyester minky fabric: matte base with a bright velvety rim (sheen) and visible pile.
export function plushFabric(color, { map = null, nap = 0.38 } = {}) {
	const key = `${color}|${map?.uuid || ""}|${nap}`;
	if (fabricCache.has(key)) return fabricCache.get(key);
	const base = new THREE.Color(map ? "#ffffff" : color);
	// Dyed polyester never reads as saturated as a screen colour.
	const hsl = base.getHSL({});
	base.setHSL(hsl.h, hsl.s * 0.78, hsl.l * 0.94);
	const fabric = new THREE.MeshPhysicalMaterial({
		color: base,
		map: map || fur.colorMap,
		normalMap: fur.normalMap,
		normalScale: new THREE.Vector2(nap, nap),
		roughness: 0.95,
		sheen: 1,
		sheenRoughness: 0.5,
		sheenColor: base.clone().lerp(new THREE.Color("#ffffff"), 0.3).multiplyScalar(0.55),
		envMapIntensity: 0.55,
	});
	fabricCache.set(key, fabric);
	return fabric;
}

// Felt appliqué (cheeks, inner ears, beaks): short dense fibres, no gloss.
export function feltFabric(color) {
	return plushFabric(color, { nap: 0.25 });
}

// Satin embroidery thread for noses and mouths.
export function embroideryThread(color) {
	return new THREE.MeshPhysicalMaterial({
		color, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.3, sheenColor: new THREE.Color("#8a7a74"),
		normalMap: fur.normalMap, normalScale: new THREE.Vector2(0.35, 0.35),
	});
}

// Moulded plastic safety eyes: near-black, mirror glossy.
export function safetyEyeMaterial() {
	return new THREE.MeshPhysicalMaterial({
		color: "#0a0a0c", roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6,
	});
}

const puffCache = new Map();

// Stuffed fabric panel: the stuffing pushes the skin into soft irregular lumps, a centre seam pinches it in,
// and parts that carry weight sag into a flat base.
export function puffGeometry({ seam = false, flatBottom = false, variant = 0, segments = 36 } = {}) {
	const key = `${seam}|${flatBottom}|${variant}|${segments}`;
	if (puffCache.has(key)) return puffCache.get(key);
	const random = seededRandom(variant * 977 + 13);
	const phase = Array.from({ length: 8 }, () => random() * Math.PI * 2);
	const shape = (n, out) => {
		let radius = 1
			+ 0.022 * Math.sin(2.7 * n.x + phase[0]) * Math.sin(2.3 * n.y + phase[1])
			+ 0.018 * Math.sin(3.4 * n.z + phase[2]) * Math.sin(3.1 * n.x + phase[3])
			+ 0.012 * Math.sin(5.3 * n.y + phase[4]) * Math.sin(4.7 * n.z + phase[5]);
		if (seam) {
			const across = Math.abs(n.x);
			radius -= 0.05 * Math.exp(-((across / 0.035) ** 2));
			radius += 0.014 * Math.exp(-(((across - 0.13) / 0.08) ** 2));
		}
		out.copy(n).multiplyScalar(radius);
		if (flatBottom && out.y < -0.74) out.y = -0.74 + (out.y + 0.74) * 0.2;
		return out;
	};
	const geometry = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.75));
	const position = geometry.attributes.position;
	const normal = geometry.attributes.normal;
	const n = new THREE.Vector3();
	const tangentA = new THREE.Vector3();
	const tangentB = new THREE.Vector3();
	const p0 = new THREE.Vector3();
	const p1 = new THREE.Vector3();
	const p2 = new THREE.Vector3();
	const probe = new THREE.Vector3();
	const up = new THREE.Vector3(0, 1, 0);
	const side = new THREE.Vector3(1, 0, 0);
	const epsilon = 0.002;
	for (let index = 0; index < position.count; index += 1) {
		n.fromBufferAttribute(position, index).normalize();
		shape(n, p0);
		// Analytic-style normals from neighbouring surface samples, so the UV seam and poles stay smooth.
		tangentA.crossVectors(Math.abs(n.y) < 0.95 ? up : side, n).normalize();
		tangentB.crossVectors(n, tangentA);
		shape(probe.copy(n).addScaledVector(tangentA, epsilon).normalize(), p1);
		shape(probe.copy(n).addScaledVector(tangentB, epsilon).normalize(), p2);
		p1.sub(p0);
		p2.sub(p0);
		const surfaceNormal = probe.crossVectors(p1, p2).normalize();
		if (surfaceNormal.dot(n) < 0) surfaceNormal.negate();
		position.setXYZ(index, p0.x, p0.y, p0.z);
		normal.setXYZ(index, surfaceNormal.x, surfaceNormal.y, surfaceNormal.z);
	}
	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();
	puffCache.set(key, geometry);
	return geometry;
}

// Large-format vinyl floor tiles like an arcade floor, with grout lines and per-tile tone variation.
export function createArcadeFloorTexture() {
	const size = 1024;
	const tiles = 4;
	const tile = size / tiles;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext("2d");
	const random = seededRandom(21);
	for (let row = 0; row < tiles; row += 1) {
		for (let column = 0; column < tiles; column += 1) {
			const tone = 196 + Math.floor(random() * 16);
			context.fillStyle = `rgb(${tone}, ${tone - 3}, ${tone - 8})`;
			context.fillRect(column * tile, row * tile, tile, tile);
		}
	}
	const image = context.getImageData(0, 0, size, size);
	for (let index = 0; index < image.data.length; index += 4) {
		const speck = (random() - 0.5) * 18 + (random() < 0.004 ? -40 : 0);
		image.data[index] += speck;
		image.data[index + 1] += speck;
		image.data[index + 2] += speck;
	}
	context.putImageData(image, 0, 0);
	context.strokeStyle = "rgba(92, 88, 82, 0.55)";
	context.lineWidth = 3;
	for (let line = 0; line <= tiles; line += 1) {
		context.beginPath();
		context.moveTo(line * tile, 0);
		context.lineTo(line * tile, size);
		context.moveTo(0, line * tile);
		context.lineTo(size, line * tile);
		context.stroke();
	}
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.anisotropy = 8;
	return texture;
}
