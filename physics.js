// Lightweight claw-machine physics. Pure functions with no THREE dependency so balance can be simulated in Node.

export const GRAVITY = 9.8;
export const FLOOR_Y = 0.69;
export const BOUNDS = { minX: -3.4, maxX: 3.4, minZ: -1.05, maxZ: 1.05 };
export const CHUTE = { x: 3.45, z: 1.02, halfX: 0.28, halfZ: 0.34, rimY: 1.26, bottomY: 0.2 };
export const TOY_RADIUS = 0.45;

// Shared by game3d.js and the balance simulation so tuning stays in one place.
export const CLAW_TUNING = {
	cableDepth: 4.02,
	dropSpeed: 5.8,
	armLength: 0.55,
	hangDepth: 0.78,
	lift: { accel: 2.6, brake: 9, baseSpeed: 4.6, weightSlow: 1.4, topShake: 0.62 },
	deliver: { maxSpeed: 3.8, accel: 6 },
	travel: { maxSpeed: 4.6, accel: 7 },
	control: { speedX: 4.7, speedZ: 3.4, accel: 22 },
	damping: { empty: 2.8, loaded: 1.1 },
};

const SWING_GAIN = 0.1;
const MAX_SWING = 0.32;
const SLIP_RATE = 5.5;

export function createSwing() {
	return { x: 0, z: 0, vx: 0, vz: 0 };
}

function swingAxis(theta, omega, accel, length, lengthRate, damping, dt) {
	// The 2·L'/L term conserves angular momentum: swings shrink as the cable pays out and grow as it reels in.
	const acc = -(GRAVITY / length) * Math.sin(theta)
		- (2 * lengthRate / length) * omega
		- SWING_GAIN * accel * Math.cos(theta) / length
		- damping * omega;
	omega += acc * dt;
	theta += omega * dt;
	if (Math.abs(theta) > MAX_SWING) {
		theta = Math.sign(theta) * MAX_SWING;
		omega *= -0.3;
	}
	return [theta, omega];
}

export function stepSwing(swing, { ax = 0, az = 0, length, lengthRate = 0, damping = 2 }, dt) {
	const steps = Math.max(1, Math.ceil(dt / 0.008));
	const h = dt / steps;
	const L = Math.max(0.45, length);
	for (let index = 0; index < steps; index += 1) {
		[swing.x, swing.vx] = swingAxis(swing.x, swing.vx, ax, L, lengthRate, damping, h);
		[swing.z, swing.vz] = swingAxis(swing.z, swing.vz, az, L, lengthRate, damping, h);
	}
}

// Sudden gantry velocity changes (e.g. stopping to drop) translate into an angular kick.
export function kickSwing(swing, deltaVx, deltaVz, length) {
	const L = Math.max(0.45, length);
	swing.vx -= SWING_GAIN * deltaVx / L;
	swing.vz -= SWING_GAIN * deltaVz / L;
}

function limitVector(x, z, max) {
	const length = Math.hypot(x, z);
	if (length <= max || length === 0) return [x, z];
	return [x / length * max, z / length * max];
}

// Accelerates the gantry toward a target velocity with a finite acceleration (motor inertia).
export function stepGantryVelocity(gantry, targetVx, targetVz, accel, dt) {
	const [changeX, changeZ] = limitVector(targetVx - gantry.vx, targetVz - gantry.vz, accel * dt);
	gantry.vx += changeX;
	gantry.vz += changeZ;
	gantry.x += gantry.vx * dt;
	gantry.z += gantry.vz * dt;
	return { ax: dt > 0 ? changeX / dt : 0, az: dt > 0 ? changeZ / dt : 0 };
}

