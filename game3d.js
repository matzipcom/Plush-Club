import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_AUTH_REDIRECT_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config.js";
import { setupLanguageSelector, translate } from "./i18n.js";
import {
	createArcadeFloorTexture, createEnvironment, embroideryThread, feltFabric, plushFabric, puffGeometry, safetyEyeMaterial,
	seededRandom, tiledFurNormal,
} from "./realism.js";
import {
	BOUNDS, CHUTE, CLAW_GEOMETRY, CLAW_TUNING, FLOOR_Y, MAX_STEP, createClawController, createClawWorld, overlapsChute, plushMass,
} from "./physics.js";

setupLanguageSelector();

const supabaseConfigured = SUPABASE_URL.startsWith("https://") && SUPABASE_PUBLISHABLE_KEY.length > 20;
const supabaseClient = supabaseConfigured
	? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
	: null;

const canvas = document.querySelector("#game");
const scoreLabel = document.querySelector("#score");
const status = document.querySelector("#status");
const defaultStatusMarkup = status.innerHTML;
const dropButton = document.querySelector("#drop");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
const resetButton = document.querySelector("#reset");
const zoomInButton = document.querySelector("#zoomIn");
const zoomOutButton = document.querySelector("#zoomOut");
const authGate = document.querySelector("#authGate");
const authForm = document.querySelector("#authForm");
const authError = document.querySelector("#authError");
const resendConfirmationButton = document.querySelector("#resendConfirmation");
const accountTools = document.querySelector("#accountTools");
const guestTools = document.querySelector("#guestTools");
const themeToggle = document.querySelector("#themeToggle");
const accountName = document.querySelector("#accountName");
const shopButton = document.querySelector("#openShop");
const coinsLabel = document.querySelector("#coins");
const accountClaimButton = document.querySelector("#addCoins");
const guestClaimButton = document.querySelector("#addGuestCoins");
const dailyBonusButton = document.querySelector("#dailyBonus");
const bagCountLabel = document.querySelector("#bagCount");
const bagGate = document.querySelector("#bagGate");
const bagItems = document.querySelector("#bagItems");
const shopGate = document.querySelector("#shopGate");
const shopStatus = document.querySelector("#shopStatus");
const shopListings = document.querySelector("#shopListings");
const shopSellItems = document.querySelector("#shopSellItems");
const closeShopButton = document.querySelector("#closeShop");
const bagSummary = document.querySelector("#bagSummary");
const sellConfirmGate = document.querySelector("#sellConfirmGate");
const closeSellConfirmButton = document.querySelector("#closeSellConfirm");
const cancelSellConfirmButton = document.querySelector("#cancelSellConfirm");
const confirmSellButton = document.querySelector("#confirmSell");
const prizeGate = document.querySelector("#rewardGate");
const prizeCanvas = document.querySelector("#prizeCanvas");
const prizeFireworks = document.querySelector("#prizeFireworks");
const prizeTitleLabel = document.querySelector("#prizeTitle");
const prizeNameLabel = document.querySelector("#prizeName");
const prizeCopy = document.querySelector(".reward-copy");
const sharePrizeButton = document.querySelector("#sharePrize");
const accountStorageKey = "plush-club-accounts-v1";
const sessionStorageKey = "plush-club-session-v1";
const guestCoinStorageKey = "plush-club-guest-coins-v1";
const guestWalletStorageKey = "plush-club-guest-wallet-v2";
const guestCoinCooldownStorageKey = "plush-club-guest-coin-cooldown-v1";
const guestDailyBonusCooldownStorageKey = "plush-club-guest-daily-bonus-cooldown-v1";
const guestCoinsLabel = document.querySelector("#guestCoins");
const passwordIterations = 160000;
const playCost = 1;
const politicsRoomPrice = 1000;
const coinPack = 5;
const coinClaimCooldown = 5 * 60 * 1000;
const dailyBonusAmount = 200;
const dailyBonusCooldown = 24 * 60 * 60 * 1000;
let accounts = loadAccounts();
let guestCoins = loadGuestCoins();
let guestPoliticsRoomPurchased = loadGuestPoliticsRoomPurchased();
let guestNextCoinClaimAt = loadGuestCoinClaimTime();
let guestNextDailyBonusAt = loadGuestDailyBonusClaimTime();
let currentAccount = null;
let profileWriteQueue = Promise.resolve();
let playRequestPending = false;
let coinClaimPending = false;
let dailyBonusClaimPending = false;
let politicsEntryPending = false;
let politicsPaymentAuthorized = false;
let authMode = "login";
let authPending = false;
let pendingConfirmationEmail = "";
let darkMode = false;
try { darkMode = localStorage.getItem("plush-club-theme-v1") === "dark"; } catch { /* Keep the default light theme if storage is unavailable. */ }
function applyTheme() {
	const theme = darkMode ? "dark" : "light";
	document.documentElement.dataset.theme = theme;
	themeToggle.textContent = darkMode ? "☀" : "☾";
	themeToggle.setAttribute("aria-label", darkMode ? "라이트 모드 켜기" : "다크 모드 켜기");
	themeToggle.title = darkMode ? "라이트 모드 켜기" : "다크 모드 켜기";
	themeToggle.setAttribute("aria-pressed", String(darkMode));
	document.querySelector('meta[name="theme-color"]').content = darkMode ? "#151d1a" : "#f2f1e9";
	try { localStorage.setItem("plush-club-theme-v1", theme); } catch { /* Keep the selected theme for this page. */ }
}
applyTheme();
themeToggle.addEventListener("click", () => {
	darkMode = !darkMode;
	applyTheme();
});
// Arcade interior: neutral walls fading into fog, lit like a real room rather than a flat game backdrop.
const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfcac2");
scene.fog = new THREE.Fog("#cfcac2", 20, 46);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
scene.environment = createEnvironment(renderer);
scene.environmentIntensity = 0.55;

const prizeScene = new THREE.Scene();
prizeScene.background = new THREE.Color("#e8f1df");
prizeScene.add(new THREE.HemisphereLight(0xfffdf0, 0x829586, 0.7));
const prizeLight = new THREE.DirectionalLight(0xfff4e6, 2.4);
prizeLight.position.set(-3, 5, 6);
prizeScene.add(prizeLight);
const prizeCamera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.1, 15);
prizeCamera.position.set(0, 0.82, 5);
prizeCamera.lookAt(0, 0.82, 0);
const prizeRenderer = new THREE.WebGLRenderer({ canvas: prizeCanvas, antialias: true, alpha: false });
prizeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
prizeRenderer.outputColorSpace = THREE.SRGBColorSpace;
prizeRenderer.toneMapping = THREE.NeutralToneMapping;
prizeRenderer.toneMappingExposure = 1;
prizeScene.environment = createEnvironment(prizeRenderer);
prizeScene.environmentIntensity = 0.7;
let prizeModel = null;
let prizeModelKind = null;

let chizzillaPbrTemplate = null;

function replaceChizzillaWithPbr(group) {
	if (!chizzillaPbrTemplate) return;
	group.clear();
	group.add(chizzillaPbrTemplate.clone(true));
	group.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});
}

new GLTFLoader().loadAsync("./assets/base_basic_pbr.glb").then((gltf) => {
	const model = gltf.scene.clone(true);
	model.updateMatrixWorld(true);
	const bounds = new THREE.Box3().setFromObject(model);
	const dimensions = bounds.getSize(new THREE.Vector3());
	model.scale.multiplyScalar(1.45 / Math.max(dimensions.y, 0.01));
	model.updateMatrixWorld(true);
	const normalizedBounds = new THREE.Box3().setFromObject(model);
	model.position.y -= normalizedBounds.min.y;
	model.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});
	chizzillaPbrTemplate = model;
	for (const toy of toys) {
		if (toy.kind !== "chizzilla") continue;
		replaceChizzillaWithPbr(toy.group);
		rebuildToyPhysics(toy);
	}
	if (prizeModelKind === "chizzilla" && prizeModel) replaceChizzillaWithPbr(prizeModel);
}).catch(() => {
	status.textContent = "찢칠라 3D 모델을 불러오지 못해 이미지 모델로 표시합니다.";
});
let mulcoritaTemplate = null;

function replaceMulcoritaModel(group) {
	if (!mulcoritaTemplate) return;
	group.clear();
	group.add(mulcoritaTemplate.clone(true));
}

new GLTFLoader().loadAsync("./assets/base.glb").then((gltf) => {
	const model = gltf.scene;
	model.updateMatrixWorld(true);
	const bounds = new THREE.Box3().setFromObject(model);
	const dimensions = bounds.getSize(new THREE.Vector3());
	model.scale.multiplyScalar(1.45 / Math.max(dimensions.y, dimensions.x, dimensions.z, 0.01));
	model.updateMatrixWorld(true);
	const normalizedBounds = new THREE.Box3().setFromObject(model);
	const center = normalizedBounds.getCenter(new THREE.Vector3());
	model.position.x -= center.x;
	model.position.y -= normalizedBounds.min.y;
	model.position.z -= center.z;
	model.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});
	mulcoritaTemplate = model;
	for (const toy of toys) {
		if (toy.kind !== "mulcorita") continue;
		replaceMulcoritaModel(toy.group);
		rebuildToyPhysics(toy);
	}
	if (prizeModelKind === "mulcorita" && prizeModel) {
		replaceMulcoritaModel(prizeModel);
		requestAnimationFrame(renderPrizePreview);
	}
}).catch(() => {
	status.textContent = "대리석 문코리타 3D 모델을 불러오지 못해 기본 인형으로 표시합니다.";
});
let moonkoritaTemplate = null;
let moonkoritaLoadPromise = null;

function replaceMoonkoritaModel(group) {
	if (!moonkoritaTemplate) return;
	group.clear();
	group.add(moonkoritaTemplate.clone(true));
}

function loadMoonkoritaModel() {
	if (moonkoritaLoadPromise) return moonkoritaLoadPromise;
	moonkoritaLoadPromise = new GLTFLoader().loadAsync("./assets/moonkorita-optimized.glb").then((gltf) => {
		const model = gltf.scene;
		model.updateMatrixWorld(true);
		const dimensions = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
		model.scale.multiplyScalar(1.45 / Math.max(dimensions.x, dimensions.y, dimensions.z, 0.01));
		model.updateMatrixWorld(true);
		const bounds = new THREE.Box3().setFromObject(model);
		const center = bounds.getCenter(new THREE.Vector3());
		model.position.x -= center.x;
		model.position.y -= bounds.min.y;
		model.position.z -= center.z;
		model.traverse((object) => {
			if (object.isMesh) {
				object.castShadow = true;
				object.receiveShadow = true;
			}
		});
		moonkoritaTemplate = model;
		for (const toy of toys) {
			if (toy.kind !== "moonkorita") continue;
			replaceMoonkoritaModel(toy.group);
			rebuildToyPhysics(toy);
		}
		if (prizeModelKind === "moonkorita" && prizeModel) {
			replaceMoonkoritaModel(prizeModel);
			requestAnimationFrame(renderPrizePreview);
		}
	}).catch(() => {
		moonkoritaLoadPromise = null;
		status.textContent = "문코리타 3D 모델을 불러오지 못해 기본 인형으로 표시합니다.";
	});
	return moonkoritaLoadPromise;
}
let prizeShareDescription = "인형을 뽑았어요!";
let prizeReturnFocus = null;
let fireworkSequence = 0;
const prizeDrag = { pointerId: null, x: 0, y: 0 };

// Single-player upright crane cabinet (width:height ≈ 0.56), built around the plush so they keep their real-world scale.
// The pit floor sits at FLOOR_Y; the lower cabinet extends below it down to the arcade floor.
const CABINET = {
	width: 4.4, depth: 3.5, wall: 0.12, cornerRadius: 0.34,
	ground: -2.46, bandBottom: 0.36, lip: 0.81, glassTop: 4.45, top: 5.4,
};
const CARRIAGE_Y = CABINET.glassTop - 0.4;
const RAIL_Z = CABINET.depth / 2 - CABINET.wall - 0.12;
// Real machines park the claw over the prize chute between plays.
const CLAW_HOME = { x: CHUTE.x, z: CHUTE.z };
const CLAW_REACH = { minX: -1.6, maxX: 1.6, minZ: -1.12, maxZ: 1.1 };

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
// Frame the whole cabinet like a product photo, seen slightly from the right so its depth reads.
const machineFit = { width: 5.6, height: 8.4 };
const cameraTarget = new THREE.Vector3(0, (CABINET.ground + CABINET.top) / 2 + 0.05, 0.25);
const cameraOrbit = { azimuth: 0.28, elevation: Math.atan(0.23), distance: 12, zoom: 1 };
const cameraDrag = { pointerId: null, x: 0, y: 0 };
scene.add(new THREE.HemisphereLight(0xfbf8f2, 0x8a847b, 0.55));

// Ceiling fixture of the arcade room.
const keyLight = new THREE.DirectionalLight(0xfff3e4, 1.6);
keyLight.position.set(-5, 10, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 7;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.bias = -0.0003;
keyLight.shadow.normalBias = 0.02;
keyLight.shadow.radius = 4;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0xfff1e2, 40, 18, 2);
fillLight.position.set(4, 4.5, 6);
scene.add(fillLight);
// Cool-white LED panel in the cabinet header lights the prize pit from above, as in real machines.
const interiorLight = new THREE.SpotLight(0xf6f8ff, 22, 7, 0.95, 0.85, 1.6);
interiorLight.position.set(0, CABINET.glassTop - 0.05, 0.3);
interiorLight.target.position.set(0, FLOOR_Y, 0);
interiorLight.castShadow = true;
interiorLight.shadow.mapSize.set(1024, 1024);
interiorLight.shadow.bias = -0.0005;
interiorLight.shadow.normalBias = 0.02;
interiorLight.shadow.radius = 6;
scene.add(interiorLight, interiorLight.target);

