// Rigid-body claw machine simulation modelled on how Claw Machine Sim plays: nothing about a round is decided by dice.
// The claw hangs from a cable, its three prongs are motor-driven hinges with a limited holding torque, and every plush
// is a compound of convex hulls, so lifting, slipping and dropping into the chute all come out of contact forces and
// friction. Pure module with no THREE dependency: pass in an initialised RAPIER namespace so it also runs in Node.

export const WORLD_SCALE = 0.23; // metres per world unit: a plush is about 20 cm tall
export const GRAVITY = 9.81 / WORLD_SCALE;
export const FLOOR_Y = 0.69;
// Where plush centres may be placed in the prize pit of a single-player upright cabinet.
export const BOUNDS = { minX: -1.62, maxX: 1.62, minZ: -1.14, maxZ: 1.14 };
// The chute sits in the front-left corner against the glass; a plush only counts once it falls through the opening.
export const CHUTE = { x: -1.45, z: 1.0, halfX: 0.6, halfZ: 0.6, rimY: 1.26 };
export const MAX_STEP = 1 / 120;

// Claw-local geometry shared by the rendered claw and its colliders. Values are in the model's own units;
// the whole claw is drawn and simulated at `scale` so it opens wider than the plush, like a real plush crane.
export const CLAW_GEOMETRY = {
	scale: 1.35,
	pivotY: 0.2, // where the cable leaves the carriage, in world units above the carriage origin
	anchorY: 0.24, // the cable is tied to the top of the claw head
	head: [{ radius: 0.15, bottom: -0.11, top: 0.17 }, { radius: 0.075, bottom: -0.19, top: -0.11 }],
	hinge: { y: -0.14, radial: 0.09 },
	// Prong centreline in its hinge frame as [down, outward] pairs, fully closed.
	prong: [[0, 0], [-0.08, 0.1], [-0.24, 0.13], [-0.38, 0.06], [-0.43, -0.03]],
	prongRadius: 0.022,
	tipRadius: 0.03,
	openAngle: 0.78,
	overtravel: 0.08,
};

// Shared by game3d.js and the balance simulation so tuning stays in one place.
export const CLAW_TUNING = {
	cableDepth: 2.62,
	drop: { speed: 3.6, accel: 16 },
	lift: { speed: 2.6, accel: 5 },
	deliver: { maxSpeed: 3.2, accel: 5 },
	travel: { maxSpeed: 4.6, accel: 7 },
	control: { speedX: 4.7, speedZ: 3.4, accel: 22 },
	// The winch stops paying out once the cable goes slack, i.e. the claw is resting on plush or the floor.
	landing: { slack: 0.035, speed: 0.5, hold: 0.05 },
	settleTime: 0.3,
	closeTime: 0.8,
	topPause: 0.4,
	releaseDelay: 0.35,
	releaseTime: 1.8,
	headMass: 0.45,
	fingerMass: 0.04,
	swingDamping: 1.1,
	dock: { range: 0.04, stiffness: 2.2, damping: 0.16 },
	// Chrome prongs slide over fabric far more easily than fabric grips fabric.
	finger: { closeSpeed: 2.2, openSpeed: 3, openPower: 3, friction: 0.55 },
	// Prong motor torque. Real machines grab at full power and drop to a weaker hold once the claw rises.
	power: {
		fun: { grab: 9, pickup: 9, carry: 9 },
		realistic: { grab: 5, pickup: 3.4, carry: 2.2 },
	},
	plush: {
		friction: 1, restitution: 0.04, linearDamping: 0.15, angularDamping: 1.2,
		massBase: 0.08, massPerWeight: 0.3,
		// Hulls are slightly narrower than the fabric so prongs visibly sink into the stuffing.
		squeeze: 0.9,
	},
};

export function plushMass(weight) {
	return CLAW_TUNING.plush.massBase + CLAW_TUNING.plush.massPerWeight * weight;
}