// Trapezoidal move toward a point: accelerates, cruises, then brakes to arrive at rest.
export function stepGantryToward(gantry, targetX, targetZ, maxSpeed, accel, dt) {
	const dx = targetX - gantry.x;
	const dz = targetZ - gantry.z;
	const distance = Math.hypot(dx, dz);
	const speed = Math.hypot(gantry.vx, gantry.vz);
	if (distance < 0.005 && speed < accel * dt * 1.5) {
		const ax = dt > 0 ? -gantry.vx / dt : 0;
		const az = dt > 0 ? -gantry.vz / dt : 0;
		gantry.x = targetX;
		gantry.z = targetZ;
		gantry.vx = 0;
		gantry.vz = 0;
		const [limitedAx, limitedAz] = limitVector(ax, az, accel);
		return { ax: limitedAx, az: limitedAz, arrived: true };
	}
	const desiredSpeed = Math.min(maxSpeed, Math.sqrt(2 * accel * distance * 0.92));
	const scale = distance > 0 ? desiredSpeed / distance : 0;
	const result = stepGantryVelocity(gantry, dx * scale, dz * scale, accel, dt);
	if ((targetX - gantry.x) * dx + (targetZ - gantry.z) * dz < 0) {
		gantry.x = targetX;
		gantry.z = targetZ;
	}
	return { ...result, arrived: false };
}

// Real machines vary claw power from play to play; this spread is the main source of luck.
export function sampleClawPower(random = Math.random) {
	return 0.5 + random() * 2.04;
}

// Holding force the claw can exert this round. Centred grips seat the fingers slightly better.
export function gripStrength(quality, power) {
	return power * (0.92 + 0.08 * quality);
}

// Effective load the claw must resist: weight under vertical acceleration, plus swing and off-centre torque.
export function gripLoad({ weight, quality, verticalAccel = 0, shake = 0, swing }) {
	const mass = 0.5 + 0.55 * weight;
	const vertical = Math.max(0, 1 + verticalAccel / GRAVITY + shake);
	const torque = 1 + (1 - quality) * 0.35;
	const swingLoad = swing ? Math.abs(swing.x) + Math.abs(swing.z) + (Math.abs(swing.vx) + Math.abs(swing.vz)) * 0.09 : 0;
	return mass * (vertical * torque + swingLoad * 2.4);
}

export function stepSlip(progress, load, strength, dt) {
	return progress + Math.max(0, load - strength) * SLIP_RATE * dt;
}

export function isOverChute(x, z) {
	return Math.abs(x - CHUTE.x) < CHUTE.halfX && Math.abs(z - CHUTE.z) < CHUTE.halfZ;
}

export function createBody({ x, y, z, vx = 0, vy = 0, vz = 0, tiltX = 0, tiltZ = 0, spin = 0, random = Math.random }) {
	return {
		x, y, z, vx, vy, vz,
		tiltX, tiltZ,
		wTiltX: (random() - 0.5) * 3 + vz * 0.9,
		wTiltZ: (random() - 0.5) * 3 - vx * 0.9,
		restTiltX: (random() - 0.5) * 0.18,
		spin,
		spinRate: (random() - 0.5) * 2.4,
		squash: 0,
		squashVelocity: 0,
		captured: false,
		grounded: false,
		restTime: 0,
	};
}

function collideWithToys(body, others) {
	for (const other of others) {
		if (Math.abs(body.y - other.y) > 0.95) continue;
		let nx = body.x - other.x;
		let nz = body.z - other.z;
		let distance = Math.hypot(nx, nz);
		const minimum = TOY_RADIUS * 2;
		if (distance >= minimum) continue;
		if (distance < 0.0001) {
			const angle = Math.random() * Math.PI * 2;
			nx = Math.cos(angle);
			nz = Math.sin(angle);
			distance = 1;
		} else {
			nx /= distance;
			nz /= distance;
		}
		const overlap = minimum - Math.min(distance, minimum);
		// Plush is soft: the falling toy takes most of the correction, resting neighbours get nudged.
		body.x += nx * overlap * 0.7;
		body.z += nz * overlap * 0.7;
		other.nudge?.(-nx * overlap * 0.3, -nz * overlap * 0.3);
		const approaching = body.vx * nx + body.vz * nz;
		if (approaching < 0) {
			body.vx -= 1.35 * approaching * nx;
			body.vz -= 1.35 * approaching * nz;
		}
		// Landing on top of another plush makes it roll off sideways.
		if (body.y > other.y + 0.35 && body.vy < 0) {
			body.vx += nx * 0.9;
			body.vz += nz * 0.9;
		}
	}
}