const material = (color, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
// Powder-coated steel / moulded ABS cabinet panels: semi-gloss, reflecting the room through the environment map.
const coated = (color, roughness = 0.3) => new THREE.MeshStandardMaterial({ color, roughness, envMapIntensity: 0.9 });
const mats = {
	cream: material("#fff5dc", 0.4),
	gold: material("#d9b469", 0.3, 1),
	shell: coated("#ecebee"),
	shellShade: coated("#c4c5ca", 0.45),
	backWall: coated("#f2f0f3", 0.55),
	floor: new THREE.MeshStandardMaterial({ color: "#d9d6de", roughness: 1, normalMap: tiledFurNormal(14, 6), normalScale: new THREE.Vector2(0.6, 0.6) }),
	rail: material("#c3c6cc", 0.32, 1),
	carriage: coated("#d4d5d9", 0.4),
	chrome: material("#f1f3f6", 0.1, 1),
	steel: material("#b7bcc4", 0.3, 1),
	wire: material("#1d1e21", 0.62),
	trim: material("#2a2b31", 0.42),
	rubber: material("#1b1b1d", 0.85),
	// Translucent-looking acrylic ball top and an illuminated push button, as on the reference cabinets.
	ballPurple: new THREE.MeshPhysicalMaterial({ color: "#b98ae0", roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, emissive: "#5a2a86", emissiveIntensity: 0.35 }),
	buttonPink: new THREE.MeshStandardMaterial({ color: "#ffd0e6", roughness: 0.25, emissive: "#ff3f9f", emissiveIntensity: 1.1 }),
	screenBlue: new THREE.MeshStandardMaterial({ color: "#0f1a33", roughness: 0.08, emissive: "#2f6be0", emissiveIntensity: 0.9 }),
	hole: material("#111215", 0.7),
	led: new THREE.MeshBasicMaterial({ color: "#f7f9ff" }),
};
// Neon / LED strips: a saturated core plus a faint halo so they read as glowing on both the white body and dark areas.
const neon = {
	pink: { core: new THREE.MeshBasicMaterial({ color: "#ff74bf" }), halo: neonHalo("#ff4fae") },
	cyan: { core: new THREE.MeshBasicMaterial({ color: "#6af1ff" }), halo: neonHalo("#2cdcff") },
};
function neonHalo(color) {
	return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false });
}
// Tempered glass: barely tinted, mostly visible through its reflections of the room.
const glass = new THREE.MeshPhysicalMaterial({
	color: "#f2f8f7", roughness: 0.03, metalness: 0, envMapIntensity: 1.8,
	transparent: true, opacity: 0.1, depthWrite: false,
});
const acrylic = new THREE.MeshPhysicalMaterial({
	color: "#f4fbff", roughness: 0.05, metalness: 0, envMapIntensity: 1.5,
	transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
});
const craftColors = [
	{ name: "빨강", value: "#e45b5b" },
	{ name: "주황", value: "#ed9159" },
	{ name: "노랑", value: "#e9c64f" },
	{ name: "초록", value: "#68aa70" },
	{ name: "파랑", value: "#6097d0" },
	{ name: "남색", value: "#595d9d" },
	{ name: "보라", value: "#9b69b4" },
];
const rainbowCanvas = document.createElement("canvas");
rainbowCanvas.width = 256;
rainbowCanvas.height = 64;
const rainbowContext = rainbowCanvas.getContext("2d");
const rainbowGradient = rainbowContext.createLinearGradient(0, 0, rainbowCanvas.width, 0);
["#e45b5b", "#ed9159", "#e9c64f", "#68aa70", "#6097d0", "#595d9d", "#9b69b4", "#e45b5b"].forEach((color, index, colors) => {
	rainbowGradient.addColorStop(index / (colors.length - 1), color);
});
rainbowContext.fillStyle = rainbowGradient;
rainbowContext.fillRect(0, 0, rainbowCanvas.width, rainbowCanvas.height);
const rainbowTexture = new THREE.CanvasTexture(rainbowCanvas);
rainbowTexture.colorSpace = THREE.SRGBColorSpace;
const plush = (color) => color === "rainbow" ? plushFabric("#ffffff", { map: rainbowTexture }) : plushFabric(color);
const chizzillaImageTexture = new THREE.TextureLoader().load(
	"./assets/chizzilla.jpg",
	(texture) => { texture.colorSpace = THREE.SRGBColorSpace; },
	undefined,
	() => { status.textContent = "찢칠라 이미지를 불러오지 못했어요. 페이지를 새로고침해 주세요."; },
);
chizzillaImageTexture.colorSpace = THREE.SRGBColorSpace;
const chizzillaImageMaterial = new THREE.MeshBasicMaterial({ map: chizzillaImageTexture, side: THREE.DoubleSide });
const eyeMaterial = safetyEyeMaterial();
const threadMaterial = embroideryThread("#3b2925");
const bellyMaterial = plushFabric("#f6ead8");
const blushMaterial = feltFabric("#e9a39c");
const beakMaterial = feltFabric("#ea9152");
const tagMaterial = new THREE.MeshStandardMaterial({ color: "#f7f5ef", roughness: 0.5, side: THREE.DoubleSide });
const machine = new THREE.Group();
scene.add(machine);
let panelStick = null;

function box(parent, size, position, surface, castShadow = true) {
	const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), surface);
	mesh.position.set(...position);
	mesh.castShadow = castShadow;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

function sphere(parent, position, scale, surface, segments = 20) {
	const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(12, segments - 4)), surface);
	mesh.position.set(...position);
	mesh.scale.set(...scale);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

// Stuffed fabric part (see puffGeometry): lumpy, optionally seamed down the middle and sagging into a flat base.
function puff(parent, position, scale, surface, options = {}) {
	const mesh = new THREE.Mesh(puffGeometry(options), surface);
	mesh.position.set(...position);
	mesh.scale.set(...scale);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

function roundedBox(parent, size, position, surface, radius = 0.05, castShadow = true) {
	const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), surface);
	mesh.position.set(...position);
	mesh.castShadow = castShadow;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

// Follows a flat outline (e.g. a rounded rectangle) through 3D space, so neon tubes can be bent along panel edges.
class OutlineCurve extends THREE.Curve {
	constructor(outline, place) {
		super();
		this.outline = outline;
		this.place = place;
	}

	getPoint(t, target = new THREE.Vector3()) {
		return this.place(this.outline.getPointAt(Math.min(t, 1)), target);
	}
}

function neonTube(parent, curve, color, { radius = 0.022, segments = 1, closed = false } = {}) {
	const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, closed), neon[color].core);
	const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius * 2.8, 8, closed), neon[color].halo);
	halo.renderOrder = 3;
	parent.add(core, halo);
	return core;
}

function neonLine(parent, from, to, color) {
	return neonTube(parent, new THREE.LineCurve3(new THREE.Vector3(...from), new THREE.Vector3(...to)), color);
}

function neonRing(parent, position, radius, color) {
	const core = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.022, 8, 96), neon[color].core);
	const halo = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.062, 8, 96), neon[color].halo);
	halo.renderOrder = 3;
	core.position.set(...position);
	halo.position.set(...position);
	parent.add(core, halo);
}

function canvasTexture(width, height, draw) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	draw(canvas.getContext("2d"), width, height);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 8;
	return texture;
}

// Backlit header lightbox with pink neon lettering.
function makeSignTexture() {
	return canvasTexture(1200, 200, (ctx, width, height) => {
		const background = ctx.createLinearGradient(0, 0, 0, height);
		background.addColorStop(0, "#fbfafc");
		background.addColorStop(1, "#e9e7ee");
		ctx.fillStyle = background;
		ctx.fillRect(0, 0, width, height);
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "italic 900 120px 'Arial Rounded MT Bold', 'Trebuchet MS', sans-serif";
		ctx.shadowColor = "#ff3fa4";
		ctx.shadowBlur = 26;
		ctx.fillStyle = "#ff5cb0";
		ctx.fillText("PLUSH PARADE", width / 2, height / 2 + 6);
		ctx.shadowBlur = 0;
		ctx.lineWidth = 3;
		ctx.strokeStyle = "rgba(255, 228, 242, 0.9)";
		ctx.strokeText("PLUSH PARADE", width / 2, height / 2 + 6);
		ctx.fillStyle = "#2cd8f5";
		ctx.shadowColor = "#2cdcff";
		ctx.shadowBlur = 18;
		for (const x of [70, width - 70]) {
			ctx.beginPath();
			for (let point = 0; point < 10; point += 1) {
				const angle = -Math.PI / 2 + point * Math.PI / 5;
				const radius = point % 2 ? 15 : 36;
				ctx.lineTo(x + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius);
			}
			ctx.closePath();
			ctx.fill();
		}
	});
}

// Quilted diamond pattern moulded into the band under the glass.
function makeDiamondTexture() {
	return canvasTexture(256, 256, (ctx, size) => {
		ctx.fillStyle = "#f3f2f5";
		ctx.fillRect(0, 0, size, size);
		ctx.strokeStyle = "rgba(140, 140, 152, 0.5)";
		ctx.lineWidth = 5;
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(size, size);
		ctx.moveTo(size, 0);
		ctx.lineTo(0, size);
		ctx.stroke();
	});
}

function makePrizeDoorTexture() {
	return canvasTexture(512, 512, (ctx, size) => {
		const glow = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
		glow.addColorStop(0, "#3a3446");
		glow.addColorStop(1, "#141418");
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, size, size);
		ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(size / 2, 380);
		ctx.bezierCurveTo(90, 260, 120, 120, 200, 120);
		ctx.bezierCurveTo(240, 120, size / 2, 150, size / 2, 180);
		ctx.bezierCurveTo(size / 2, 150, 272, 120, 312, 120);
		ctx.bezierCurveTo(392, 120, 422, 260, size / 2, 380);
		ctx.stroke();
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "italic 900 96px Impact, 'Arial Black', sans-serif";
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#ffffff";
		ctx.strokeText("PRIZE", size / 2, 236);
		ctx.strokeText("OUT", size / 2, 330);
		ctx.fillStyle = "#ff4fae";
		ctx.fillText("PRIZE", size / 2, 236);
		ctx.fillStyle = "#23c9ee";
		ctx.fillText("OUT", size / 2, 330);
	});
}

function makePriceLabelTexture() {
	return canvasTexture(320, 80, (ctx, width, height) => {
		ctx.fillStyle = "#fbfbfb";
		ctx.fillRect(0, 0, width, height);
		ctx.fillStyle = "#26262c";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "800 34px 'Arial Black', sans-serif";
		ctx.fillText("1 PLAY = 1 COIN", width / 2, height / 2 + 2);
	});
}

// LED direction marks printed on the front lip of the control panel.
function makePanelIconTexture() {
	return canvasTexture(512, 96, (ctx, width, height) => {
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = "#c8f8ff";
		ctx.shadowColor = "#2cdcff";
		ctx.shadowBlur = 14;
		const y = height / 2;
		const triangle = (x, direction) => {
			ctx.beginPath();
			ctx.moveTo(x, y - 20 * direction);
			ctx.lineTo(x + 22, y + 16 * direction);
			ctx.lineTo(x - 22, y + 16 * direction);
			ctx.closePath();
			ctx.fill();
		};
		ctx.fillRect(70, y - 14, 70, 8);
		ctx.fillRect(70, y + 6, 70, 8);
		triangle(215, 1);
		triangle(297, -1);
		ctx.fillRect(372, y - 14, 70, 8);
		ctx.fillRect(372, y + 6, 70, 8);
	});
}

function roundedRectShape(width, depth, radius) {
	const shape = new THREE.Shape();
	const x = -width / 2;
	const y = -depth / 2;
	shape.moveTo(x + radius, y);
	shape.lineTo(x + width - radius, y);
	shape.quadraticCurveTo(x + width, y, x + width, y + radius);
	shape.lineTo(x + width, y + depth - radius);
	shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
	shape.lineTo(x + radius, y + depth);
	shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
	shape.lineTo(x, y + radius);
	shape.quadraticCurveTo(x, y, x + radius, y);
	return shape;
}

function slab(parent, shape, thickness, y, surface) {
	const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
	geometry.rotateX(Math.PI / 2);
	const mesh = new THREE.Mesh(geometry, surface);
	mesh.position.y = y + thickness;
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

function cylinder(parent, radius, height, position, surface, segments = 24) {
	const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), surface);
	mesh.position.set(...position);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

function faceForward(mesh) {
	mesh.rotation.x = Math.PI / 2;
	return mesh;
}