const GROUP = { env: 0x0001, toy: 0x0002, claw: 0x0004 };
const interaction = (member, filter) => (member << 16) | filter;
const ENV_GROUPS = interaction(GROUP.env, GROUP.toy | GROUP.claw);
const TOY_GROUPS = interaction(GROUP.toy, GROUP.env | GROUP.toy | GROUP.claw);
const CLAW_GROUPS = interaction(GROUP.claw, GROUP.env | GROUP.toy);
const CONTACT_SLOP = 0.012;
const ROPE_AXIS = 0; // JointAxis.LinX: a rope joint is a coupled linear limit on this axis

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
}

// Trapezoidal move toward a point: accelerates, cruises, then brakes to arrive at rest. Returns true on arrival.
export function stepGantryToward(gantry, targetX, targetZ, maxSpeed, accel, dt) {
	const dx = targetX - gantry.x;
	const dz = targetZ - gantry.z;
	const distance = Math.hypot(dx, dz);
	const speed = Math.hypot(gantry.vx, gantry.vz);
	if (distance < 0.005 && speed < accel * dt * 1.5) {
		gantry.x = targetX;
		gantry.z = targetZ;
		gantry.vx = 0;
		gantry.vz = 0;
		return true;
	}
	const desiredSpeed = Math.min(maxSpeed, Math.sqrt(2 * accel * distance * 0.92));
	const scale = distance > 0 ? desiredSpeed / distance : 0;
	stepGantryVelocity(gantry, dx * scale, dz * scale, accel, dt);
	if ((targetX - gantry.x) * dx + (targetZ - gantry.z) * dz < 0) {
		gantry.x = targetX;
		gantry.z = targetZ;
	}
	return false;
}

export function isInChute(x, z) {
	return Math.abs(x - CHUTE.x) < CHUTE.halfX && Math.abs(z - CHUTE.z) < CHUTE.halfZ;
}

// True when a plush centred at (x, z) with the given radius would overlap the chute box.
export function overlapsChute(x, z, radius = 0.32) {
	return Math.abs(x - CHUTE.x) < CHUTE.halfX + radius && Math.abs(z - CHUTE.z) < CHUTE.halfZ + radius;
}

function scaledClawGeometry() {
	const { scale, pivotY, anchorY, head, hinge, prong, prongRadius, tipRadius, openAngle, overtravel } = CLAW_GEOMETRY;
	return {
		pivotY,
		anchorY: anchorY * scale,
		head: head.map((part) => ({ radius: part.radius * scale, bottom: part.bottom * scale, top: part.top * scale })),
		hinge: { y: hinge.y * scale, radial: hinge.radial * scale },
		prong: prong.map(([down, out]) => [down * scale, out * scale]),
		prongRadius: prongRadius * scale,
		tipRadius: tipRadius * scale,
		openAngle,
		overtravel,
	};
}

function multiplyQuat(a, b) {
	return {
		x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
		y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
		z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
		w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
	};
}

function rotateVector(q, v) {
	const tx = 2 * (q.y * v.z - q.z * v.y);
	const ty = 2 * (q.z * v.x - q.x * v.z);
	const tz = 2 * (q.x * v.y - q.y * v.x);
	return {
		x: v.x + q.w * tx + q.y * tz - q.z * ty,
		y: v.y + q.w * ty + q.z * tx - q.x * tz,
		z: v.z + q.w * tz + q.x * ty - q.y * tx,
	};
}

// Shortest rotation taking +Y onto the unit vector d (capsules are built along Y).
function quatFromY(d) {
	if (d.y < -0.999999) return { x: 1, y: 0, z: 0, w: 0 };
	const q = { x: d.z, y: 0, z: -d.x, w: 1 + d.y };
	const length = Math.hypot(q.x, q.z, q.w);
	return { x: q.x / length, y: 0, z: q.z / length, w: q.w / length };
}