function keepOutOfChute(body) {
	const insideX = CHUTE.halfX - Math.abs(body.x - CHUTE.x);
	const insideZ = CHUTE.halfZ - Math.abs(body.z - CHUTE.z);
	if (insideX <= 0 || insideZ <= 0) return;
	if (insideX < insideZ) {
		body.x = body.x < CHUTE.x ? CHUTE.x - CHUTE.halfX : CHUTE.x + CHUTE.halfX;
		body.vx *= -0.3;
	} else {
		body.z = body.z < CHUTE.z ? CHUTE.z - CHUTE.halfZ : CHUTE.z + CHUTE.halfZ;
		body.vz *= -0.3;
	}
}

// Advances a free plush. Returns "collected" when it falls through the prize chute, "settled" once at rest.
export function stepBody(body, others, dt) {
	const steps = Math.max(1, Math.ceil(dt / 0.008));
	const h = dt / steps;
	for (let index = 0; index < steps; index += 1) {
		body.vy -= GRAVITY * h;
		body.x += body.vx * h;
		body.y += body.vy * h;
		body.z += body.vz * h;
		body.spin += body.spinRate * h;

		if (body.captured) {
			const drag = Math.exp(-12 * h);
			body.vx *= drag;
			body.vz *= drag;
			body.x += (CHUTE.x - body.x) * Math.min(1, 10 * h);
			body.z += (CHUTE.z - body.z) * Math.min(1, 10 * h);
			body.tiltX = Math.max(-0.85, Math.min(0.85, body.tiltX + body.wTiltX * h));
			body.tiltZ = Math.max(-0.85, Math.min(0.85, body.tiltZ + body.wTiltZ * h));
			if (body.y <= CHUTE.bottomY) return "collected";
			continue;
		}

		const overChute = isOverChute(body.x, body.z);
		if (overChute && body.y > CHUTE.rimY - 0.3) {
			body.captured = true;
			continue;
		}
		if (!overChute || body.y <= CHUTE.rimY - 0.3) {
			if (body.x < BOUNDS.minX || body.x > BOUNDS.maxX) {
				body.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, body.x));
				body.vx *= -0.35;
				body.wTiltZ += body.vx * 1.5;
			}
			if (body.z < BOUNDS.minZ || body.z > BOUNDS.maxZ) {
				body.z = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, body.z));
				body.vz *= -0.35;
				body.wTiltX -= body.vz * 1.5;
			}
			keepOutOfChute(body);
		}
		collideWithToys(body, others);

		body.grounded = false;
		if (body.y <= FLOOR_Y) {
			body.y = FLOOR_Y;
			body.grounded = true;
			if (body.vy < -0.7) {
				const impact = -body.vy;
				body.squashVelocity += Math.min(4.5, impact * 0.75);
				body.vy = impact * 0.24;
				body.vx *= 0.62;
				body.vz *= 0.62;
				body.wTiltX += body.vz * 1.6;
				body.wTiltZ -= body.vx * 1.6;
				body.spinRate *= 0.5;
			} else {
				body.vy = 0;
			}
		}

		if (body.grounded) {
			const friction = Math.exp(-6.5 * h);
			body.vx *= friction;
			body.vz *= friction;
			body.spinRate *= Math.exp(-7 * h);
			body.wTiltX += (-38 * (body.tiltX - body.restTiltX) - 7 * body.wTiltX) * h;
			body.wTiltZ += (-38 * body.tiltZ - 7 * body.wTiltZ) * h;
		} else {
			body.wTiltX *= Math.exp(-0.6 * h);
			body.wTiltZ *= Math.exp(-0.6 * h);
		}
		body.tiltX = Math.max(-0.85, Math.min(0.85, body.tiltX + body.wTiltX * h));
		body.tiltZ = Math.max(-0.85, Math.min(0.85, body.tiltZ + body.wTiltZ * h));
		body.squashVelocity += (-150 * body.squash - 11 * body.squashVelocity) * h;
		body.squash = Math.max(-0.15, Math.min(0.3, body.squash + body.squashVelocity * h));
	}

	const calm = body.grounded
		&& Math.hypot(body.vx, body.vy, body.vz) < 0.06
		&& Math.abs(body.wTiltX) + Math.abs(body.wTiltZ) < 0.08
		&& Math.abs(body.squash) < 0.006;
	body.restTime = calm ? body.restTime + dt : 0;
	return body.restTime > 0.25 ? "settled" : null;
}