function buildMachine() {
	const { width, depth, wall, cornerRadius, ground: groundY, bandBottom, lip, glassTop, top } = CABINET;
	const front = depth / 2;
	const innerX = width / 2 - wall;
	const innerZ = depth / 2 - wall;
	const glassX = width / 2 - wall / 2;
	const glassZ = front - wall / 2;

	const floorTexture = createArcadeFloorTexture();
	floorTexture.repeat.set(18, 18);
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: 0.42, envMapIntensity: 0.6 }));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = groundY;
	ground.receiveShadow = true;
	scene.add(ground);

	// Lower cabinet on a recessed plinth with casters.
	const bodyBottom = groundY + 0.12;
	roundedBox(machine, [width, bandBottom - bodyBottom, depth], [0, (bandBottom + bodyBottom) / 2, 0], mats.shell, 0.07);
	box(machine, [width - 0.9, 0.12, depth - 0.9], [0, groundY + 0.06, 0], mats.trim, false);
	for (const x of [-1, 1]) {
		for (const z of [-1, 1]) {
			const caster = new THREE.Group();
			caster.position.set(x * (width / 2 - 0.3), groundY, z * (depth / 2 - 0.3));
			machine.add(caster);
			box(caster, [0.13, 0.03, 0.13], [0, 0.105, 0], mats.chrome, false);
			cylinder(caster, 0.06, 0.05, [0, 0.06, 0], mats.rubber, 16).rotation.z = Math.PI / 2;
		}
	}

	// Quilted band under the glass. Its walls form the lip of the prize pit.
	box(machine, [width + 0.012, 0.03, depth + 0.012], [0, bandBottom, 0], mats.shellShade, false);
	const diamondTexture = makeDiamondTexture();
	const bandHeight = lip - bandBottom;
	const bandY = (lip + bandBottom) / 2;
	const bandMaterial = (length) => {
		const map = diamondTexture.clone();
		map.wrapS = THREE.RepeatWrapping;
		map.wrapT = THREE.RepeatWrapping;
		map.repeat.set(length / 0.3, bandHeight / 0.3);
		return new THREE.MeshStandardMaterial({ map, roughness: 0.32, envMapIntensity: 0.9 });
	};
	roundedBox(machine, [width, bandHeight, wall], [0, bandY, front - wall / 2], bandMaterial(width), 0.03);
	const sideBand = bandMaterial(depth);
	for (const side of [-1, 1]) roundedBox(machine, [wall, bandHeight, depth - 2 * wall], [side * (width / 2 - wall / 2), bandY, 0], sideBand, 0.03);
	roundedBox(machine, [width, glassTop - bandBottom, wall], [0, (glassTop + bandBottom) / 2, -front + wall / 2], mats.backWall, 0.04);

	// Felt pit floor with the chute opening cut out of the front-left corner, and a dark shaft below it.
	const holeMaxX = CHUTE.x + CHUTE.halfX + 0.03;
	const holeMinZ = CHUTE.z - CHUTE.halfZ - 0.03;
	const floorY = FLOOR_Y - 0.05;
	box(machine, [innerX - holeMaxX, 0.1, 2 * innerZ], [(innerX + holeMaxX) / 2, floorY, 0], mats.floor);
	box(machine, [holeMaxX + innerX, 0.1, holeMinZ + innerZ], [(holeMaxX - innerX) / 2, floorY, (holeMinZ - innerZ) / 2], mats.floor);
	const shaftBottom = bandBottom + 0.01;
	const shaftHeight = FLOOR_Y - shaftBottom;
	const shaftY = (FLOOR_Y + shaftBottom) / 2;
	const shaftWidth = holeMaxX + innerX;
	const shaftDepth = innerZ - holeMinZ;
	const shaftX = (holeMaxX - innerX) / 2;
	const shaftZ = (holeMinZ + innerZ) / 2;
	box(machine, [shaftWidth, 0.02, shaftDepth], [shaftX, shaftBottom, shaftZ], mats.hole, false);
	for (const x of [-innerX + 0.01, holeMaxX]) box(machine, [0.02, shaftHeight, shaftDepth], [x, shaftY, shaftZ], mats.hole, false);
	for (const z of [holeMinZ, innerZ - 0.01]) box(machine, [shaftWidth, shaftHeight, 0.02], [shaftX, shaftY, z], mats.hole, false);

	// Clear acrylic prize chute with white rims over the drop hole.
	const chuteWallHeight = CHUTE.rimY + 0.04 - FLOOR_Y;
	const chuteWallY = FLOOR_Y + chuteWallHeight / 2;
	const chuteW = CHUTE.halfX * 2 + 0.06;
	const chuteD = CHUTE.halfZ * 2 + 0.06;
	for (const side of [-1, 1]) {
		box(machine, [chuteW, chuteWallHeight, 0.025], [CHUTE.x, chuteWallY, CHUTE.z + side * chuteD / 2], acrylic, false);
		box(machine, [0.025, chuteWallHeight, chuteD], [CHUTE.x + side * chuteW / 2, chuteWallY, CHUTE.z], acrylic, false);
		box(machine, [chuteW + 0.04, 0.04, 0.05], [CHUTE.x, CHUTE.rimY + 0.04, CHUTE.z + side * chuteD / 2], mats.shell, false);
		box(machine, [0.05, 0.04, chuteD + 0.04], [CHUTE.x + side * chuteW / 2, CHUTE.rimY + 0.04, CHUTE.z], mats.shell, false);
	}

	// Frameless glass with rounded front corners, white posts at the back and cyan LED strips framing the backboard.
	const glassHeight = glassTop - lip;
	const glassY = (glassTop + lip) / 2;
	box(machine, [2 * (glassX - cornerRadius), glassHeight, 0.03], [0, glassY, glassZ], glass, false);
	for (const side of [-1, 1]) {
		const corner = new THREE.Mesh(
			new THREE.CylinderGeometry(cornerRadius, cornerRadius, glassHeight, 20, 1, true, side > 0 ? 0 : -Math.PI / 2, Math.PI / 2),
			glass,
		);
		corner.position.set(side * (glassX - cornerRadius), glassY, glassZ - cornerRadius);
		machine.add(corner);
		box(machine, [0.03, glassHeight, glassZ - cornerRadius + innerZ], [side * glassX, glassY, (glassZ - cornerRadius - innerZ) / 2], glass, false);
		box(machine, [wall, glassHeight, 0.2], [side * (width / 2 - wall / 2), glassY, -innerZ + 0.1], mats.shell);
		neonLine(machine, [side * (innerX - 0.06), lip + 0.2, -innerZ + 0.05], [side * (innerX - 0.06), glassTop - 0.25, -innerZ + 0.05], "cyan");
	}

	// Header lightbox with a pink neon frame, a cyan strip along its lower edge and an LED panel lighting the pit.
	const headerHeight = top - glassTop;
	const headerY = glassTop + headerHeight / 2;
	roundedBox(machine, [width + 0.06, headerHeight, depth + 0.04], [0, headerY, 0.02], mats.shell, 0.08);
	const signWidth = width - 0.5;
	const signHeight = headerHeight - 0.32;
	const sign = new THREE.Mesh(new THREE.PlaneGeometry(signWidth, signHeight), new THREE.MeshBasicMaterial({ map: makeSignTexture() }));
	sign.position.set(0, headerY, front + 0.05);
	machine.add(sign);
	const signFrame = roundedRectShape(signWidth + 0.14, signHeight + 0.14, 0.12);
	neonTube(machine, new OutlineCurve(signFrame, (point, target) => target.set(point.x, headerY + point.y, front + 0.07)), "pink", { segments: 160, closed: true });
	neonLine(machine, [-width / 2 + 0.12, glassTop + 0.07, front + 0.06], [width / 2 - 0.12, glassTop + 0.07, front + 0.06], "cyan");
	box(machine, [2 * innerX - 0.3, 0.015, 2 * innerZ - 0.3], [0, glassTop - 0.01, 0], mats.led, false);

	// Overhead gantry rails (the moving bridge and carriage are built with the claw).
	for (const z of [-RAIL_Z, RAIL_Z]) box(machine, [2 * innerX - 0.06, 0.1, 0.12], [0, CARRIAGE_Y + 0.16, z], mats.rail);

	// Control console jutting out of the front-left, edged with a pink LED strip.
	const panel = new THREE.Group();
	const panelWidth = 2.4;
	const panelDepth = 0.95;
	const panelThickness = 0.3;
	const panelBase = bandBottom - 0.12 - panelThickness;
	const panelTop = panelBase + panelThickness + 0.02;
	panel.position.set(-width / 2 + panelWidth / 2, 0, front + panelDepth / 2 - 0.15);
	machine.add(panel);
	slab(panel, roundedRectShape(panelWidth, panelDepth, 0.16), panelThickness, panelBase, mats.shell);
	const panelEdge = roundedRectShape(panelWidth + 0.05, panelDepth + 0.05, 0.18);
	neonTube(panel, new OutlineCurve(panelEdge, (point, target) => target.set(point.x, panelTop - 0.05, point.y)), "pink", { segments: 140, closed: true });
	const icons = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.2), new THREE.MeshBasicMaterial({ map: makePanelIconTexture(), transparent: true }));
	icons.position.set(0, panelBase + panelThickness * 0.42, panelDepth / 2 + 0.025);
	panel.add(icons);
	panelStick = new THREE.Group();
	panelStick.position.set(-0.62, panelTop, 0.12);
	panel.add(panelStick);
	cylinder(panelStick, 0.15, 0.03, [0, 0.015, 0], mats.trim, 32);
	cylinder(panelStick, 0.07, 0.07, [0, 0.06, 0], mats.chrome);
	cylinder(panelStick, 0.024, 0.32, [0, 0.24, 0], mats.chrome, 12);
	sphere(panelStick, [0, 0.45, 0], [0.12, 0.12, 0.12], mats.ballPurple, 28);
	const screen = new THREE.Group();
	screen.position.set(0.02, panelTop + 0.13, -0.25);
	screen.rotation.x = -0.5;
	panel.add(screen);
	roundedBox(screen, [0.66, 0.36, 0.08], [0, 0, 0], mats.trim, 0.025);
	box(screen, [0.56, 0.27, 0.01], [0, 0, 0.041], mats.screenBlue, false);
	cylinder(panel, 0.18, 0.05, [0.62, panelTop + 0.02, 0.12], mats.chrome, 32);
	sphere(panel, [0.62, panelTop + 0.05, 0.12], [0.135, 0.06, 0.135], mats.buttonPink, 28);

	// Round push-flap prize door under the console, ringed in cyan neon.
	const doorX = panel.position.x;
	const doorY = -1.05;
	const doorRadius = 0.5;
	const door = new THREE.Mesh(new THREE.CircleGeometry(doorRadius, 48), new THREE.MeshStandardMaterial({ map: makePrizeDoorTexture(), roughness: 0.16, envMapIntensity: 1.2 }));
	door.position.set(doorX, doorY, front + 0.012);
	machine.add(door);
	const bezel = new THREE.Mesh(new THREE.TorusGeometry(doorRadius + 0.02, 0.035, 12, 64), mats.chrome);
	bezel.position.set(doorX, doorY, front + 0.01);
	machine.add(bezel);
	neonRing(machine, [doorX, doorY, front + 0.03], doorRadius + 0.11, "cyan");

	// Payment column on the right: bill/card reader, price label, coin door and lockable cash box.
	const pay = new THREE.Group();
	pay.position.set(1.22, 0, front);
	machine.add(pay);
	box(pay, [1.05, 2.15, 0.02], [0, -0.92, 0.01], mats.shellShade, false);
	roundedBox(pay, [0.62, 0.36, 0.1], [0, -0.05, 0.05], mats.trim, 0.03);
	box(pay, [0.42, 0.025, 0.02], [0, 0.04, 0.1], mats.hole, false);
	box(pay, [0.26, 0.11, 0.01], [0, -0.1, 0.101], mats.screenBlue, false);
	const priceLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.16), new THREE.MeshStandardMaterial({ map: makePriceLabelTexture(), roughness: 0.5 }));
	priceLabel.position.set(0, -0.36, 0.022);
	pay.add(priceLabel);
	roundedBox(pay, [0.52, 0.82, 0.06], [0, -0.92, 0.04], mats.steel, 0.02);
	box(pay, [0.05, 0.18, 0.02], [-0.1, -0.7, 0.075], mats.hole, false);
	faceForward(cylinder(pay, 0.05, 0.03, [0.11, -0.7, 0.08], mats.chrome, 20));
	box(pay, [0.24, 0.14, 0.04], [0, -1.18, 0.075], mats.hole, false);
	faceForward(cylinder(pay, 0.035, 0.03, [0.17, -0.95, 0.08], mats.chrome, 16));
	roundedBox(pay, [0.8, 0.62, 0.04], [0, -1.68, 0.03], mats.shell, 0.015);
	faceForward(cylinder(pay, 0.045, 0.03, [0.26, -1.68, 0.06], mats.chrome, 20));
}

const mapDefinitions = {
	animals: {
		label: "동물 인형",
		toys: [
			[-1.58, -1.06, "bear", "#e8846d"], [-0.3, 0.97, "duck", "#edc862"], [-0.5, -1.1, "frog", "#89bf98"],
			[0.62, 0.98, "bunny", "#c397c9"], [0.56, -1.06, "cat", "#ed9a76"], [1.6, 0.95, "bear", "#7fb4c4"],
			[1.6, -1.1, "bunny", "#e997a2"], [1.56, -0.06, "frog", "#a4a0d2"], [-1.6, -0.15, "cat", "#e6aa77"],
			[-0.54, -0.04, "chick", "#efcf79"], [0.5, -0.07, "bear", "#9bc4a7"],
		],
	},
	politics: {
		label: "찢토피아",
		toys: [
			[-1.4, -0.95, "chizzilla", "#aaa19a"], [0.05, -1.0, "mulcorita", "#8fba9c"], [1.45, -1.0, "moonkorita", "#8fba9c"],
			[-1.35, -0.1, "chizzilla", "#aaa19a"], [0.15, 0.4, "mulcorita", "#8fba9c"], [1.4, 0.75, "moonkorita", "#8fba9c"],
		],
	},
};
const mapAnimalsButton = document.querySelector("#mapAnimals");
const mapPoliticsButton = document.querySelector("#mapPolitics");
function updatePoliticsMapButton() {
	const purchased = currentAccount ? currentAccount.politicsRoomPurchased : guestPoliticsRoomPurchased;
	mapPoliticsButton.textContent = purchased ? "찢토피아 · 구매 완료" : `찢토피아 구매 · ${politicsRoomPrice.toLocaleString("ko-KR")}코인`;
}
let activeMapId = "animals";
try { localStorage.setItem("plush-club-active-map-v1", "animals"); } catch { /* Start on the animal map if browser storage is unavailable. */ }
let initialToyData = mapDefinitions[activeMapId].toys;
const toys = [];
const cooldownDuration = 5 * 60 * 1000;
const cooldownStoragePrefix = "plush-club-respawn-times-v2-";
const legacyAnimalCooldownKey = "plush-club-respawn-times-v1";
function cooldownStorageKey(mapId) {
	return mapId === "politics" ? `${cooldownStoragePrefix}politics-chizzilla-v1` : `${cooldownStoragePrefix}${mapId}`;
}
function loadRespawnTimes(mapId) {
	const times = Array(mapDefinitions[mapId].toys.length).fill(0);
	try {
		const saved = localStorage.getItem(cooldownStorageKey(mapId)) || (mapId === "animals" ? localStorage.getItem(legacyAnimalCooldownKey) : null);
		const parsed = JSON.parse(saved || "[]");
		if (Array.isArray(parsed)) parsed.forEach((time, index) => {
			if (Number.isFinite(time) && time > Date.now() && index < times.length) times[index] = time;
		});
		localStorage.setItem(cooldownStorageKey(mapId), JSON.stringify(times));
	} catch {
		status.textContent = "보충 기록을 불러오지 못했어요. 현재 브라우저에서 새로 시작합니다.";
	}
	return times;
}
let respawnAt = loadRespawnTimes(activeMapId);
const restockLabel = document.querySelector("#restock");

function addEars(group, kind, color) {
	const firstEarPart = group.children.length;
	addEarParts(group, kind, color);
	// Ears fold under the claw, so they are left out of the plush's contact shape.
	for (const part of group.children.slice(firstEarPart)) part.userData.softEar = true;
}

function addEarParts(group, kind, color) {
	if (kind === "chizzilla") {
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.25, 1.16, -0.015], [0.145, 0.27, 0.11], plush(color), 20);
			sphere(group, [side * 0.25, 1.17, 0.078], [0.085, 0.19, 0.025], blushMaterial, 18);
		}
	} else if (kind === "bunny") {
		// Long floppy ears: thin stuffed panels that droop outwards under their own weight.
		for (const side of [-1, 1]) {
			const ear = puff(group, [side * 0.17, 1.27, -0.01], [0.095, 0.27, 0.05], plush(color), { seam: false, variant: side + 2 });
			ear.rotation.set(-0.12, side * 0.18, side * -0.24);
			const inner = puff(group, [side * 0.175, 1.26, 0.03], [0.05, 0.2, 0.02], blushMaterial, { variant: 3 });
			inner.rotation.copy(ear.rotation);
		}
	} else if (kind === "bear") {
		for (const side of [-1, 1]) {
			puff(group, [side * 0.235, 1.02, -0.01], [0.15, 0.14, 0.075], plush(color), { variant: 1 });
			puff(group, [side * 0.235, 1.02, 0.055], [0.08, 0.075, 0.02], blushMaterial, { variant: 2 });
		}
	} else if (kind === "cat") {
		// Fabric ears are two flat triangles sewn together, so they stay thin and slightly rounded.
		for (const side of [-1, 1]) {
			const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 24, 3), plush(color));
			ear.position.set(side * 0.21, 1.1, -0.01);
			ear.scale.z = 0.42;
			ear.rotation.z = side * -0.24;
			ear.castShadow = true;
			group.add(ear);
		}
	}
}

const politicalKinds = new Set(["mayor", "legislator", "diplomat", "minister", "councilor", "candidate", "spokesperson", "moonjaeger"]);
const politicalTieColors = {
	mayor: "#a84f43",
	legislator: "#52799a",
	diplomat: "#4e8a7a",
	minister: "#b18442",
	councilor: "#89536d",
	candidate: "#4d6f9c",
	spokesperson: "#567e70",
	moonjaeger: "#a84f43",
};

function addPoliticalDetails(group, kind) {
	puff(group, [0, 1.08, 0.015], [0.29, 0.12, 0.26], plushFabric("#413b36", { nap: 1 }), { seam: true, variant: 2 });
	box(group, [0.075, 0.24, 0.045], [0, 0.4, 0.307], feltFabric(politicalTieColors[kind]));
	sphere(group, [0, 0.55, 0.312], [0.065, 0.035, 0.025], bellyMaterial, 14);
	sphere(group, [0.2, 0.4, 0.292], [0.035, 0.035, 0.025], mats.gold, 14);
}

function addSignatureDetails(group, kind) {
	if (kind === "moonjaeger") {
		const scarf = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 6, 16), feltFabric("#a84f43"));
		scarf.position.set(0.15, 0.67, 0.31);
		scarf.rotation.z = -0.28;
		scarf.castShadow = true;
		group.add(scarf);
		const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 24, Math.PI * 1.65), mats.gold);
		crescent.position.set(-0.19, 0.43, 0.32);
		crescent.rotation.z = 0.45;
		group.add(crescent);
	}
}