// Narrows a part horizontally about its centre so prongs press into the stuffing before meeting resistance.
function squeezePart(points) {
	let minX = Infinity;
	let maxX = -Infinity;
	let minZ = Infinity;
	let maxZ = -Infinity;
	for (let index = 0; index < points.length; index += 3) {
		minX = Math.min(minX, points[index]);
		maxX = Math.max(maxX, points[index]);
		minZ = Math.min(minZ, points[index + 2]);
		maxZ = Math.max(maxZ, points[index + 2]);
	}
	const centerX = (minX + maxX) / 2;
	const centerZ = (minZ + maxZ) / 2;
	const factor = CLAW_TUNING.plush.squeeze;
	const squeezed = new Float32Array(points.length);
	for (let index = 0; index < points.length; index += 3) {
		squeezed[index] = centerX + (points[index] - centerX) * factor;
		squeezed[index + 1] = points[index + 1];
		squeezed[index + 2] = centerZ + (points[index + 2] - centerZ) * factor;
	}
	return squeezed;
}

export function createClawWorld(RAPIER, { pit, carriageY, home }) {
	const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
	world.timestep = MAX_STEP;
	world.integrationParameters.numSolverIterations = 8;
	const toys = new Map();
	const toyByCollider = new Map();
	const chuteColliders = [];

	function addStatic(half, center, friction = 0.6) {
		const desc = RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2])
			.setTranslation(center[0], center[1], center[2])
			.setFriction(friction)
			.setRestitution(0)
			.setCollisionGroups(ENV_GROUPS);
		return world.createCollider(desc);
	}

	// Felt pit floor with the chute opening cut out, glass walls, a ceiling, and the acrylic chute box.
	const innerX = pit.halfX;
	const innerZ = pit.halfZ;
	const chuteHalfX = CHUTE.halfX + 0.03;
	const chuteHalfZ = CHUTE.halfZ + 0.03;
	const holeMaxX = CHUTE.x + chuteHalfX;
	const holeMinZ = CHUTE.z - chuteHalfZ;
	const shaftBottom = pit.shaftBottom;
	const floorFriction = 0.85;
	addStatic([(innerX - holeMaxX) / 2 + 0.2, 0.1, innerZ + 0.2], [(innerX + holeMaxX) / 2 + 0.2, FLOOR_Y - 0.1, 0], floorFriction);
	addStatic([(holeMaxX + innerX) / 2 + 0.2, 0.1, (holeMinZ + innerZ) / 2 + 0.2], [(holeMaxX - innerX) / 2 - 0.2, FLOOR_Y - 0.1, (holeMinZ - innerZ) / 2 - 0.2], floorFriction);
	addStatic([chuteHalfX + 0.2, 0.1, chuteHalfZ + 0.2], [CHUTE.x, shaftBottom - 0.1, CHUTE.z], floorFriction);
	const wallHalfHeight = (pit.top - shaftBottom) / 2 + 0.3;
	const wallY = (pit.top + shaftBottom) / 2;
	for (const side of [-1, 1]) {
		addStatic([0.1, wallHalfHeight, innerZ + 0.2], [side * (innerX + 0.1), wallY, 0], 0.25);
		addStatic([innerX + 0.2, wallHalfHeight, 0.1], [0, wallY, side * (innerZ + 0.1)], 0.25);
	}
	addStatic([innerX + 0.2, 0.1, innerZ + 0.2], [0, pit.top + 0.1, 0], 0.25);
	// Only the two chute walls facing the pit are needed; the other two are the cabinet walls.
	const rimTop = CHUTE.rimY + 0.06;
	const chuteWallHalfHeight = (rimTop - shaftBottom) / 2;
	const chuteWallY = (rimTop + shaftBottom) / 2;
	chuteColliders.push(addStatic([0.025, chuteWallHalfHeight, chuteHalfZ + 0.025], [holeMaxX, chuteWallY, CHUTE.z], 0.35));
	chuteColliders.push(addStatic([chuteHalfX + 0.025, chuteWallHalfHeight, 0.025], [CHUTE.x, chuteWallY, holeMinZ], 0.35));

	// Claw rig: kinematic carriage → cable (rope joint) → dynamic claw head → three hinged prongs.
	const g = scaledClawGeometry();
	const tuning = CLAW_TUNING;
	const carriage = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(home.x, carriageY, home.z));
	const dockedY = carriageY + g.pivotY - g.anchorY;
	const head = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
		.setTranslation(home.x, dockedY, home.z)
		.setAngularDamping(0.6)
		.setCcdEnabled(true)
		.setCanSleep(false));
	const clawColliders = [];
	const headVolume = g.head.reduce((sum, part) => sum + part.radius ** 2 * (part.top - part.bottom), 0);
	for (const part of g.head) {
		const desc = RAPIER.ColliderDesc.cylinder((part.top - part.bottom) / 2, part.radius)
			.setTranslation(0, (part.top + part.bottom) / 2, 0)
			.setMass(tuning.headMass * part.radius ** 2 * (part.top - part.bottom) / headVolume)
			.setFriction(tuning.finger.friction)
			.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
			.setCollisionGroups(CLAW_GROUPS);
		clawColliders.push({ collider: world.createCollider(desc, head), finger: -1 });
	}
	const anchor = { x: 0, y: g.anchorY, z: 0 };
	const rope = world.createImpulseJoint(RAPIER.JointData.rope(0.001, { x: 0, y: g.pivotY, z: 0 }, anchor), carriage, head, true);
	let ropeLength = 0.001;
	function setRopeLength(length) {
		const next = Math.max(0.001, length);
		if (Math.abs(next - ropeLength) < 1e-6) return;
		ropeLength = next;
		world.impulseJoints.raw.jointSetLimits(rope.handle, ROPE_AXIS, 0, ropeLength);
		head.wakeUp();
	}

	const fingers = [];
	const segmentCount = g.prong.length - 1;
	const fingerPartMass = tuning.fingerMass / (segmentCount + 1);
	for (let index = 0; index < 3; index += 1) {
		const angle = index * (Math.PI * 2 / 3);
		const sin = Math.sin(angle);
		const cos = Math.cos(angle);
		const hinge = { x: sin * g.hinge.radial, y: g.hinge.y, z: cos * g.hinge.radial };
		const axis = { x: cos, y: 0, z: -sin };
		const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(home.x + hinge.x, dockedY + hinge.y, home.z + hinge.z)
			.setCcdEnabled(true)
			.setCanSleep(false));
		const point = ([down, out]) => ({ x: sin * out, y: down, z: cos * out });
		for (let segment = 0; segment < segmentCount; segment += 1) {
			const from = point(g.prong[segment]);
			const to = point(g.prong[segment + 1]);
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const dz = to.z - from.z;
			const length = Math.hypot(dx, dy, dz);
			const desc = RAPIER.ColliderDesc.capsule(length / 2, g.prongRadius)
				.setTranslation((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2)
				.setRotation(quatFromY({ x: dx / length, y: dy / length, z: dz / length }))
				.setMass(fingerPartMass)
				.setFriction(tuning.finger.friction)
				.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
				.setCollisionGroups(CLAW_GROUPS);
			clawColliders.push({ collider: world.createCollider(desc, body), finger: index });
		}
		const tip = point(g.prong[segmentCount]);
		const tipDesc = RAPIER.ColliderDesc.ball(g.tipRadius)
			.setTranslation(tip.x, tip.y, tip.z)
			.setMass(fingerPartMass)
			.setFriction(tuning.finger.friction)
			.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
			.setCollisionGroups(CLAW_GROUPS);
		clawColliders.push({ collider: world.createCollider(tipDesc, body), finger: index });
		const joint = world.createImpulseJoint(RAPIER.JointData.revolute(hinge, { x: 0, y: 0, z: 0 }, axis), head, body, true);
		joint.setContactsEnabled(false);
		joint.setLimits(-g.openAngle - 0.02, g.overtravel);
		joint.configureMotorModel(RAPIER.MotorModel.ForceBased);
		fingers.push({ body, joint, axis, hinge });
	}

	let gripClosing = false;
	let gripPower = 0;
	function setGrip(closing, power) {
		if (closing === gripClosing && power === gripPower) return;
		gripClosing = closing;
		gripPower = power;
		// Modelled like a DC motor: full torque at stall, falling to zero at its free-running speed.
		const speed = closing ? tuning.finger.closeSpeed : -tuning.finger.openSpeed;
		for (const finger of fingers) finger.joint.configureMotorVelocity(speed, power / Math.abs(speed));
	}
	setGrip(false, tuning.finger.openPower);

	function fingerAngle(finger) {
		const qh = head.rotation();
		const relative = multiplyQuat({ x: -qh.x, y: -qh.y, z: -qh.z, w: qh.w }, finger.body.rotation());
		const sinHalf = relative.x * finger.axis.x + relative.y * finger.axis.y + relative.z * finger.axis.z;
		let angle = 2 * Math.atan2(sinHalf, relative.w);
		if (angle > Math.PI) angle -= Math.PI * 2;
		if (angle < -Math.PI) angle += Math.PI * 2;
		return angle;
	}

	const gantry = { x: home.x, z: home.z, vx: 0, vz: 0 };

	function pivotPoint() {
		const position = carriage.translation();
		return { x: position.x, y: position.y + g.pivotY, z: position.z };
	}

	function anchorPoint() {
		const position = head.translation();
		const offset = rotateVector(head.rotation(), anchor);
		return { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z };
	}

	function scanContacts() {
		for (const toy of toys.values()) {
			toy.clawContact = false;
			toy.fingerMask = 0;
		}
		for (const { collider, finger } of clawColliders) {
			world.contactPairsWith(collider, (other) => {
				const toy = toyByCollider.get(other.handle);
				if (!toy) return;
				world.contactPair(collider, other, (manifold) => {
					for (let index = 0; index < manifold.numContacts(); index += 1) {
						if (manifold.contactDist(index) > CONTACT_SLOP) continue;
						toy.clawContact = true;
						if (finger >= 0) toy.fingerMask |= 1 << finger;
						return;
					}
				});
			});
		}
		for (const collider of chuteColliders) {
			world.contactPairsWith(collider, (other) => {
				const toy = toyByCollider.get(other.handle);
				if (toy) toy.chuteContact = true;
			});
		}
	}

	function applyClawForces(h) {
		// Air drag and cable friction damp the swing relative to the moving carriage.
		const velocity = head.linvel();
		const share = Math.min(1, tuning.swingDamping * h) * head.mass();
		head.applyImpulse({ x: -(velocity.x - gantry.vx) * share, y: 0, z: -(velocity.z - gantry.vz) * share }, true);
		if (ropeLength > tuning.dock.range) return;
		// Fully reeled in, the head seats into the carriage funnel and is held upright.
		const up = rotateVector(head.rotation(), { x: 0, y: 1, z: 0 });
		const spin = head.angvel();
		const { stiffness, damping } = tuning.dock;
		head.applyTorqueImpulse({
			x: (-up.z * stiffness - spin.x * damping) * h,
			y: -spin.y * damping * h,
			z: (up.x * stiffness - spin.z * damping) * h,
		}, true);
	}

	// Plush parts arrive as point clouds in the body frame; each becomes one convex hull collider.
	function addToy(id, { position, rotation, parts, mass }) {
		const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
			.setTranslation(position.x, position.y, position.z)
			.setRotation(rotation)
			.setLinearDamping(tuning.plush.linearDamping)
			.setAngularDamping(tuning.plush.angularDamping));
		const toy = { id, body, colliders: [], clawContact: false, fingerMask: 0, chuteContact: false };
		attachParts(toy, parts, mass);
		toys.set(id, toy);
		return toy;
	}

	function attachParts(toy, parts, mass) {
		for (const collider of toy.colliders) {
			toyByCollider.delete(collider.handle);
			world.removeCollider(collider, false);
		}
		toy.colliders = [];
		const descs = [];
		for (const points of parts) {
			const desc = points.length >= 12 ? RAPIER.ColliderDesc.convexHull(squeezePart(points)) : null;
			if (desc) descs.push(desc);
		}
		if (descs.length === 0) descs.push(RAPIER.ColliderDesc.capsule(0.3, 0.3).setTranslation(0, 0.6, 0));
		for (const desc of descs) {
			desc.setDensity(1).setFriction(tuning.plush.friction).setRestitution(tuning.plush.restitution).setCollisionGroups(TOY_GROUPS);
			const collider = world.createCollider(desc, toy.body);
			toy.colliders.push(collider);
			toyByCollider.set(collider.handle, toy);
		}
		const volume = toy.colliders.reduce((sum, collider) => sum + collider.volume(), 0);
		for (const collider of toy.colliders) collider.setDensity(mass / Math.max(volume, 1e-4));
		toy.body.wakeUp();
	}

	function removeToy(id) {
		const toy = toys.get(id);
		if (!toy) return;
		for (const collider of toy.colliders) toyByCollider.delete(collider.handle);
		world.removeRigidBody(toy.body);
		toys.delete(id);
	}

	// Teleports the rig back to its parked pose with the claw reeled in.
	function resetClaw(x, z) {
		gantry.x = x;
		gantry.z = z;
		gantry.vx = 0;
		gantry.vz = 0;
		const zero = { x: 0, y: 0, z: 0 };
		const identity = { x: 0, y: 0, z: 0, w: 1 };
		carriage.setTranslation({ x, y: carriageY, z }, true);
		carriage.setNextKinematicTranslation({ x, y: carriageY, z });
		head.setTranslation({ x, y: dockedY, z }, true);
		head.setRotation(identity, true);
		head.setLinvel(zero, true);
		head.setAngvel(zero, true);
		for (const finger of fingers) {
			finger.body.setTranslation({ x: x + finger.hinge.x, y: dockedY + finger.hinge.y, z: z + finger.hinge.z }, true);
			finger.body.setRotation(identity, true);
			finger.body.setLinvel(zero, true);
			finger.body.setAngvel(zero, true);
		}
		setRopeLength(0);
	}

	// One physics substep. Returns the plush that fell through the chute opening and any that escaped the pit.
	function step(h, { x, z, cable }) {
		world.timestep = h;
		gantry.vx = (x - gantry.x) / h;
		gantry.vz = (z - gantry.z) / h;
		gantry.x = x;
		gantry.z = z;
		carriage.setNextKinematicTranslation({ x, y: carriageY, z });
		setRopeLength(cable);
		applyClawForces(h);
		world.step();
		scanContacts();
		const collected = [];
		const lost = [];
		for (const toy of toys.values()) {
			const com = toy.body.worldCom();
			if (isInChute(com.x, com.z) && com.y < CHUTE.rimY - 0.3) collected.push(toy.id);
			else if (com.y < FLOOR_Y - 1 || Math.abs(com.x) > innerX + 0.5 || Math.abs(com.z) > innerZ + 0.5) lost.push(toy.id);
		}
		return { collected, lost };
	}

	function settle(seconds) {
		const steps = Math.ceil(seconds / MAX_STEP);
		for (let index = 0; index < steps; index += 1) step(MAX_STEP, { x: gantry.x, z: gantry.z, cable: ropeLength });
	}

	return {
		world,
		toys,
		settle,
		head,
		fingers,
		addToy,
		removeToy,
		rebuildToy(id, parts, mass) {
			const toy = toys.get(id);
			if (toy) attachParts(toy, parts, mass);
		},
		resetClaw,
		step,
		setGrip,
		fingerAngles: () => fingers.map(fingerAngle),
		get ropeLength() { return ropeLength; },
		// How far the cable hangs loose: positive once the claw is resting on something.
		slack() {
			const pivot = pivotPoint();
			const tie = anchorPoint();
			return ropeLength - Math.hypot(tie.x - pivot.x, tie.y - pivot.y, tie.z - pivot.z);
		},
		pivotPoint,
		anchorPoint,
	};
}