function makeToy([x, z, kind, color], index, addToScene = true) {
	const group = new THREE.Group();
	group.position.set(x, 0.69, z);
	if (kind === "chizzilla") {
		const fur = plush(color);
		sphere(group, [0, 0.36, -0.035], [0.37, 0.4, 0.29], fur, 24);
		sphere(group, [0, 0.78, -0.025], [0.36, 0.37, 0.29], fur, 24);
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.25, 1.13, -0.035], [0.145, 0.27, 0.1], plush("#aaa19a"), 20);
			sphere(group, [side * 0.25, 1.14, 0.052], [0.085, 0.19, 0.025], blushMaterial, 18);
			sphere(group, [side * 0.31, 0.37, -0.025], [0.12, 0.2, 0.13], fur, 18);
			sphere(group, [side * 0.2, 0.06, 0.035], [0.16, 0.1, 0.17], fur, 18);
		}
		const tailCurve = new THREE.QuadraticBezierCurve3(
			new THREE.Vector3(0.25, 0.13, -0.18), new THREE.Vector3(0.45, 0.05, -0.3), new THREE.Vector3(0.63, 0.1, -0.25),
		);
		group.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.022, 7, false), plush("#8e8178")));
		const imageGeometry = new THREE.PlaneGeometry(1.08, 0.81, 28, 22);
		const imagePosition = imageGeometry.attributes.position;
		for (let vertex = 0; vertex < imagePosition.count; vertex += 1) {
			const imageX = imagePosition.getX(vertex) / 0.54;
			const imageY = imagePosition.getY(vertex) / 0.405;
			imagePosition.setZ(vertex, 0.075 * Math.max(0, 1 - imageX * imageX) * Math.max(0, 1 - imageY * imageY));
		}
		imageGeometry.computeVertexNormals();
		const image = new THREE.Mesh(imageGeometry, chizzillaImageMaterial);
		image.position.set(0, 0.47, 0.29);
		image.renderOrder = 2;
		group.add(image);
		group.scale.setScalar(1.04);
		if (chizzillaPbrTemplate) replaceChizzillaWithPbr(group);
		group.traverse((object) => { if (object.isMesh) { object.castShadow = object !== image; object.receiveShadow = true; } });
		if (addToScene) scene.add(group);
		return { group, x, z, kind, color, index, weight: 0.92, baseScale: 1.04 };
	}
	// Plush in a real machine lie where they were dumped: turned every which way and slumped back or to one side.
	const pose = seededRandom(index * 7919 + kind.length * 131 + 17);
	const restTiltX = -0.06 - pose() * 0.16;
	const restTiltZ = (pose() - 0.5) * 0.26;
	group.rotation.set(restTiltX, (pose() - 0.5) * 1.2, restTiltZ);
	const variant = index % 4;
	const fur = plush(color);
	puff(group, [0, 0.34, 0], [0.34, 0.39, 0.29], fur, { seam: true, flatBottom: true, variant });
	puff(group, [0, 0.81, 0.015], [0.35, 0.34, 0.3], fur, { seam: true, variant: variant + 4 });
	for (const side of [-1, 1]) {
		const arm = puff(group, [side * 0.33, 0.39, 0.03], [0.13, 0.23, 0.14], fur, { variant: variant + side + 2 });
		arm.rotation.z = side * (0.2 + pose() * 0.25);
		arm.rotation.x = -0.15 - pose() * 0.2;
		const leg = puff(group, [side * 0.19, 0.08, 0.1], [0.17, 0.11, 0.2], fur, { flatBottom: true, variant: variant + side + 6 });
		leg.rotation.y = side * (0.15 + pose() * 0.2);
	}
	addEars(group, kind, color);
	puff(group, [0, 0.33, 0.25], [0.2, 0.19, 0.05], bellyMaterial, { variant });
	// Sewn-in care label at the side seam.
	const tag = box(group, [0.004, 0.11, 0.07], [0.29, 0.12, -0.14], tagMaterial, false);
	tag.rotation.set(0.2, 0.4, -0.5);
	tag.userData.softEar = true;
	if (politicalKinds.has(kind)) addPoliticalDetails(group, kind);
	if (kind === "chizzilla" || kind === "moonjaeger") addSignatureDetails(group, kind);
	if (kind === "frog") {
		for (const side of [-1, 1]) puff(group, [side * 0.2, 1.06, 0.1], [0.14, 0.15, 0.13], fur, { variant: variant + side + 4 });
	}
	if (kind === "chick" || kind === "duck") {
		for (const side of [-1, 1]) sphere(group, [side * 0.32, 0.48, 0], [0.1, 0.18, 0.12], fur, 16);
		const beak = kind === "duck"
			? new THREE.Mesh(puffGeometry({ variant: 5 }), beakMaterial)
			: new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.15, 16), beakMaterial);
		beak.position.set(0, 0.76, 0.3);
		beak.scale.set(kind === "duck" ? 0.12 : 0.6, kind === "duck" ? 0.05 : 0.6, kind === "duck" ? 0.08 : 0.4);
		if (kind === "chick") beak.rotation.x = Math.PI / 2;
		group.add(beak);
	}
	if (kind !== "chizzilla") {
		// Domed plastic safety eyes set into the fabric, felt cheeks, and an embroidered nose and mouth.
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.125, 0.84, 0.272], [0.042, 0.042, 0.028], eyeMaterial, 24);
			puff(group, [side * 0.215, 0.72, 0.258], [0.042, 0.024, 0.012], blushMaterial, { variant: 2 });
		}
		if (kind !== "chick" && kind !== "duck") {
			puff(group, [0, 0.755, 0.296], [0.045, 0.03, 0.018], threadMaterial, { variant: 1 });
			const smileCurve = new THREE.CatmullRomCurve3([
				new THREE.Vector3(-0.055, 0.69, 0.285), new THREE.Vector3(-0.025, 0.668, 0.299), new THREE.Vector3(0, 0.684, 0.302),
				new THREE.Vector3(0.025, 0.668, 0.299), new THREE.Vector3(0.055, 0.69, 0.285),
			]);
			group.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 16, 0.007, 6, false), threadMaterial));
		}
	}
	const baseScale = 0.9 + (index % 4) * 0.045;
	group.scale.setScalar(baseScale);
	if (kind === "mulcorita") replaceMulcoritaModel(group);
	if (kind === "moonkorita") {
		replaceMoonkoritaModel(group);
		void loadMoonkoritaModel();
	}
	group.traverse((object) => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
	if (addToScene) scene.add(group);
	const weight = { chick: 0.3, duck: 0.38, bunny: 0.52, cat: 0.62, bear: 0.72, frog: 0.84, mayor: 0.68, legislator: 0.76, diplomat: 0.58, minister: 0.82, councilor: 0.66, candidate: 0.62, spokesperson: 0.7, chizzilla: 0.92, moonjaeger: 0.74, mulcorita: 0.74, moonkorita: 0.74 }[kind] + (index % 3) * 0.04;
	return { group, x, z, kind, color, index, weight, baseScale };
}

function spawnToy(data, index) {
	const toy = makeToy(data, index);
	// Restocked plush is tossed in from above if something now sits on its spot.
	const [x, z] = data;
	if (toys.some((other) => Math.hypot(other.x - x, other.z - z) < 0.75)) toy.group.position.y += 1.1;
	toys.push(toy);
	addToyPhysics(toy);
	return toy;
}

function resetToys() {
	for (const toy of toys) {
		scene.remove(toy.group);
		removeToyPhysics(toy);
	}
	toys.length = 0;
	initialToyData.forEach((data, index) => {
		if (respawnAt[index] <= Date.now()) spawnToy(data, index);
	});
}

function switchMap(mapId) {
	if (mapId === activeMapId) return false;
	if (mapId === "politics" && !politicsPaymentAuthorized) return false;
	if (!clawIsIdle()) {
		status.textContent = "집게가 돌아온 뒤 맵을 바꿀 수 있어요.";
		return false;
	}
	activeMapId = mapId;
	if (mapId === "politics") politicsPaymentAuthorized = false;
	initialToyData = mapDefinitions[activeMapId].toys;
	respawnAt = loadRespawnTimes(activeMapId);
	try { localStorage.setItem("plush-club-active-map-v1", activeMapId); } catch { /* The map remains selected for this session. */ }
	mapAnimalsButton.setAttribute("aria-pressed", String(activeMapId === "animals"));
	mapPoliticsButton.setAttribute("aria-pressed", String(activeMapId === "politics"));
	const stageLabel = document.querySelector(".stage-label");
	stageLabel.textContent = mapDefinitions[activeMapId].label.toUpperCase();
	const sceneColor = activeMapId === "politics" ? "#d6d0c4" : "#cfcac2";
	scene.background.set(sceneColor);
	scene.fog.color.set(sceneColor);
	interiorLight.color.set(activeMapId === "politics" ? "#fff1dc" : "#f6f8ff");
	resetToys();
	clawControl?.reset();
	updateRestockStatus();
	status.textContent = activeMapId === "politics" ? "찢토피아로 이동했어요." : "동물 인형으로 이동했어요.";
	setBusy(false);
	return true;
}

async function enterPoliticsRoom() {
	if (politicsEntryPending || activeMapId === "politics") return;
	if (!clawIsIdle()) {
		status.textContent = "집게가 돌아온 뒤 찢토피아에 입장할 수 있어요.";
		return;
	}
	const purchased = currentAccount ? currentAccount.politicsRoomPurchased : guestPoliticsRoomPurchased;
	const balance = currentAccount ? currentAccount.coins : guestCoins;
	if (!purchased && balance < politicsRoomPrice) {
		status.textContent = `찢토피아 입장에는 ${politicsRoomPrice.toLocaleString("ko-KR")}코인이 필요해요. 현재 ${balance.toLocaleString("ko-KR")}코인이 있어요.`;
		return;
	}
	if (!purchased && !window.confirm(translate(`찢토피아 이용권을 ${politicsRoomPrice.toLocaleString("ko-KR")}코인에 구매할까요? 구매 후에는 계속 무료로 입장할 수 있어요.`))) return;
	politicsEntryPending = true;
	mapAnimalsButton.disabled = true;
	mapPoliticsButton.disabled = true;
	setBusy(true);
	let purchasedNow = false;
	try {
		if (currentAccount && supabaseClient) {
			const { data, error } = await supabaseClient.rpc("purchase_politics_room");
			if (error) throw error;
			currentAccount.coins = data.coins;
			currentAccount.politicsRoomPurchased = data.purchased === true;
			purchasedNow = data.purchased_now === true;
			coinsLabel.textContent = String(data.coins);
			if (!data.ok) {
				status.textContent = `구매에 ${politicsRoomPrice.toLocaleString("ko-KR")}코인이 필요해요. 코인을 모은 뒤 다시 시도해 주세요.`;
				return;
			}
		} else if (currentAccount) {
			purchasedNow = !currentAccount.politicsRoomPurchased;
			if (purchasedNow) currentAccount.coins -= politicsRoomPrice;
			currentAccount.politicsRoomPurchased = true;
			coinsLabel.textContent = String(currentAccount.coins);
			saveCurrentAccount();
		} else {
			purchasedNow = !guestPoliticsRoomPurchased;
			if (purchasedNow) guestCoins -= politicsRoomPrice;
			guestPoliticsRoomPurchased = true;
			if (!saveGuestCoins()) {
				guestPoliticsRoomPurchased = false;
				if (purchasedNow) guestCoins += politicsRoomPrice;
				return;
			}
			guestCoinsLabel.textContent = String(guestCoins);
		}

		updatePoliticsMapButton();
		politicsPaymentAuthorized = true;
		if (switchMap("politics")) {
			status.textContent = purchasedNow
				? `찢토피아 이용권을 ${politicsRoomPrice.toLocaleString("ko-KR")}코인에 구매했어요. 코인을 차감하고 입장합니다.`
				: "찢토피아 이용권 구매가 확인됐어요. 코인 차감 없이 입장합니다.";
		}
	} catch (error) {
		status.textContent = error.message.includes("purchase_politics_room")
			? "찢토피아 구매 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요."
			: "찢토피아 구매를 처리하지 못했어요. 다시 시도해 주세요.";
	} finally {
		politicsEntryPending = false;
		mapAnimalsButton.disabled = false;
		mapPoliticsButton.disabled = false;
		setBusy(!clawIsIdle());
	}
}

function saveRespawnTimes() {
	try {
		localStorage.setItem(cooldownStorageKey(activeMapId), JSON.stringify(respawnAt));
	} catch {
		status.textContent = "보충 시간 저장에 실패했어요. 브라우저 저장 공간을 확인해 주세요.";
	}
}

function updateRestockStatus(now = Date.now()) {
	const mapLabel = mapDefinitions[activeMapId].label;
	const waiting = respawnAt.filter((time) => time > now);
	if (waiting.length === 0) {
		const value = `${mapLabel} · ${toys.length}마리 준비 완료`;
		if (restockLabel.textContent !== translate(value)) restockLabel.textContent = value;
		return;
	}
	const seconds = Math.ceil((Math.min(...waiting) - now) / 1000);
	const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
	const remainder = (seconds % 60).toString().padStart(2, "0");
	const value = `${mapLabel} · 보충 ${waiting.length}마리 · ${minutes}:${remainder}`;
	if (restockLabel.textContent !== translate(value)) restockLabel.textContent = value;
}

function updateRespawns(now = Date.now()) {
	let changed = false;
	for (let index = 0; index < respawnAt.length; index += 1) {
		if (respawnAt[index] === 0 || respawnAt[index] > now) continue;
		respawnAt[index] = 0;
		if (!toys.some((toy) => toy.index === index)) spawnToy(initialToyData[index], index);
		changed = true;
	}
	if (changed) {
		saveRespawnTimes();
		setBusy(!clawIsIdle());
	}
	updateRestockStatus(now);
}

function startRespawnCooldown(index) {
	respawnAt[index] = Date.now() + cooldownDuration;
	saveRespawnTimes();
	updateRestockStatus();
}

const gantry = new THREE.Group();
machine.add(gantry);
const bridge = new THREE.Group();
gantry.add(bridge);
box(bridge, [0.16, 0.12, 2 * RAIL_Z + 0.1], [0, CARRIAGE_Y + 0.1, 0], mats.rail);
for (const z of [-RAIL_Z, RAIL_Z]) box(bridge, [0.3, 0.16, 0.2], [0, CARRIAGE_Y + 0.1, z], mats.carriage);
const carriage = new THREE.Group();
gantry.add(carriage);
roundedBox(carriage, [0.6, 0.36, 0.5], [0, 0.1, 0], mats.carriage, 0.05);
box(carriage, [0.42, 0.03, 0.34], [0, -0.09, 0], mats.rail, false);
// The cable hangs from the carriage pulley to the claw head and is re-aimed every frame, since the claw swings freely.
const cableRig = new THREE.Group();
machine.add(cableRig);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), mats.wire);
cableRig.add(cable);
// Coiled cord that stretches between the carriage and the claw head like a spring.
const coilTurns = 18;
const coilTop = -0.02;
const coilOffsetX = -0.13;
const coilCord = new THREE.Mesh(new THREE.BufferGeometry(), mats.wire);
coilCord.castShadow = true;
cableRig.add(coilCord);
let coilLength = -1;
function updateCoilCord(cableLength) {
	const length = Math.max(0.06, cableLength + coilTop + 0.1);
	if (Math.abs(length - coilLength) < 0.015) return;
	coilLength = length;
	const points = [];
	const steps = coilTurns * 12;
	for (let index = 0; index <= steps; index += 1) {
		const t = index / steps;
		const angle = t * coilTurns * Math.PI * 2;
		points.push(new THREE.Vector3(coilOffsetX + Math.cos(angle) * 0.055, coilTop - t * length, Math.sin(angle) * 0.055));
	}
	coilCord.geometry.dispose();
	coilCord.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps, 0.013, 5, false);
}
// Drawn in model units and scaled like the simulated claw; its pose is copied from the rigid bodies every frame.
const claw = new THREE.Group();
claw.scale.setScalar(CLAW_GEOMETRY.scale);
machine.add(claw);
cylinder(claw, 0.06, 0.08, [0, 0.2, 0], mats.chrome, 18);
cylinder(claw, 0.15, 0.035, [0, 0.15, 0], mats.chrome, 28);
cylinder(claw, 0.1, 0.22, [0, 0.03, 0], mats.chrome, 24);
cylinder(claw, 0.14, 0.035, [0, -0.09, 0], mats.chrome, 28);
cylinder(claw, 0.075, 0.08, [0, -0.15, 0], mats.chrome, 18);
const fingerCurve = new THREE.CatmullRomCurve3(CLAW_GEOMETRY.prong.map(([down, out]) => new THREE.Vector3(0, down, out)));
const fingerGeometry = new THREE.TubeGeometry(fingerCurve, 24, 0.018, 8, false);
const [fingerTipDown, fingerTipOut] = CLAW_GEOMETRY.prong.at(-1);
const fingers = [];
for (let index = 0; index < 3; index += 1) {
	const arm = new THREE.Group();
	arm.rotation.y = index * (Math.PI * 2 / 3);
	claw.add(arm);
	const hinge = new THREE.Group();
	hinge.position.set(0, CLAW_GEOMETRY.hinge.y, CLAW_GEOMETRY.hinge.radial);
	hinge.rotation.x = -CLAW_GEOMETRY.openAngle;
	arm.add(hinge);
	const prong = new THREE.Mesh(fingerGeometry, mats.chrome);
	prong.castShadow = true;
	hinge.add(prong);
	sphere(hinge, [0, 0, 0], [0.032, 0.032, 0.032], mats.chrome, 12);
	sphere(hinge, [0, fingerTipDown, fingerTipOut], [0.026, 0.026, 0.026], mats.chrome, 10);
	fingers.push(hinge);
}

// Rigid-body simulation of the claw and every plush. Rapier is loaded on demand so the page still works while it downloads.
const PIT = {
	halfX: CABINET.width / 2 - CABINET.wall,
	halfZ: CABINET.depth / 2 - CABINET.wall,
	top: CABINET.glassTop,
	shaftBottom: CABINET.bandBottom + 0.01,
};
const clawModeStorageKey = "plush-club-claw-mode-v1";
let clawDifficulty = "fun";
try { if (localStorage.getItem(clawModeStorageKey) === "realistic") clawDifficulty = "realistic"; } catch { /* Fun mode by default. */ }
let clawSim = null;
let clawControl = null;
let physicsLag = 0;
let roundExplained = false;
let nextPhysicsId = 1;
const toyByPhysicsId = new Map();

function clawIsIdle() {
	return !clawControl || clawControl.state.mode === "ready";
}