// Runs one play the way a real crane board does: pay out until the slack switch trips, close, reel in, carry to the
// chute and open. It only commands motors; what the plush does is entirely up to the simulation.
export function createClawController(sim, { home, reach }) {
	const tuning = CLAW_TUNING;
	const state = {
		mode: "ready", x: home.x, z: home.z, vx: 0, vz: 0, cable: 0, cableSpeed: 0, modeTime: 0, landedTime: 0,
		difficulty: "fun", grabbed: [], startHeights: new Map(), carried: null, everCarried: false, lostTime: 0,
		released: null, releaseQuietTime: 0, noLiftReported: false, delivered: false, landedCable: 0,
	};

	function enter(mode) {
		state.mode = mode;
		state.modeTime = 0;
	}

	function touchingIds(fingersOnly = false) {
		const ids = [];
		for (const toy of sim.toys.values()) if (fingersOnly ? toy.fingerMask : toy.clawContact) ids.push(toy.id);
		return ids;
	}

	function begin() {
		if (state.mode !== "ready") return false;
		Object.assign(state, {
			vx: 0, vz: 0, cableSpeed: 0, landedTime: 0, grabbed: [], carried: null, everCarried: false, lostTime: 0,
			released: null, releaseQuietTime: 0, noLiftReported: false, delivered: false,
		});
		state.startHeights.clear();
		enter("drop");
		return true;
	}

	function reset() {
		Object.assign(state, { mode: "ready", x: home.x, z: home.z, vx: 0, vz: 0, cable: 0, cableSpeed: 0, modeTime: 0, carried: null, released: null });
		sim.resetClaw(home.x, home.z);
	}

	function trackCarried(events) {
		let best = null;
		let bestRise = 0.3;
		for (const toy of sim.toys.values()) {
			if (!toy.clawContact) continue;
			const start = state.startHeights.get(toy.id);
			const rise = start === undefined ? 0 : toy.body.worldCom().y - start;
			if (rise > bestRise) {
				best = toy.id;
				bestRise = rise;
			}
		}
		if (best !== null) {
			state.carried = best;
			state.everCarried = true;
			state.lostTime = 0;
			return;
		}
		if (state.carried === null) return;
		const toy = sim.toys.get(state.carried);
		state.lostTime += toy && !toy.clawContact ? state.stepSize : 0;
		if (!toy || state.lostTime > 0.12) {
			events.push({ type: "dropped", id: state.carried, phase: state.mode, risen: state.landedCable - state.cable });
			state.carried = null;
		}
	}

	function update(h, input = { x: 0, z: 0 }) {
		const events = [];
		const power = tuning.power[state.difficulty] ?? tuning.power.fun;
		state.modeTime += h;
		state.stepSize = h;
		switch (state.mode) {
			case "ready": {
				sim.setGrip(false, tuning.finger.openPower);
				stepGantryVelocity(state, input.x * tuning.control.speedX, input.z * tuning.control.speedZ, tuning.control.accel, h);
				if (state.x < reach.minX || state.x > reach.maxX) {
					state.x = Math.min(reach.maxX, Math.max(reach.minX, state.x));
					state.vx = 0;
				}
				if (state.z < reach.minZ || state.z > reach.maxZ) {
					state.z = Math.min(reach.maxZ, Math.max(reach.minZ, state.z));
					state.vz = 0;
				}
				break;
			}
			case "drop": {
				sim.setGrip(false, tuning.finger.openPower);
				if (state.modeTime < 0.2) break;
				state.cableSpeed = Math.min(tuning.drop.speed, state.cableSpeed + tuning.drop.accel * h);
				state.cable = Math.min(tuning.cableDepth, state.cable + state.cableSpeed * h);
				const velocity = sim.head.linvel();
				const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
				const resting = sim.slack() > tuning.landing.slack || state.cable >= tuning.cableDepth;
				state.landedTime = resting && speed < tuning.landing.speed ? state.landedTime + h : 0;
				if (state.landedTime >= tuning.landing.hold) {
					// The slack switch trips: the winch stops and takes up the loose cable.
					state.cable = Math.max(0, state.cable - Math.max(0, sim.slack()) + 0.01);
					state.landedCable = state.cable;
					state.cableSpeed = 0;
					enter("touch");
					events.push({ type: "landed", touching: touchingIds() });
				}
				break;
			}
			case "touch":
				if (state.modeTime >= tuning.settleTime) enter("close");
				break;
			case "close":
				sim.setGrip(true, power.grab);
				if (state.modeTime >= tuning.closeTime) {
					state.grabbed = touchingIds(true);
					for (const toy of sim.toys.values()) state.startHeights.set(toy.id, toy.body.worldCom().y);
					enter("lift");
					events.push({ type: "lift", grabbed: state.grabbed });
				}
				break;
			case "lift":
				sim.setGrip(true, state.modeTime > 0.35 ? power.pickup : power.grab);
				state.cableSpeed = Math.min(tuning.lift.speed, state.cableSpeed + tuning.lift.accel * h);
				state.cable = Math.max(0, state.cable - state.cableSpeed * h);
				// Fingers can slide up a plush before catching under its arms, so only give up once nothing is touching the claw.
				if (!state.everCarried && !state.noLiftReported && state.landedCable - state.cable > 0.6 && touchingIds().length === 0) {
					state.noLiftReported = true;
					events.push({ type: "noLift", grabbed: state.grabbed });
				}
				if (state.cable === 0) {
					// The winch hits its top stop without braking, so the load gets a jolt.
					state.cableSpeed = 0;
					enter("top");
				}
				break;
			case "top":
				sim.setGrip(true, power.carry);
				if (state.modeTime >= tuning.topPause) enter("deliver");
				break;
			case "deliver":
				sim.setGrip(true, power.carry);
				if (stepGantryToward(state, CHUTE.x, CHUTE.z, tuning.deliver.maxSpeed, tuning.deliver.accel, h)) enter("deposit");
				break;
			case "deposit": {
				// Pause over the chute so the load stops swinging, then open.
				const opening = state.modeTime >= tuning.releaseDelay;
				sim.setGrip(!opening, opening ? tuning.finger.openPower : power.carry);
				if (state.carried !== null && state.released === null && state.modeTime > tuning.releaseDelay + 0.05) {
					state.released = state.carried;
					state.carried = null;
					const toy = sim.toys.get(state.released);
					if (toy) toy.chuteContact = false;
					events.push({ type: "released", id: state.released });
				}
				const toy = state.released === null ? null : sim.toys.get(state.released);
				if (toy) {
					const velocity = toy.body.linvel();
					const calm = !toy.clawContact && Math.hypot(velocity.x, velocity.y, velocity.z) < 0.15;
					state.releaseQuietTime = calm ? state.releaseQuietTime + h : 0;
				}
				const waiting = toy && state.releaseQuietTime < 0.4 && state.modeTime < tuning.releaseDelay + tuning.releaseTime;
				if (state.modeTime >= tuning.releaseDelay + 0.45 && !waiting) {
					if (toy) events.push({ type: "missed", id: toy.id, rim: toy.chuteContact });
					state.released = null;
					enter("return");
				}
				break;
			}
			case "return":
				sim.setGrip(true, tuning.finger.openPower);
				state.cable = Math.max(0, state.cable - 6.3 * h);
				if (stepGantryToward(state, home.x, home.z, tuning.travel.maxSpeed, tuning.travel.accel, h) && state.cable === 0 && state.modeTime > 0.3) {
					enter("ready");
					events.push({ type: "end", delivered: state.delivered });
				}
				break;
			default:
				break;
		}

		const result = sim.step(h, { x: state.x, z: state.z, cable: state.cable });
		if (["lift", "top", "deliver"].includes(state.mode) || (state.mode === "deposit" && state.released === null)) trackCarried(events);
		for (const id of result.collected) {
			const fromClaw = id === state.released || id === state.carried;
			if (id === state.carried) state.carried = null;
			if (id === state.released) state.released = null;
			if (fromClaw) state.delivered = true;
			sim.removeToy(id);
			events.push({ type: "collected", id, lucky: !fromClaw });
		}
		for (const id of result.lost) events.push({ type: "lost", id });
		return events;
	}

	return { state, begin, reset, update };
}