// Each sizeable mesh of a plush becomes one convex hull, expressed in the plush's unscaled body frame.
const hullFrame = new THREE.Matrix4();
const hullPartMatrix = new THREE.Matrix4();
const hullVertex = new THREE.Vector3();
const unitScale = new THREE.Vector3(1, 1, 1);
function plushHullParts(toy) {
	const { group } = toy;
	group.updateWorldMatrix(true, true);
	hullFrame.compose(group.position, group.quaternion, unitScale).invert();
	const parts = [];
	group.traverse((object) => {
		const position = object.isMesh ? object.geometry?.attributes?.position : null;
		if (!position) return;
		if (!object.geometry.boundingSphere) object.geometry.computeBoundingSphere();
		hullPartMatrix.multiplyMatrices(hullFrame, object.matrixWorld);
		const radius = object.geometry.boundingSphere.radius * hullPartMatrix.getMaxScaleOnAxis();
		// Eyes, stitching and labels are too small to matter for contacts.
		if (radius < 0.07) return;
		const stride = Math.max(1, Math.floor(position.count / 160));
		const points = [];
		for (let index = 0; index < position.count; index += stride) {
			hullVertex.fromBufferAttribute(position, index).applyMatrix4(hullPartMatrix);
			points.push(hullVertex.x, hullVertex.y, hullVertex.z);
		}
		parts.push({ radius, points: new Float32Array(points) });
	});
	return parts.sort((a, b) => b.radius - a.radius).slice(0, 24).map((part) => part.points);
}

function addToyPhysics(toy) {
	if (!clawSim || toy.physics) return;
	const id = nextPhysicsId;
	nextPhysicsId += 1;
	const { position, quaternion } = toy.group;
	toy.physics = clawSim.addToy(id, {
		position: { x: position.x, y: position.y, z: position.z },
		rotation: { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
		parts: plushHullParts(toy),
		mass: plushMass(toy.weight),
	});
	toyByPhysicsId.set(id, toy);
}

function rebuildToyPhysics(toy) {
	if (clawSim && toy.physics) clawSim.rebuildToy(toy.physics.id, plushHullParts(toy), plushMass(toy.weight));
}

function removeToyPhysics(toy) {
	if (!toy.physics) return;
	toyByPhysicsId.delete(toy.physics.id);
	clawSim?.removeToy(toy.physics.id);
	toy.physics = null;
}

void import("@dimforge/rapier3d-compat").then(async ({ default: RAPIER }) => {
	await RAPIER.init();
	clawSim = createClawWorld(RAPIER, { pit: PIT, carriageY: CARRIAGE_Y, home: CLAW_HOME });
	clawControl = createClawController(clawSim, { home: CLAW_HOME, reach: CLAW_REACH });
	clawControl.state.difficulty = clawDifficulty;
	for (const toy of toys) addToyPhysics(toy);
	clawSim.settle(0.6);
	syncPhysicsScene();
	setBusy(false);
}).catch(() => {
	status.textContent = "물리 엔진을 불러오지 못했어요. 페이지를 새로고침해 주세요.";
});
const keys = new Set();
const clock = new THREE.Clock();
const joystickVector = { x: 0, z: 0 };
let joystickPointerId = null;
let score = 0;
let coinAlertTimer = 0;

function showCoinShortage() {
	const message = "코인이 부족해요. +5 코인 버튼으로 먼저 충전해 주세요.";
	status.textContent = message;
	status.classList.add("hint-coin-alert");
	window.clearTimeout(coinAlertTimer);
	coinAlertTimer = window.setTimeout(() => {
		if (status.textContent === translate(message)) status.innerHTML = defaultStatusMarkup;
		status.classList.remove("hint-coin-alert");
	}, 5000);
}

function loadGuestCoins() {
	try {
		const wallet = localStorage.getItem(guestWalletStorageKey);
		if (wallet !== null) {
			const parsedWallet = JSON.parse(wallet);
			if (Number.isSafeInteger(parsedWallet.coins) && parsedWallet.coins >= 0) return parsedWallet.coins;
		}
		const storedCoins = localStorage.getItem(guestCoinStorageKey);
		if (storedCoins === null) {
			localStorage.setItem(guestCoinStorageKey, String(coinPack));
			return coinPack;
		}
		const parsedCoins = Number(storedCoins);
		return Number.isSafeInteger(parsedCoins) && parsedCoins >= 0 ? parsedCoins : coinPack;
	} catch {
		return coinPack;
	}
}

function loadGuestPoliticsRoomPurchased() {
	try {
		const wallet = JSON.parse(localStorage.getItem(guestWalletStorageKey) || "null");
		return wallet?.politicsRoomPurchased === true;
	} catch {
		return false;
	}
}

function saveGuestCoins() {
	try {
		localStorage.setItem(guestWalletStorageKey, JSON.stringify({ coins: guestCoins, politicsRoomPurchased: guestPoliticsRoomPurchased }));
	} catch {
		status.textContent = "게스트 코인을 저장할 수 없어요. 이 브라우저에서만 유지됩니다.";
		return false;
	}
	try {
		localStorage.setItem(guestCoinStorageKey, String(guestCoins));
	} catch { /* The versioned guest wallet remains the source of truth. */ }
	return true;
}

function loadGuestCoinClaimTime() {
	try {
		const value = Number(localStorage.getItem(guestCoinCooldownStorageKey));
		return Number.isSafeInteger(value) && value > Date.now() ? value : 0;
	} catch {
		return 0;
	}
}

function saveGuestCoinClaimTime() {
	try {
		localStorage.setItem(guestCoinCooldownStorageKey, String(guestNextCoinClaimAt));
	} catch {
		status.textContent = "코인 대기 시간을 저장하지 못했어요.";
	}
}

function loadGuestDailyBonusClaimTime() {
	try {
		const value = Number(localStorage.getItem(guestDailyBonusCooldownStorageKey));
		return Number.isSafeInteger(value) && value > Date.now() ? value : 0;
	} catch {
		return 0;
	}
}

function saveGuestDailyBonusClaimTime() {
	try {
		localStorage.setItem(guestDailyBonusCooldownStorageKey, String(guestNextDailyBonusAt));
	} catch {
		status.textContent = "일일 보너스 대기 시간을 저장하지 못했어요.";
	}
}

function loadAccounts() {
	try {
		const savedAccounts = JSON.parse(localStorage.getItem(accountStorageKey) || "[]");
		return Array.isArray(savedAccounts) ? savedAccounts.filter((item) => item && typeof item.usernameKey === "string" && typeof item.passwordHash === "string").map((item) => ({
			...item,
			coins: Number.isSafeInteger(item.coins) && item.coins >= 0 ? item.coins : 0,
			politicsRoomPurchased: item.politicsRoomPurchased === true,
			nextCoinClaimAt: Number.isSafeInteger(item.nextCoinClaimAt) && item.nextCoinClaimAt > Date.now() ? item.nextCoinClaimAt : 0,
			bag: Array.isArray(item.bag) ? item.bag : [],
		})) : [];
	} catch {
		return [];
	}
}

function persistAccounts() {
	try {
		localStorage.setItem(accountStorageKey, JSON.stringify(accounts));
		return true;
	} catch {
		authError.textContent = "계정 정보를 저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.";
		return false;
	}
}

function saveCurrentAccount() {
	if (!currentAccount) return;
	if (supabaseClient && currentAccount.id) {
		const profileId = currentAccount.id;
		const profileData = {
			bag: JSON.parse(JSON.stringify(currentAccount.bag)),
			updated_at: new Date().toISOString(),
		};
		profileWriteQueue = profileWriteQueue.then(async () => {
			const { error } = await supabaseClient.from("profiles").update(profileData).eq("id", profileId);
			if (error) status.textContent = "계정 저장에 실패했어요. Supabase 테이블 설정을 확인해 주세요.";
		});
		return;
	}
	const accountIndex = accounts.findIndex((item) => item.usernameKey === currentAccount.usernameKey);
	if (accountIndex < 0) accounts.push(currentAccount);
	else accounts[accountIndex] = currentAccount;
	persistAccounts();
}

async function loadSupabaseProfile(user) {
	const { data, error } = await supabaseClient.from("profiles").select("id, username, coins, next_coin_claim_at, next_daily_bonus_at, politics_room_purchased, bag").eq("id", user.id).single();
	if (error) throw error;
	return {
		id: data.id,
		username: data.username,
		coins: Number.isSafeInteger(data.coins) && data.coins >= 0 ? data.coins : 0,
		nextCoinClaimAt: data.next_coin_claim_at ? new Date(data.next_coin_claim_at).getTime() : 0,
		nextDailyBonusAt: data.next_daily_bonus_at ? new Date(data.next_daily_bonus_at).getTime() : 0,
		politicsRoomPurchased: data.politics_room_purchased === true,
		bag: Array.isArray(data.bag) ? data.bag : [],
	};
}

function bytesToHex(bytes) {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltHex) {
	const salt = new Uint8Array(saltHex.match(/.{2}/g).map((value) => Number.parseInt(value, 16)));
	const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
	const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: passwordIterations, hash: "SHA-256" }, key, 256);
	return bytesToHex(new Uint8Array(derived));
}

function getToyName(kind) {
	return { bear: "곰돌이", chick: "병아리", duck: "오리", frog: "개구리", bunny: "토끼", cat: "고양이", mayor: "시장 후보", legislator: "의원", diplomat: "외교관", minister: "장관", councilor: "시의원", candidate: "후보자", spokesperson: "대변인", chizzilla: "찢칠라", moonjaeger: "문크예거", mulcorita: "대리석 문코리타", moonkorita: "문코리타" }[kind] || "말랑 인형";
}

function getColorName(color) {
	if (color === "rainbow") return "레인보우";
	return craftColors.find((option) => option.value === color)?.name || "기본";
}

function launchPrizeFireworks() {
	const sequence = ++fireworkSequence;
	prizeFireworks.replaceChildren();
	const symbols = ["🎉", "✨", "🎊", "🌟", "💫", "🧡"];
	const origins = [{ x: 18, y: 30 }, { x: 82, y: 28 }, { x: 50, y: 67 }];
	for (let burst = 0; burst < origins.length; burst += 1) {
		for (let index = 0; index < 9; index += 1) {
			const angle = (Math.PI * 2 * index) / 9 + Math.random() * 0.24;
			const distance = 48 + Math.random() * 74;
			const particle = document.createElement("span");
			particle.className = "reward-firework";
			particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
			particle.style.setProperty("--origin-x", `${origins[burst].x}%`);
			particle.style.setProperty("--origin-y", `${origins[burst].y}%`);
			particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
			particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
			particle.style.setProperty("--size", `${18 + Math.random() * 11}px`);
			particle.style.setProperty("--turn", `${Math.round(Math.random() * 100 - 50)}deg`);
			particle.style.setProperty("--delay", `${burst * 100 + Math.random() * 90}ms`);
			prizeFireworks.append(particle);
		}
	}
	window.setTimeout(() => {
		if (sequence === fireworkSequence) prizeFireworks.replaceChildren();
	}, 1500);
}

function showPrize(toy, source = "pull") {
	if (prizeModel) prizeScene.remove(prizeModel);
	prizeModelKind = toy.kind;
	prizeModel = toy.group.clone(true);
	prizeModel.position.set(0, toy.kind === "chizzilla" ? 0.46 : 0, 0);
	prizeModel.rotation.set(0, -0.16, 0);
	prizeModel.scale.setScalar(toy.kind === "chizzilla" ? 1.35 : 1.18);
	prizeScene.add(prizeModel);
	const toyName = getToyName(toy.kind);
	const colorName = getColorName(toy.color);
	prizeNameLabel.textContent = `${colorName} ${toyName}인형 · PLUSH CLUB 컬렉션`;
	if (source === "bag") {
		prizeTitleLabel.textContent = `${toyName}인형이에요!`;
		prizeCopy.textContent = `가방에서 선택한 ${colorName} ${toyName}인형이에요.`;
		prizeShareDescription = `${colorName} ${toyName}인형이에요!`;
	} else if (source === "shop") {
		prizeTitleLabel.textContent = `${toyName}인형 프로필`;
		prizeCopy.textContent = `${colorName} ${toyName}인형${toy.detail ? ` · ${toy.detail}` : ""}`;
		prizeShareDescription = `${colorName} ${toyName}인형 프로필`;
	} else {
		prizeTitleLabel.textContent = "인형을 뽑으셨어요!";
		prizeCopy.textContent = currentAccount
			? "축하해요! 새로운 친구가 가방에 추가됐어요."
			: "축하해요! 로그인하지 않으면 인형이 가방에 모이지 않아요.";
		prizeShareDescription = `${colorName} ${toyName}인형을 뽑았어요!`;
	}
	sharePrizeButton.textContent = "공유하기";
	prizeReturnFocus = document.activeElement;
	prizeGate.hidden = false;
	launchPrizeFireworks();
	requestAnimationFrame(renderPrizePreview);
}

function renderPrizePreview() {
	if (prizeGate.hidden || !prizeModel) return;
	const bounds = prizeCanvas.getBoundingClientRect();
	prizeRenderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
	prizeRenderer.render(prizeScene, prizeCamera);
}

function makeBagPreview(item) {
	return makeToy([0, 0, item.kind, item.color], 0, false);
}

function closePrize() {
	prizeGate.hidden = true;
	setBusy(!clawIsIdle());
	const focusTarget = prizeReturnFocus?.isConnected
		? prizeReturnFocus
		: bagGate.hidden ? dropButton : document.querySelector("#closeBag");
	focusTarget.focus();
}

async function sharePrize() {
	const text = `${prizeShareDescription} ${prizeNameLabel.textContent}`;
	const shareData = { title: "말랑말랑 뽑기방", text, url: window.location.href };
	if (navigator.share) {
		try {
			await navigator.share(shareData);
		} catch (error) {
			if (error.name !== "AbortError") prizeCopy.textContent = "공유를 완료하지 못했어요. 다시 시도해 주세요.";
		}
		return;
	}
	try {
		await navigator.clipboard.writeText(`${text} ${shareData.url}`);
		prizeCopy.textContent = "공유 링크를 복사했어요.";
		sharePrizeButton.textContent = "복사 완료";
	} catch {
		window.prompt("공유 링크를 복사해 주세요.", shareData.url);
	}
}

function renderBag() {
	if (!currentAccount) return;
	let assignedIds = false;
	for (const item of currentAccount.bag) {
		if (typeof item.id !== "string" || !item.id) {
			item.id = crypto.randomUUID();
			assignedIds = true;
		}
	}
	if (assignedIds) saveCurrentAccount();
	bagCountLabel.textContent = String(currentAccount.bag.length);
	bagSummary.textContent = currentAccount.bag.length ? `${currentAccount.username}님의 친구 ${currentAccount.bag.length}마리` : "아직 데려온 친구가 없어요.";
	bagItems.replaceChildren();
	if (currentAccount.bag.length === 0) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "bag-empty";
		emptyItem.textContent = "인형을 뽑으면 여기에 모여요.";
		bagItems.append(emptyItem);
		return;
	}
	for (let index = currentAccount.bag.length - 1; index >= 0; index -= 1) {
		const item = currentAccount.bag[index];
		const listItem = document.createElement("li");
		listItem.className = "bag-item";
		const itemRow = document.createElement("div");
		itemRow.className = "bag-item-row";
		const button = document.createElement("button");
		button.type = "button";
		button.className = "bag-item-button";
		button.dataset.bagIndex = String(index);
		const swatch = document.createElement("span");
		swatch.className = "bag-swatch";
		if (item.color === "rainbow") swatch.style.background = "linear-gradient(135deg, #e45b5b, #ed9159, #e9c64f, #68aa70, #6097d0, #595d9d, #9b69b4)";
		else swatch.style.backgroundColor = /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#a8d7bb";
		const name = document.createElement("span");
		name.className = "bag-item-name";
		name.textContent = `${getColorName(item.color)} ${getToyName(item.kind)}인형`;
		button.setAttribute("aria-label", `${name.textContent} 자세히 보기`);
		const date = document.createElement("span");
		date.className = "bag-item-date";
		date.textContent = new Date(item.collectedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
		button.append(swatch, name, date);
		itemRow.append(button);
		listItem.append(itemRow);
		bagItems.append(listItem);
	}
}

function makeShopItemInfo(kind, color, subtitle = "") {
	const info = document.createElement("button");
	info.type = "button";
	info.className = "shop-item-info";
	const nameText = `${getColorName(color)} ${getToyName(kind)}인형`;
	info.setAttribute("aria-label", `${nameText} 상세 정보 보기`);
	const copy = document.createElement("span");
	copy.className = "shop-item-copy";
	const name = document.createElement("span");
	name.className = "shop-item-name";
	name.textContent = `${getColorName(color)} ${getToyName(kind)}인형`;
	copy.append(name);
	if (subtitle) {
		const meta = document.createElement("span");
		meta.className = "shop-item-meta";
		meta.textContent = subtitle;
		copy.append(meta);
	}
	info.append(makeToyPortrait(kind, color), copy);
	info.addEventListener("click", () => showPrize({ ...makeBagPreview({ kind, color }), detail: subtitle }, "shop"));
	return info;
}

let toyPortraitSequence = 0;
function makeToyPortrait(kind, color) {
	const namespace = "http://www.w3.org/2000/svg";
	const portrait = document.createElementNS(namespace, "svg");
	portrait.classList.add("shop-toy-portrait");
	portrait.setAttribute("viewBox", "0 0 48 48");
	portrait.setAttribute("aria-hidden", "true");
	const addShape = (tag, attributes) => {
		const shape = document.createElementNS(namespace, tag);
		for (const [key, value] of Object.entries(attributes)) shape.setAttribute(key, value);
		portrait.append(shape);
		return shape;
	};
	let faceFill = /^#[0-9a-f]{6}$/i.test(color) ? color : "#a8d7bb";
	if (color === "rainbow") {
		const gradientId = `toy-portrait-gradient-${toyPortraitSequence++}`;
		const defs = document.createElementNS(namespace, "defs");
		const gradient = document.createElementNS(namespace, "linearGradient");
		gradient.id = gradientId;
		gradient.setAttribute("x1", "0");
		gradient.setAttribute("y1", "0");
		gradient.setAttribute("x2", "1");
		gradient.setAttribute("y2", "1");
		for (const [offset, stopColor] of [["0%", "#e45b5b"], ["20%", "#ed9159"], ["40%", "#e9c64f"], ["60%", "#68aa70"], ["80%", "#6097d0"], ["100%", "#9b69b4"]]) {
			const stop = document.createElementNS(namespace, "stop");
			stop.setAttribute("offset", offset);
			stop.setAttribute("stop-color", stopColor);
			gradient.append(stop);
		}
		defs.append(gradient);
		portrait.append(defs);
		faceFill = `url(#${gradientId})`;
	}
	addShape("circle", { cx: "24", cy: "24", r: "23", fill: "#f0ede3" });
	if (kind === "bunny") {
		addShape("ellipse", { cx: "17", cy: "12", rx: "4", ry: "9", fill: faceFill });
		addShape("ellipse", { cx: "31", cy: "12", rx: "4", ry: "9", fill: faceFill });
		addShape("ellipse", { cx: "17", cy: "12", rx: "1.5", ry: "6", fill: "#f3a5ae" });
		addShape("ellipse", { cx: "31", cy: "12", rx: "1.5", ry: "6", fill: "#f3a5ae" });
	} else if (kind === "cat") {
		addShape("path", { d: "M9 22 12 6l12 12M25 18 37 6l3 16", fill: faceFill, stroke: "#73594e", "stroke-width": "1.2", "stroke-linejoin": "round" });
	} else if (kind === "bear" || kind === "frog") {
		addShape("circle", { cx: "12", cy: "16", r: "7", fill: faceFill });
		addShape("circle", { cx: "36", cy: "16", r: "7", fill: faceFill });
		if (kind === "bear") {
			addShape("circle", { cx: "12", cy: "16", r: "3.5", fill: "#f3a5ae" });
			addShape("circle", { cx: "36", cy: "16", r: "3.5", fill: "#f3a5ae" });
		}
	} else if (kind === "chizzilla") {
		addShape("path", { d: "M15 16 11 7l9 5M33 16l4-9-9 5", fill: faceFill, stroke: "#73594e", "stroke-width": "1.2", "stroke-linejoin": "round" });
	}
	addShape("ellipse", { cx: "24", cy: "28", rx: "17", ry: "16", fill: faceFill, stroke: "#72594d", "stroke-width": "1.2" });
	if (politicalKinds.has(kind)) addShape("path", { d: "M13 18 Q24 5 35 18 L32 20 Q24 14 16 20Z", fill: "#473e38" });
	addShape("circle", { cx: "18", cy: "27", r: "1.6", fill: "#293531" });
	addShape("circle", { cx: "30", cy: "27", r: "1.6", fill: "#293531" });
	addShape("circle", { cx: "14", cy: "33", r: "2", fill: "#ed9a9b", opacity: "0.7" });
	addShape("circle", { cx: "34", cy: "33", r: "2", fill: "#ed9a9b", opacity: "0.7" });
	if (kind === "duck" || kind === "chick") addShape("path", { d: "M21 31 27 31 24 35Z", fill: "#e88d54" });
	else addShape("path", { d: "M21 32 Q24 35 27 32", fill: "none", stroke: "#73594e", "stroke-width": "1.2", "stroke-linecap": "round" });
	return portrait;
}

async function reloadCurrentProfile() {
	if (!supabaseClient || !currentAccount?.id) throw new Error("로그인한 Supabase 계정이 필요합니다.");
	const { data, error } = await supabaseClient.from("profiles").select("id, username, coins, next_coin_claim_at, next_daily_bonus_at, politics_room_purchased, bag").eq("id", currentAccount.id).single();
	if (error) throw error;
	currentAccount.coins = data.coins;
	currentAccount.nextCoinClaimAt = data.next_coin_claim_at ? new Date(data.next_coin_claim_at).getTime() : 0;
	currentAccount.nextDailyBonusAt = data.next_daily_bonus_at ? new Date(data.next_daily_bonus_at).getTime() : 0;
	currentAccount.politicsRoomPurchased = data.politics_room_purchased === true;
	currentAccount.bag = Array.isArray(data.bag) ? data.bag : [];
	coinsLabel.textContent = String(currentAccount.coins);
	score = currentAccount.bag.length;
	scoreLabel.textContent = `${score} 마리`;
	renderBag();
}

function renderShopSellItems() {
	shopSellItems.replaceChildren();
	if (!currentAccount?.bag.length) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "bag-empty";
		emptyItem.textContent = "판매할 인형이 가방에 없어요.";
		shopSellItems.append(emptyItem);
		return;
	}
	for (const item of currentAccount.bag) {
		const listItem = document.createElement("li");
		listItem.className = "shop-card";
		listItem.append(makeShopItemInfo(item.kind, item.color, "눌러서 정보 보기"));
		const controls = document.createElement("div");
		controls.className = "shop-sell-controls";
		
		const rareToys = ["chizzilla", "mulcorita", "moonkorita"];
		const isRareToy = rareToys.includes(item.kind);
		const quickSellPrice = isRareToy ? 1000 : 15;
		const tradePrice = isRareToy ? 1000 : 15;
		
		const quickSellButton = document.createElement("button");
		quickSellButton.className = "shop-sell-button";
		quickSellButton.type = "button";
		quickSellButton.textContent = `판매 (${quickSellPrice}코인)`;
		quickSellButton.disabled = !supabaseClient || !item.id;
		quickSellButton.addEventListener("click", async () => {
			sellConfirmGate.hidden = false;
			confirmSellButton.onclick = async () => {
				confirmSellButton.disabled = true;
				sellConfirmGate.hidden = true;
				try {
					if (!supabaseClient) {
						throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
					}
					if (!currentAccount?.id) {
						throw new Error("프로필 정보가 없습니다.");
					}
					if (!item.id) {
						throw new Error("인형 ID가 없습니다.");
					}
					
					// RPC를 통해 아이템 판매
					const { data, error } = await supabaseClient.rpc("sell_item", {
						p_item_id: item.id,
						p_sale_price: quickSellPrice
					});
					
					if (error) {
						console.error("Supabase RPC error:", error);
						throw error;
					}
					
					if (!data.success) {
						throw new Error(data.error || "판매 중 오류가 발생했어요.");
					}
					
					// 로컬 상태 업데이트
					currentAccount.coins += quickSellPrice;
					currentAccount.bag = currentAccount.bag.filter(i => i.id !== item.id);
					coinsLabel.textContent = String(currentAccount.coins);
					
					await refreshShop();
					shopStatus.textContent = `인형을 ${quickSellPrice}코인으로 판매했어요. 코인이 즉시 지급됩니다.`;
				} catch (error) {
					console.error("판매 오류:", error);
					shopStatus.textContent = error.message
						? error.message
						: "판매 중 오류가 발생했어요.";
					confirmSellButton.disabled = false;
				}
			};
		});
		
		const tradeButton = document.createElement("button");
		tradeButton.className = "shop-sell-button";
		tradeButton.type = "button";
		tradeButton.textContent = `거래하기 (${tradePrice}코인)`;
		tradeButton.disabled = !supabaseClient || !item.id;
		tradeButton.addEventListener("click", async () => {
			tradeButton.disabled = true;
			try {
				const { error } = await supabaseClient.rpc("create_market_listing", { p_item_id: item.id, p_price: tradePrice });
				if (error) throw error;
				await reloadCurrentProfile();
				await refreshShop();
				shopStatus.textContent = `인형을 ${tradePrice}코인으로 상점에 등록했어요.`;
			} catch (error) {
				shopStatus.textContent = error.message.includes("create_market_listing")
					? "상점 데이터베이스 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요."
					: error.message;
				tradeButton.disabled = false;
			}
		});
		
		controls.append(quickSellButton, tradeButton);
		listItem.append(controls);
		shopSellItems.append(listItem);
	}
}

async function refreshShop() {
	shopListings.replaceChildren();
	renderShopSellItems();
	if (!supabaseClient || !currentAccount?.id) {
		shopStatus.textContent = "상점 거래는 Supabase 회원만 이용할 수 있어요.";
		return;
	}
	shopStatus.textContent = "매물을 불러오는 중이에요.";
	const { data, error } = await supabaseClient
		.from("market_listings")
		.select("id, seller_id, toy_kind, toy_color, price, listed_at")
		.is("sold_at", null)
		.is("cancelled_at", null)
		.order("listed_at", { ascending: false })
		.limit(100);
	if (error) {
		shopStatus.textContent = "상점 테이블을 사용할 수 없어요. 최신 supabase/schema.sql을 실행해 주세요.";
		return;
	}
	shopStatus.textContent = data.length ? `${data.length}개 매물 · 판매 금액은 판매자에게 지급됩니다.` : "현재 등록된 인형이 없어요.";
	for (const listing of data) {
		const listItem = document.createElement("li");
		listItem.className = "shop-card";
		const ownerLabel = listing.seller_id === currentAccount.id ? "내 매물" : "회원 판매";
		listItem.append(makeShopItemInfo(listing.toy_kind, listing.toy_color, `${ownerLabel} · 눌러서 정보 보기`));
		const actions = document.createElement("div");
		actions.className = "shop-sell-controls";
		const price = document.createElement("span");
		price.className = "shop-price";
		price.textContent = `${listing.price}코인`;
		const actionButton = document.createElement("button");
		actionButton.className = "shop-buy-button";
		actionButton.type = "button";
		const ownListing = listing.seller_id === currentAccount.id;
		actionButton.textContent = ownListing ? "취소" : "구매";
		actionButton.disabled = !ownListing && currentAccount.coins < listing.price;
		actionButton.addEventListener("click", async () => {
			actionButton.disabled = true;
			try {
				const rpcName = ownListing ? "cancel_market_listing" : "buy_market_listing";
				const { error: rpcError } = await supabaseClient.rpc(rpcName, { p_listing_id: listing.id });
				if (rpcError) throw rpcError;
				await reloadCurrentProfile();
				await refreshShop();
				shopStatus.textContent = ownListing ? "판매를 취소하고 인형을 가방에 돌려놓았어요." : "구매가 완료되어 인형을 가방에 넣었어요.";
			} catch (rpcError) {
				shopStatus.textContent = rpcError.message.includes("buy_market_listing") || rpcError.message.includes("create_market_listing") || rpcError.message.includes("cancel_market_listing")
					? "상점 RPC 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요."
					: rpcError.message;
				actionButton.disabled = false;
			}
		});
		actions.append(price, actionButton);
		listItem.append(actions);
		shopListings.append(listItem);
	}
}

function refreshAccountDisplay() {
	const loggedIn = Boolean(currentAccount);
	updatePoliticsMapButton();
	accountTools.hidden = !loggedIn;
	shopButton.hidden = !loggedIn || !supabaseClient;
	guestTools.hidden = loggedIn;
	if (loggedIn) {
		accountName.textContent = currentAccount.username;
		coinsLabel.textContent = String(currentAccount.coins);
		renderBag();
	} else {
		guestCoinsLabel.textContent = String(guestCoins);
	}
	setBusy(!clawIsIdle());
	updateCoinClaimButtons();
	updateDailyBonusButton();
}

function updateCoinClaimButtons() {
	const now = Date.now();
	const updateButton = (button, nextClaimAt) => {
		const remaining = Math.max(0, nextClaimAt - now);
		if (remaining === 0) {
			button.textContent = "+5 코인";
			button.title = "5분마다 5코인 받기";
			button.disabled = false;
			return;
		}
		const seconds = Math.ceil(remaining / 1000);
		button.textContent = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
		button.title = "다음 코인 받기까지 남은 시간";
		button.disabled = true;
	};
	updateButton(accountClaimButton, currentAccount?.nextCoinClaimAt || 0);
	updateButton(guestClaimButton, guestNextCoinClaimAt);
}

function updateDailyBonusButton() {
	const now = Date.now();
	const nextClaimAt = currentAccount?.nextDailyBonusAt || 0;
	const remaining = Math.max(0, nextClaimAt - now);
	if (remaining === 0) {
		dailyBonusButton.textContent = "🎁 일일 보너스 (200코인)";
		dailyBonusButton.title = "하루에 한 번 200코인 받기";
		dailyBonusButton.disabled = !currentAccount;
		return;
	}
	const totalSeconds = Math.ceil(remaining / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
	dailyBonusButton.textContent = `🎁 ${timeStr}`;
	dailyBonusButton.title = "다음 일일 보너스까지 남은 시간";
	dailyBonusButton.disabled = true;
}

function enterAccount(account) {
	currentAccount = account;
	currentAccount.coins = Number.isSafeInteger(currentAccount.coins) && currentAccount.coins >= 0 ? currentAccount.coins : 0;
	currentAccount.politicsRoomPurchased = currentAccount.politicsRoomPurchased === true;
	currentAccount.nextCoinClaimAt = currentAccount.nextCoinClaimAt ? new Date(currentAccount.nextCoinClaimAt).getTime() : 0;
	currentAccount.nextDailyBonusAt = currentAccount.nextDailyBonusAt ? new Date(currentAccount.nextDailyBonusAt).getTime() : 0;
	currentAccount.bag = Array.isArray(currentAccount.bag) ? currentAccount.bag : [];
	if (supabaseClient && !currentAccount.id) throw new Error("Supabase profile ID is missing");
	score = currentAccount.bag.length;
	scoreLabel.textContent = `${score} 마리`;
	if (!supabaseClient) {
		try { localStorage.setItem(sessionStorageKey, currentAccount.usernameKey); } catch { /* Session remains active for this page. */ }
	}
	authGate.hidden = true;
	bagGate.hidden = true;
	shopGate.hidden = true;
	authError.textContent = "";
	refreshAccountDisplay();
	status.textContent = currentAccount.coins > 0 ? "로그인했어요. 코인을 사용해 인형을 뽑아 보세요." : "+5 코인 버튼으로 코인을 충전해 주세요.";
}

function setAuthMode(mode) {
	authMode = mode;
	pendingConfirmationEmail = "";
	resendConfirmationButton.hidden = true;
	const signingUp = mode === "signup";
	document.querySelector("#loginTab").setAttribute("aria-selected", String(!signingUp));
	document.querySelector("#signupTab").setAttribute("aria-selected", String(signingUp));
	document.querySelector("#confirmField").hidden = !signingUp;
	document.querySelector("#confirmPassword").required = signingUp;
	document.querySelector("#emailField").hidden = !supabaseConfigured;
	document.querySelector("#email").required = supabaseConfigured;
	document.querySelector("#usernameField").hidden = supabaseConfigured && !signingUp;
	document.querySelector("#username").required = !supabaseConfigured || signingUp;
	document.querySelector("#password").autocomplete = signingUp ? "new-password" : "current-password";
	document.querySelector("#authTitle").textContent = signingUp ? "새 계정을 만들어요" : "인형 친구를 만나볼까요?";
	document.querySelector("#authSubmit").textContent = signingUp ? "회원가입" : "로그인";
	authError.textContent = "";
}

function isEmailRateLimitError(error) {
	const detail = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
	return detail.includes("email rate limit") || detail.includes("rate limit exceeded") || detail.includes("over_email_send_rate_limit");
}

function fitDistance(aspect) {
	const tan = Math.tan(THREE.MathUtils.degToRad(21));
	return Math.max(machineFit.width / (2 * tan * aspect), machineFit.height / (2 * tan)) * 1.04 / cameraOrbit.zoom;
}

function resize() {
	const bounds = canvas.getBoundingClientRect();
	const width = Math.max(1, bounds.width);
	const height = Math.max(1, bounds.height);
	const aspect = width / height;
	cameraOrbit.distance = fitDistance(aspect);
	camera.aspect = aspect;
	updateCameraOrbit();
	camera.updateProjectionMatrix();
	renderer.setSize(width, height, false);
}

function updateCameraOrbit() {
	const horizontalDistance = Math.cos(cameraOrbit.elevation) * cameraOrbit.distance;
	camera.position.set(
		cameraTarget.x + Math.sin(cameraOrbit.azimuth) * horizontalDistance,
		cameraTarget.y + Math.sin(cameraOrbit.elevation) * cameraOrbit.distance,
		cameraTarget.z + Math.cos(cameraOrbit.azimuth) * horizontalDistance,
	);
	camera.lookAt(cameraTarget);
	camera.updateMatrixWorld();
}

function setCameraZoom(zoom) {
	cameraOrbit.zoom = THREE.MathUtils.clamp(zoom, 0.7, 1.6);
	const bounds = canvas.getBoundingClientRect();
	const aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
	cameraOrbit.distance = fitDistance(aspect);
	updateCameraOrbit();
}

function setBusy(busy) {
	const balance = currentAccount ? currentAccount.coins : guestCoins;
	dropButton.disabled = busy || !clawControl || politicsEntryPending || toys.length === 0 || !authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden || balance < playCost;
}

async function beginDrop() {
	if (playRequestPending || politicsEntryPending || !authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden) return;
	const balance = currentAccount ? currentAccount.coins : guestCoins;
	if (balance < playCost) {
		showCoinShortage();
		return;
	}
	if (!clawControl) {
		status.textContent = "물리 엔진을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.";
		return;
	}
	if (clawControl.state.mode !== "ready" || toys.length === 0) return;
	if (currentAccount && supabaseClient) {
		playRequestPending = true;
		setBusy(true);
		try {
			const { data, error } = await supabaseClient.rpc("spend_play_coin");
			if (error) throw error;
			currentAccount.coins = data.coins;
			coinsLabel.textContent = String(data.coins);
			if (!data.ok) {
				showCoinShortage();
				return;
			}
		} catch {
			status.textContent = "코인 차감에 실패했어요. 최신 Supabase schema.sql을 실행했는지 확인해 주세요.";
			return;
		} finally {
			playRequestPending = false;
		}
	} else if (currentAccount) {
		currentAccount.coins -= playCost;
		saveCurrentAccount();
		coinsLabel.textContent = String(currentAccount.coins);
	} else {
		guestCoins -= playCost;
		saveGuestCoins();
		guestCoinsLabel.textContent = String(guestCoins);
	}
	roundExplained = false;
	clawControl.state.difficulty = clawDifficulty;
	clawControl.begin();
	setBusy(true);
	status.textContent = "집게가 내려가요. 앞뒤 위치도 잘 맞춰 보세요.";
}

function finishRound(delivered) {
	if (!delivered && !roundExplained) status.textContent = "아깝다! 인형 위에 집게를 맞춰 다시 해봐요.";
	setBusy(false);
}

function collectToy(toy, lucky) {
	scene.remove(toy.group);
	removeToyPhysics(toy);
	const caughtIndex = toys.indexOf(toy);
	if (caughtIndex >= 0) toys.splice(caughtIndex, 1);
	startRespawnCooldown(toy.index);
	if (currentAccount) {
		currentAccount.bag.push({ id: crypto.randomUUID(), kind: toy.kind, color: toy.color, collectedAt: Date.now() });
		saveCurrentAccount();
		renderBag();
		status.textContent = lucky
			? "행운! 떨어진 인형이 출구로 쏙 들어갔어요."
			: toys.length ? "성공! 새 친구가 가방에 담겼어요." : "대성공! 모든 친구를 가방에 담았어요!";
	} else {
		status.textContent = "로그인하지 않으면 인형이 가방에 모이지 않아요.";
	}
	roundExplained = true;
	score += 1;
	scoreLabel.textContent = `${score} 마리`;
	showPrize(toy);
}

const dropMessages = {
	lift: "집게 힘이 약해 인형이 빠져나갔어요!",
	top: "꼭대기에서 덜컹! 충격에 인형이 떨어졌어요.",
	deliver: "흔들리는 사이 인형이 미끄러졌어요!",
	deposit: "흔들리는 사이 인형이 미끄러졌어요!",
};

// The controller only reports what the simulation did; these turn it into game results and status messages.
function handleClawEvent(event) {
	const toy = event.id === undefined ? null : toyByPhysicsId.get(event.id);
	switch (event.type) {
		case "landed":
			status.textContent = event.touching.length ? "인형에 닿았어요. 집게를 벌려 감쌉니다." : "집게가 바닥에 닿았어요. 위치를 다시 맞춰 보세요.";
			break;
		case "lift": {
			const held = event.grabbed.map((id) => toyByPhysicsId.get(id)).filter(Boolean);
			if (held.length === 0) status.textContent = "인형에 닿지 않았어요. 방향을 조금 조정해 보세요.";
			else status.textContent = held.some((item) => item.weight > 0.82) ? "무거운 인형이에요! 집게가 버텨야 해요." : "집었어요! 집게가 천천히 들어 올립니다.";
			break;
		}
		case "noLift":
			roundExplained = true;
			status.textContent = event.grabbed.some((id) => toyByPhysicsId.get(id)?.weight > 0.82)
				? "무거운 인형을 들어 올리지 못했어요. 가벼운 인형부터 도전해 보세요."
				: "집게가 인형을 제대로 감싸지 못했어요.";
			break;
		case "dropped":
			roundExplained = true;
			status.textContent = event.phase === "lift" && event.risen < 0.8
				? "인형이 무게를 못 이기고 집게에서 빠졌어요!"
				: dropMessages[event.phase] ?? dropMessages.deliver;
			break;
		case "missed":
			roundExplained = true;
			status.textContent = event.rim
				? "아쉬워요! 인형이 출구 테두리에 부딪혀 튕겨 나갔어요."
				: "인형이 출구 안으로 들어가지 못했어요. 다시 도전해 보세요!";
			break;
		case "collected":
			if (toy) {
				toy.physics = null;
				toyByPhysicsId.delete(event.id);
				collectToy(toy, event.lucky);
			}
			break;
		case "lost":
			// A plush that tunnelled out of the pit is put back where it was stocked.
			if (toy?.physics) {
				const [x, z] = initialToyData[toy.index];
				toy.physics.body.setTranslation({ x, y: FLOOR_Y + 1.2, z }, true);
				toy.physics.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
				toy.physics.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
			}
			break;
		case "end":
			finishRound(event.delivered);
			break;
		default:
			break;
	}
}

function clawInput() {
	if (!authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden) return { x: 0, z: 0 };
	return {
		x: THREE.MathUtils.clamp((keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0) + joystickVector.x, -1, 1),
		z: THREE.MathUtils.clamp((keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0) + joystickVector.z, -1, 1),
	};
}

// Chizzilla scampers away from the claw while it is being lined up, but cannot dodge once it is caught.
function updateChizzillaEscape() {
	const { mode, x: clawX, z: clawZ } = clawControl.state;
	if (mode !== "ready" && mode !== "drop") return;
	for (const toy of toys) {
		if (toy.kind !== "chizzilla" || !toy.physics || toy.physics.clawContact) continue;
		const body = toy.physics.body;
		const center = body.worldCom();
		if (center.y > FLOOR_Y + 0.9) continue;
		const awayX = center.x - clawX;
		const awayZ = center.z - clawZ;
		const distance = Math.hypot(awayX, awayZ);
		if (distance > 1.6) continue;
		let directionX = distance > 0.001 ? awayX / distance : 1;
		let directionZ = distance > 0.001 ? awayZ / distance : 0;
		if (center.x < BOUNDS.minX + 0.8) directionX += 0.8;
		if (center.x > BOUNDS.maxX - 0.8) directionX -= 0.8;
		if (center.z < BOUNDS.minZ + 0.35) directionZ += 0.8;
		if (center.z > BOUNDS.maxZ - 0.35) directionZ -= 0.8;
		// Steer around the prize chute instead of running into it.
		if (overlapsChute(center.x + directionX * 0.3, center.z + directionZ * 0.3, 0.4)) {
			directionX += Math.sign(center.x - CHUTE.x) * 1.2;
			directionZ += Math.sign(center.z - CHUTE.z) * 1.2;
		}
		const length = Math.hypot(directionX, directionZ) || 1;
		const speed = 2.2 * Math.min(1, (1.6 - distance) / 0.3);
		const velocity = body.linvel();
		body.setLinvel({ x: directionX / length * speed, y: velocity.y, z: directionZ / length * speed }, true);
	}
}

const cableDirection = new THREE.Vector3();
const cableDown = new THREE.Vector3(0, -1, 0);
function syncPhysicsScene() {
	for (const toy of toys) {
		const body = toy.physics?.body;
		if (!body || (body.isSleeping() && toy.synced)) continue;
		const position = body.translation();
		const rotation = body.rotation();
		const center = body.worldCom();
		toy.group.position.set(position.x, position.y, position.z);
		toy.group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
		toy.x = center.x;
		toy.z = center.z;
		toy.synced = true;
	}
	const state = clawControl.state;
	carriage.position.set(state.x, CARRIAGE_Y, state.z);
	bridge.position.x = state.x;
	const head = clawSim.head.translation();
	const tilt = clawSim.head.rotation();
	claw.position.set(head.x, head.y, head.z);
	claw.quaternion.set(tilt.x, tilt.y, tilt.z, tilt.w);
	clawSim.fingerAngles().forEach((angle, index) => { fingers[index].rotation.x = angle; });
	const pivot = clawSim.pivotPoint();
	const tie = clawSim.anchorPoint();
	cableDirection.set(tie.x - pivot.x, tie.y - pivot.y, tie.z - pivot.z);
	const length = cableDirection.length();
	cableRig.position.set(pivot.x, pivot.y, pivot.z);
	if (length > 0.0001) cableRig.quaternion.setFromUnitVectors(cableDown, cableDirection.divideScalar(length));
	cable.position.y = -length / 2;
	cable.scale.y = Math.max(0.01, length);
	updateCoilCord(length);
	if (panelStick) {
		const stickTilt = 0.32 / CLAW_TUNING.travel.maxSpeed;
		panelStick.rotation.set(THREE.MathUtils.clamp(state.vz * stickTilt, -0.32, 0.32), 0, THREE.MathUtils.clamp(-state.vx * stickTilt, -0.32, 0.32));
	}
}

function stepPhysics(delta) {
	if (!clawControl) return;
	// Fixed substeps keep the contacts stable; a slow frame slows the game down instead of exploding the simulation.
	physicsLag = Math.min(physicsLag + delta, MAX_STEP * 6);
	const input = clawInput();
	while (physicsLag >= MAX_STEP) {
		physicsLag -= MAX_STEP;
		updateChizzillaEscape();
		for (const event of clawControl.update(MAX_STEP, input)) handleClawEvent(event);
	}
	syncPhysicsScene();
}

function animate() {
	const delta = Math.min(clock.getDelta(), 0.05);
	updateRespawns();
	stepPhysics(delta);
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}

function updateJoystick(event) {
	const bounds = joystick.getBoundingClientRect();
	const radius = Math.max(1, (Math.min(bounds.width, bounds.height) - joystickKnob.offsetWidth) / 2 - 7);
	const deltaX = event.clientX - (bounds.left + bounds.width / 2);
	const deltaY = event.clientY - (bounds.top + bounds.height / 2);
	const distance = Math.hypot(deltaX, deltaY);
	const scale = distance > radius ? radius / distance : 1;
	const offsetX = deltaX * scale;
	const offsetY = deltaY * scale;
	joystickVector.x = offsetX / radius;
	joystickVector.z = offsetY / radius;
	joystickKnob.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
}

function resetJoystick() {
	joystickPointerId = null;
	joystickVector.x = 0;
	joystickVector.z = 0;
	joystickKnob.style.transform = "translate(0, 0)";
	joystick.classList.remove("active");
}

joystick.addEventListener("pointerdown", (event) => {
	event.preventDefault();
	joystickPointerId = event.pointerId;
	joystick.setPointerCapture(event.pointerId);
	joystick.classList.add("active");
	updateJoystick(event);
});
joystick.addEventListener("pointermove", (event) => {
	if (event.pointerId === joystickPointerId) updateJoystick(event);
});
joystick.addEventListener("pointerup", (event) => {
	if (event.pointerId === joystickPointerId) resetJoystick();
});
joystick.addEventListener("pointercancel", (event) => {
	if (event.pointerId === joystickPointerId) resetJoystick();
});
joystick.addEventListener("lostpointercapture", resetJoystick);

document.querySelector("#loginTab").addEventListener("click", () => setAuthMode("login"));
document.querySelector("#signupTab").addEventListener("click", () => setAuthMode("signup"));
document.querySelector("#openAuth").addEventListener("click", () => {
	setAuthMode("login");
	authGate.hidden = false;
	document.querySelector("#username").focus();
});
document.querySelector("#continueGuest").addEventListener("click", () => {
	authGate.hidden = true;
	status.textContent = "게스트로 플레이할 수 있어요. 로그인하지 않으면 인형이 가방에 모이지 않아요.";
});
authForm.addEventListener("submit", async (event) => {
	event.preventDefault();
	if (authPending) return;
	authPending = true;
	authError.textContent = supabaseClient && authMode === "signup" ? "회원가입 요청 중이에요. 잠시만 기다려 주세요." : "로그인 중이에요.";
	const submitButton = document.querySelector("#authSubmit");
	submitButton.disabled = true;
	submitButton.textContent = "처리 중...";
	const username = document.querySelector("#username").value.trim();
	const usernameKey = username.toLocaleLowerCase("ko-KR");
	const password = document.querySelector("#password").value;
	const email = document.querySelector("#email").value.trim();
	try {
		if (supabaseClient) {
			if (authMode === "signup") {
				if (!/^[\p{L}\p{N}_-]{2,16}$/u.test(username)) {
					authError.textContent = "아이디는 한글·영문·숫자·밑줄로 2~16자까지 입력해 주세요.";
					return;
				}
				if (password.length < 8) {
					authError.textContent = "비밀번호를 8자 이상 입력해 주세요.";
					return;
				}
				if (password !== document.querySelector("#confirmPassword").value) {
					authError.textContent = "비밀번호 확인이 일치하지 않아요.";
					return;
				}
				const { data, error } = await supabaseClient.auth.signUp({
					email,
					password,
					options: { data: { username }, emailRedirectTo: SUPABASE_AUTH_REDIRECT_URL },
				});
				if (error) {
					if (isEmailRateLimitError(error)) {
						pendingConfirmationEmail = email;
						resendConfirmationButton.hidden = false;
						authError.textContent = "Supabase 인증 메일 발송 한도에 도달했어요. 잠시 후 재전송하거나 Supabase SMTP를 설정해 주세요.";
					} else {
						authError.textContent = error.message;
					}
					return;
				}
				if (!data.session) {
					if (data.user?.identities?.length === 0) {
						authError.textContent = "이미 가입된 이메일일 수 있어요. 로그인하거나 비밀번호 재설정을 이용해 주세요.";
						return;
					}
					pendingConfirmationEmail = email;
					resendConfirmationButton.hidden = false;
					authError.textContent = "가입 요청은 접수됐지만 이메일 인증 전이에요. 받은 편지함과 스팸함을 확인해 주세요.";
					return;
				}
				enterAccount(await loadSupabaseProfile(data.user));
				status.textContent = "회원가입이 완료되어 로그인했어요.";
				return;
			}
			const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
			if (error) {
				authError.textContent = "이메일 또는 비밀번호를 확인해 주세요.";
				return;
			}
			enterAccount(await loadSupabaseProfile(data.user));
			return;
		}
		if (!/^[\p{L}\p{N}_-]{2,16}$/u.test(username)) {
			authError.textContent = "아이디는 한글·영문·숫자·밑줄로 2~16자까지 입력해 주세요.";
			return;
		}
		const existingAccount = accounts.find((item) => item.usernameKey === usernameKey);
		if (authMode === "signup") {
			if (existingAccount) {
				authError.textContent = "이미 사용 중인 아이디예요.";
				return;
			}
			if (password.length < 8) {
				authError.textContent = "비밀번호를 8자 이상 입력해 주세요.";
				return;
			}
			if (password !== document.querySelector("#confirmPassword").value) {
				authError.textContent = "비밀번호 확인이 일치하지 않아요.";
				return;
			}
			const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
			const newAccount = { username, usernameKey, salt, passwordHash: await hashPassword(password, salt), coins: 0, bag: [] };
			accounts.push(newAccount);
			if (!persistAccounts()) {
				accounts = accounts.filter((item) => item !== newAccount);
				return;
			}
			enterAccount(newAccount);
			return;
		}
		if (!existingAccount || await hashPassword(password, existingAccount.salt) !== existingAccount.passwordHash) {
			authError.textContent = "아이디 또는 비밀번호를 확인해 주세요.";
			return;
		}
		enterAccount(existingAccount);
	} catch {
		authError.textContent = "인증 요청을 완료하지 못했어요. 네트워크와 Supabase 설정을 확인한 뒤 다시 시도해 주세요.";
	} finally {
		authPending = false;
		submitButton.disabled = false;
		submitButton.textContent = authMode === "signup" ? "회원가입" : "로그인";
	}
});

resendConfirmationButton.addEventListener("click", async () => {
	if (!supabaseClient || !pendingConfirmationEmail || authPending) return;
	authPending = true;
	resendConfirmationButton.disabled = true;
	try {
		const { error } = await supabaseClient.auth.resend({ type: "signup", email: pendingConfirmationEmail });
		authError.textContent = error
			? isEmailRateLimitError(error)
				? "인증 메일 발송 한도에 도달했어요. 잠시 기다리거나 Supabase SMTP를 설정해 주세요."
				: "인증 메일을 다시 보내지 못했어요. Supabase SMTP 설정과 이메일 주소를 확인해 주세요."
			: "재전송 요청을 완료했어요. 받은 편지함과 스팸함을 확인해 주세요.";
	} catch {
		authError.textContent = "인증 메일 재전송에 실패했어요. 잠시 후 다시 시도해 주세요.";
	} finally {
		authPending = false;
		resendConfirmationButton.disabled = false;
	}
});

async function claimCoins() {
	if (!authGate.hidden || coinClaimPending) return;
	const nextClaimAt = currentAccount ? currentAccount.nextCoinClaimAt || 0 : guestNextCoinClaimAt;
	if (nextClaimAt > Date.now()) {
		updateCoinClaimButtons();
		return;
	}
	coinClaimPending = true;
	accountClaimButton.disabled = true;
	guestClaimButton.disabled = true;
	try {
		if (currentAccount && supabaseClient) {
			const { data, error } = await supabaseClient.rpc("claim_coins");
			if (error) throw error;
			currentAccount.coins = data.coins;
			currentAccount.nextCoinClaimAt = data.next_coin_claim_at ? new Date(data.next_coin_claim_at).getTime() : 0;
			coinsLabel.textContent = String(currentAccount.coins);
			status.textContent = data.ok
				? `${coinPack}코인을 받았어요. 다음 코인은 5분 후에 받을 수 있어요.`
				: "아직 코인을 받을 수 없어요. 남은 시간을 확인해 주세요.";
		} else if (currentAccount) {
			currentAccount.coins += coinPack;
			currentAccount.nextCoinClaimAt = Date.now() + coinClaimCooldown;
			saveCurrentAccount();
			coinsLabel.textContent = String(currentAccount.coins);
			status.textContent = `${coinPack}코인을 받았어요. 다음 코인은 5분 후에 받을 수 있어요.`;
		} else {
			guestCoins += coinPack;
			guestNextCoinClaimAt = Date.now() + coinClaimCooldown;
			saveGuestCoins();
			saveGuestCoinClaimTime();
			guestCoinsLabel.textContent = String(guestCoins);
			status.textContent = `${coinPack}코인을 받았어요. 다음 코인은 5분 후에 받을 수 있어요.`;
		}
		setBusy(false);
	} catch {
		status.textContent = "코인 쿨타임을 저장하지 못했어요. 최신 Supabase schema.sql을 실행했는지 확인해 주세요.";
	} finally {
		coinClaimPending = false;
		updateCoinClaimButtons();
	}
}

async function claimDailyBonus() {
	if (!authGate.hidden || dailyBonusClaimPending) return;
	
	if (!currentAccount) {
		status.textContent = "일일 보너스를 받기 위해선 로그인을 하셔야 합니다.";
		status.style.fontSize = "18px";
		status.style.fontWeight = "600";
		status.style.color = "#ed7863";
		status.style.animation = "pulse 0.6s ease-in-out";
		setBusy(false);
		return;
	}
	
	const nextClaimAt = currentAccount.nextDailyBonusAt || 0;
	if (nextClaimAt > Date.now()) {
		updateDailyBonusButton();
		return;
	}
	dailyBonusClaimPending = true;
	dailyBonusButton.disabled = true;
	try {
		if (supabaseClient) {
			const { data, error } = await supabaseClient.rpc("claim_daily_bonus");
			if (error) throw error;
			currentAccount.coins = data.coins;
			currentAccount.nextDailyBonusAt = data.next_daily_bonus_at ? new Date(data.next_daily_bonus_at).getTime() : 0;
			coinsLabel.textContent = String(currentAccount.coins);
			status.textContent = data.ok
				? `${dailyBonusAmount}코인 일일 보너스를 받았어요! 내일 다시 받을 수 있어요.`
				: "아직 일일 보너스를 받을 수 없어요. 남은 시간을 확인해 주세요.";
		} else {
			currentAccount.coins += dailyBonusAmount;
			currentAccount.nextDailyBonusAt = Date.now() + dailyBonusCooldown;
			saveCurrentAccount();
			coinsLabel.textContent = String(currentAccount.coins);
			status.textContent = `${dailyBonusAmount}코인 일일 보너스를 받았어요! 내일 다시 받을 수 있어요.`;
		}
		setBusy(false);
	} catch {
		status.textContent = "일일 보너스를 받지 못했어요. 최신 Supabase schema.sql을 실행했는지 확인해 주세요.";
	} finally {
		dailyBonusClaimPending = false;
		updateDailyBonusButton();
	}
}

accountClaimButton.addEventListener("click", claimCoins);
guestClaimButton.addEventListener("click", claimCoins);
dailyBonusButton.addEventListener("click", claimDailyBonus);

document.querySelector("#openBag").addEventListener("click", () => {
	renderBag();
	bagGate.hidden = false;
	setBusy(true);
	document.querySelector("#closeBag").focus();
});
bagItems.addEventListener("click", (event) => {
	const button = event.target.closest("[data-bag-index]");
	if (!button || !currentAccount) return;
	const item = currentAccount.bag[Number(button.dataset.bagIndex)];
	if (!item) return;
	showPrize(makeBagPreview(item), "bag");
});
function closeBag() {
	bagGate.hidden = true;
	setBusy(!clawIsIdle());
	document.querySelector("#openBag").focus();
}
document.querySelector("#closeBag").addEventListener("click", closeBag);
document.querySelector("#closeBagBackdrop").addEventListener("click", closeBag);
shopButton.addEventListener("click", async () => {
	if (!currentAccount || !supabaseClient) return;
	shopGate.hidden = false;
	setBusy(true);
	closeShopButton.focus();
	await refreshShop();
});
function closeShop() {
	shopGate.hidden = true;
	setBusy(!clawIsIdle());
	shopButton.focus();
}
closeShopButton.addEventListener("click", closeShop);
document.querySelector("#closeShopBackdrop").addEventListener("click", closeShop);
document.querySelector("#refreshShop").addEventListener("click", refreshShop);
document.querySelector("#closePrize").addEventListener("click", closePrize);
sharePrizeButton.addEventListener("click", sharePrize);
mapAnimalsButton.addEventListener("click", () => switchMap("animals"));
mapPoliticsButton.addEventListener("click", enterPoliticsRoom);
const modeFunButton = document.querySelector("#modeFun");
const modeRealisticButton = document.querySelector("#modeRealistic");
function updateModeButtons() {
	modeFunButton.setAttribute("aria-pressed", String(clawDifficulty === "fun"));
	modeRealisticButton.setAttribute("aria-pressed", String(clawDifficulty === "realistic"));
}
// The claw's power profile is fixed for a play, so a new mode applies from the next drop.
function setClawDifficulty(mode) {
	if (mode === clawDifficulty) return;
	clawDifficulty = mode;
	try { localStorage.setItem(clawModeStorageKey, mode); } catch { /* The mode stays selected for this page. */ }
	updateModeButtons();
	status.textContent = mode === "realistic"
		? "현실 모드: 실제 기계처럼 들어 올린 뒤 집게 힘이 약해져요."
		: "재미 모드: 집게가 끝까지 꽉 잡아요.";
}
modeFunButton.addEventListener("click", () => setClawDifficulty("fun"));
modeRealisticButton.addEventListener("click", () => setClawDifficulty("realistic"));
updateModeButtons();
document.querySelector("#logout").addEventListener("click", () => {
	if (!clawIsIdle()) {
		status.textContent = "플레이가 끝난 뒤 로그아웃할 수 있어요.";
		return;
	}
	if (supabaseClient) {
		void supabaseClient.auth.signOut().then(({ error }) => {
			if (error) status.textContent = "로그아웃을 완료하지 못했어요. 다시 시도해 주세요.";
		});
	} else {
		try { localStorage.removeItem(sessionStorageKey); } catch { /* The login gate still protects this page. */ }
	}
	currentAccount = null;
	score = 0;
	scoreLabel.textContent = "0 마리";
	accountTools.hidden = true;
	shopGate.hidden = true;
	guestTools.hidden = false;
	bagGate.hidden = true;
	authGate.hidden = true;
	keys.clear();
	setBusy(false);
	status.textContent = "로그아웃했어요. 게스트로 계속 플레이할 수 있어요.";
});

window.addEventListener("keydown", (event) => {
	const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
	keys.add(key);
	if (event.code === "Space" && !event.repeat) beginDrop();
	if (event.key === "Escape" && !bagGate.hidden) closeBag();
	if (event.key === "Escape" && !shopGate.hidden) closeShop();
	if (event.key === "Escape" && !prizeGate.hidden) closePrize();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
window.addEventListener("blur", () => { keys.clear(); resetJoystick(); });
canvas.addEventListener("pointermove", (event) => {
	if (event.pointerId !== cameraDrag.pointerId) return;
	const deltaX = event.clientX - cameraDrag.x;
	const deltaY = event.clientY - cameraDrag.y;
	cameraDrag.x = event.clientX;
	cameraDrag.y = event.clientY;
	cameraOrbit.azimuth -= deltaX * 0.008;
	cameraOrbit.elevation = THREE.MathUtils.clamp(cameraOrbit.elevation + deltaY * 0.006, 0.08, 0.78);
	updateCameraOrbit();
});
canvas.addEventListener("pointerdown", (event) => {
	event.preventDefault();
	cameraDrag.pointerId = event.pointerId;
	cameraDrag.x = event.clientX;
	cameraDrag.y = event.clientY;
	canvas.setPointerCapture(event.pointerId);
	canvas.classList.add("dragging-view");
});
function endCameraDrag(event) {
	if (event.pointerId !== cameraDrag.pointerId) return;
	if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
	cameraDrag.pointerId = null;
	canvas.classList.remove("dragging-view");
}
canvas.addEventListener("pointerup", endCameraDrag);
canvas.addEventListener("pointercancel", endCameraDrag);
canvas.addEventListener("wheel", (event) => {
	event.preventDefault();
	setCameraZoom(cameraOrbit.zoom + (event.deltaY < 0 ? 0.1 : -0.1));
}, { passive: false });
zoomInButton.addEventListener("click", () => setCameraZoom(cameraOrbit.zoom + 0.1));
zoomOutButton.addEventListener("click", () => setCameraZoom(cameraOrbit.zoom - 0.1));
prizeCanvas.addEventListener("pointerdown", (event) => {
	if (prizeGate.hidden || !prizeModel) return;
	event.preventDefault();
	prizeDrag.pointerId = event.pointerId;
	prizeDrag.x = event.clientX;
	prizeDrag.y = event.clientY;
	prizeCanvas.setPointerCapture(event.pointerId);
	prizeCanvas.classList.add("dragging");
});
prizeCanvas.addEventListener("pointermove", (event) => {
	if (event.pointerId !== prizeDrag.pointerId || !prizeModel) return;
	const deltaX = event.clientX - prizeDrag.x;
	const deltaY = event.clientY - prizeDrag.y;
	prizeDrag.x = event.clientX;
	prizeDrag.y = event.clientY;
	prizeModel.rotation.y = THREE.MathUtils.euclideanModulo(prizeModel.rotation.y + deltaX * 0.012, Math.PI * 2);
	prizeModel.rotation.x = THREE.MathUtils.clamp(prizeModel.rotation.x + deltaY * 0.008, -0.72, 0.72);
	renderPrizePreview();
});
function endPrizeDrag(event) {
	if (event.pointerId !== prizeDrag.pointerId) return;
	if (prizeCanvas.hasPointerCapture(event.pointerId)) prizeCanvas.releasePointerCapture(event.pointerId);
	prizeDrag.pointerId = null;
	prizeCanvas.classList.remove("dragging");
}
prizeCanvas.addEventListener("pointerup", endPrizeDrag);
prizeCanvas.addEventListener("pointercancel", endPrizeDrag);
dropButton.addEventListener("click", beginDrop);
resetButton?.addEventListener("click", () => {
	resetToys();
	score = currentAccount ? currentAccount.bag.length : 0;
	scoreLabel.textContent = `${score} 마리`;
	clawControl?.reset();
		status.innerHTML = "<strong>← → ↑ ↓</strong> 앞뒤까지 맞추고<br><strong>스페이스</strong>로 인형을 뽑으세요";
		updateRestockStatus();
	setBusy(false);
});

async function restoreSession() {
	if (supabaseClient) {
		authGate.hidden = false;
		try {
			const { data, error } = await supabaseClient.auth.getSession();
			if (error) throw error;
			if (data.session?.user) enterAccount(await loadSupabaseProfile(data.session.user));
			else refreshAccountDisplay();
		} catch {
			status.textContent = "Supabase 계정을 불러오지 못했어요. 연결 설정과 profiles 테이블을 확인해 주세요.";
			refreshAccountDisplay();
		}
		return;
	}
	authGate.hidden = true;
	try {
		const sessionKey = localStorage.getItem(sessionStorageKey);
		const savedAccount = accounts.find((item) => item.usernameKey === sessionKey);
		if (savedAccount) enterAccount(savedAccount);
		else refreshAccountDisplay();
	} catch {
		refreshAccountDisplay();
	}
}

document.querySelector(".auth-note").textContent = supabaseConfigured
	? "계정·코인·가방은 Supabase에 저장됩니다."
	: "Supabase URL과 공개 키를 설정하면 계정이 서버에 저장됩니다.";
setAuthMode("login");
void restoreSession();

buildMachine();
resetToys();
mapAnimalsButton.setAttribute("aria-pressed", String(activeMapId === "animals"));
mapPoliticsButton.setAttribute("aria-pressed", String(activeMapId === "politics"));
document.querySelector(".stage-label").textContent = mapDefinitions[activeMapId].label.toUpperCase();
updateRestockStatus();
setBusy(false);
window.addEventListener("resize", resize);
resize();
updateCoinClaimButtons();
updateDailyBonusButton();
window.setInterval(() => {
	updateCoinClaimButtons();
	updateDailyBonusButton();
}, 1000);
requestAnimationFrame(animate);

