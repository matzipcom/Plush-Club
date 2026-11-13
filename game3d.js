import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_AUTH_REDIRECT_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase-config.js";
import { setupLanguageSelector, translate } from "./i18n.js";

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
const scene = new THREE.Scene();
scene.background = new THREE.Color("#dcebe0");
scene.fog = new THREE.Fog("#dcebe0", 19, 38);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const prizeScene = new THREE.Scene();
prizeScene.background = new THREE.Color("#e8f1df");
prizeScene.add(new THREE.HemisphereLight(0xfffdf0, 0x829586, 2.4));
const prizeLight = new THREE.DirectionalLight(0xfff0d7, 3.2);
prizeLight.position.set(-3, 5, 6);
prizeScene.add(prizeLight);
const prizeCamera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.1, 15);
prizeCamera.position.set(0, 0.82, 5);
prizeCamera.lookAt(0, 0.82, 0);
const prizeRenderer = new THREE.WebGLRenderer({ canvas: prizeCanvas, antialias: true, alpha: false });
prizeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
prizeRenderer.outputColorSpace = THREE.SRGBColorSpace;
prizeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
prizeRenderer.toneMappingExposure = 1.15;
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
	for (const toy of toys) if (toy.kind === "chizzilla") replaceChizzillaWithPbr(toy.group);
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
	for (const toy of toys) if (toy.kind === "mulcorita") replaceMulcoritaModel(toy.group);
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
		for (const toy of toys) if (toy.kind === "moonkorita") replaceMoonkoritaModel(toy.group);
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

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
const cameraTarget = new THREE.Vector3(0, 2.7, 0);
const cameraOrbit = { azimuth: 0, elevation: Math.atan(0.23), distance: 18, zoom: 1 };
const cameraDrag = { pointerId: null, x: 0, y: 0, startX: 0, startY: 0 };
const pointerNdc = new THREE.Vector2();
const interactionRaycaster = new THREE.Raycaster();
const adInquiryUrl = "https://www.instagram.com/9sept10th/";
scene.add(new THREE.HemisphereLight(0xf7fff4, 0x829586, 2.1));

const keyLight = new THREE.DirectionalLight(0xfff0d7, 3.2);
keyLight.position.set(-5, 10, 7);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -5;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const fillLight = new THREE.PointLight(0xe8a68d, 82, 16, 2);
fillLight.position.set(4, 4.5, 5);
scene.add(fillLight);
const interiorLight = new THREE.PointLight(0xffdf9c, 62, 12, 2);
interiorLight.position.set(-2.2, 5.2, -0.5);
scene.add(interiorLight);

const material = (color, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const mats = {
	ink: material("#193c37", 0.38),
	frame: material("#477c69", 0.32, 0.22),
	mint: material("#a8d7bb", 0.32),
	cream: material("#fff5dc", 0.4),
	coral: material("#e87963", 0.32),
	gold: material("#e9bd64", 0.26, 0.5),
	metal: material("#a8bbb0", 0.24, 0.72),
	black: material("#253a34", 0.23),
};
const glass = new THREE.MeshPhysicalMaterial({
	color: "#d2eee2", roughness: 0.12, metalness: 0.05,
	transparent: true, opacity: 0.14, depthWrite: false,
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
const rainbowPlush = new THREE.MeshStandardMaterial({ map: rainbowTexture, roughness: 0.94 });
const plush = (color) => color === "rainbow" ? rainbowPlush : material(color, 0.94);
const chizzillaImageTexture = new THREE.TextureLoader().load(
	"./assets/chizzilla.jpg",
	(texture) => { texture.colorSpace = THREE.SRGBColorSpace; },
	undefined,
	() => { status.textContent = "찢칠라 이미지를 불러오지 못했어요. 페이지를 새로고침해 주세요."; },
);
chizzillaImageTexture.colorSpace = THREE.SRGBColorSpace;
const chizzillaImageMaterial = new THREE.MeshBasicMaterial({ map: chizzillaImageTexture, side: THREE.DoubleSide });
const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: "#213a35", roughness: 0.18, clearcoat: 0.8 });
const bellyMaterial = material("#fff0d9", 0.92);
const blushMaterial = material("#e98983", 0.8);
const machine = new THREE.Group();
scene.add(machine);

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

function makeSignTexture() {
	const sign = document.createElement("canvas");
	sign.width = 1024;
	sign.height = 256;
	const ctx = sign.getContext("2d");
	ctx.fillStyle = "#193c37";
	ctx.fillRect(0, 0, sign.width, sign.height);
	ctx.fillStyle = "#e9bd64";
	for (const x of [44, 980]) {
		ctx.beginPath();
		ctx.arc(x, 128, 13, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.fillStyle = "#fff6dc";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "700 78px Georgia, serif";
	ctx.fillText("PLUSH PARADE", 512, 122);
	ctx.fillStyle = "#9bcdb0";
	ctx.font = "700 22px sans-serif";
	ctx.fillText("PICK A LITTLE JOY", 512, 207);
	const texture = new THREE.CanvasTexture(sign);
	texture.colorSpace = THREE.SRGBColorSpace;
	return texture;
}

let adInquiryTexture = null;
function renderAdInquiryTexture() {
	if (!adInquiryTexture) return;
	const sign = adInquiryTexture.image;
	const context = sign.getContext("2d");
	context.clearRect(0, 0, sign.width, sign.height);
	context.fillStyle = "#fffaf0";
	context.fillRect(0, 0, sign.width, sign.height);
	context.fillStyle = "#193c37";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = "700 92px 'Malgun Gothic', sans-serif";
	context.fillText(translate("광고 제휴 문의"), sign.width / 2, sign.height / 2);
	adInquiryTexture.needsUpdate = true;
}

document.addEventListener("plush-language-change", renderAdInquiryTexture);

function makeAdInquiryTexture() {
	const sign = document.createElement("canvas");
	sign.width = 1024;
	sign.height = 256;
	adInquiryTexture = new THREE.CanvasTexture(sign);
	adInquiryTexture.colorSpace = THREE.SRGBColorSpace;
	renderAdInquiryTexture();
	return adInquiryTexture;
}

function buildMachine() {
	const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material("#e7e8d9", 0.88));
	ground.rotation.x = -Math.PI / 2;
	ground.position.y = -0.12;
	ground.receiveShadow = true;
	scene.add(ground);

	box(machine, [9.4, 0.68, 3.7], [0, 0.2, 0], mats.ink);
	box(machine, [9.12, 0.48, 3.48], [0, 0.24, 0], mats.frame);
	box(machine, [8.78, 0.12, 3.2], [0, 0.58, 0], mats.gold);
	box(machine, [8.85, 0.08, 3.18], [0, 0.01, 0], mats.ink);

	box(machine, [0.27, 5.75, 0.28], [-4.18, 3.48, -0.02], mats.ink);
	box(machine, [0.27, 5.75, 0.28], [4.18, 3.48, -0.02], mats.ink);
	box(machine, [0.13, 5.45, 0.15], [-3.98, 3.52, 0.08], mats.gold);
	box(machine, [0.13, 5.45, 0.15], [3.98, 3.52, 0.08], mats.gold);
	box(machine, [8.62, 0.25, 3.45], [0, 6.28, 0], mats.ink);
	box(machine, [8.32, 0.12, 3.22], [0, 6.12, 0], mats.gold);
	box(machine, [8.04, 0.1, 3.18], [0, 0.79, 0], mats.ink);
	box(machine, [7.82, 5.17, 0.12], [0, 3.48, -1.64], mats.mint);
	const adInquiryFrame = box(machine, [3.3, 0.9, 0.08], [0, 3.35, -1.55], mats.gold, false);
	const adInquiryPlate = box(machine, [3.18, 0.78, 0.035], [0, 3.35, -1.505], material("#fffaf0", 0.48), false);
	adInquiryFrame.userData.adInquiryTarget = true;
	adInquiryPlate.userData.adInquiryTarget = true;
	const adInquiryText = new THREE.Mesh(
		new THREE.PlaneGeometry(3.1, 0.68),
		new THREE.MeshBasicMaterial({ map: makeAdInquiryTexture() }),
	);
	adInquiryText.position.set(0, 3.35, -1.485);
	adInquiryText.userData.adInquiryTarget = true;
	machine.add(adInquiryText);
	box(machine, [7.78, 5.15, 0.08], [0, 3.48, 1.7], glass, false);
	box(machine, [0.08, 5.05, 3.2], [-4.03, 3.48, 0], glass, false);
	box(machine, [0.08, 5.05, 3.2], [4.03, 3.48, 0], glass, false);

	const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.95), new THREE.MeshBasicMaterial({ map: makeSignTexture() }));
	sign.position.set(0, 6.29, 1.79);
	machine.add(sign);
	for (let index = 0; index < 11; index += 1) {
		const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), new THREE.MeshBasicMaterial({ color: index % 2 ? "#e9bd64" : "#f5e7bb" }));
		bulb.position.set(-3.1 + index * 0.62, 5.99, 1.78);
		machine.add(bulb);
	}

	box(machine, [7.55, 0.13, 0.13], [0, 5.73, -0.72], mats.metal);
	box(machine, [0.13, 0.1, 2.35], [0, 5.7, 0.02], mats.metal);
	box(machine, [1.3, 0.25, 0.82], [0, 5.54, 0.02], mats.frame);

	const panel = new THREE.Group();
	panel.position.set(0, 0.71, 1.53);
	panel.rotation.x = -0.16;
	machine.add(panel);
	box(panel, [8.5, 0.16, 0.86], [0, 0, 0], mats.ink);
	box(panel, [8.28, 0.05, 0.68], [0, 0.1, -0.02], mats.frame);
	for (const x of [-1.4, 0, 1.4]) {
		const button = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.11, 24), x === 0 ? mats.coral : mats.gold);
		button.position.set(x, 0.19, 0.02);
		button.castShadow = true;
		panel.add(button);
	}
	const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.32, 12), mats.metal);
	stick.position.set(2.35, 0.27, 0.02);
	stick.rotation.z = -0.18;
	panel.add(stick);
	sphere(panel, [2.41, 0.44, 0.02], [0.12, 0.12, 0.12], mats.coral, 16);

	box(machine, [0.52, 0.64, 0.68], [3.45, 0.94, 1.02], mats.gold);
	box(machine, [0.34, 0.16, 0.72], [3.45, 1.31, 1.02], mats.ink);
	box(machine, [0.48, 0.12, 0.48], [3.45, 0.81, 1.02], mats.black);
	box(machine, [0.31, 0.08, 0.34], [3.45, 0.76, 1.02], mats.coral);
}

const mapDefinitions = {
	animals: {
		label: "동물 인형",
		toys: [
			[-3.35, -0.85, "bear", "#e8846d"], [-2.4, 0.62, "duck", "#edc862"], [-1.45, -0.8, "frog", "#89bf98"],
			[-0.48, 0.68, "bunny", "#c397c9"], [0.48, -0.84, "cat", "#ed9a76"], [1.42, 0.66, "bear", "#7fb4c4"],
			[2.36, -0.82, "bunny", "#e997a2"], [3.25, 0.61, "frog", "#a4a0d2"], [-2.88, -0.12, "cat", "#e6aa77"],
			[-0.02, -0.1, "chick", "#efcf79"], [2.82, -0.13, "bear", "#9bc4a7"],
		],
	},
	politics: {
		label: "찢토피아",
		toys: [
			[-3, -0.85, "chizzilla", "#aaa19a"], [-0.8, -0.55, "mulcorita", "#8fba9c"], [2.4, -0.95, "moonkorita", "#8fba9c"],
			[-2.2, 0.75, "chizzilla", "#aaa19a"], [0.65, 0.45, "mulcorita", "#8fba9c"], [3.1, 0.9, "moonkorita", "#8fba9c"],
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
	if (kind === "chizzilla") {
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.25, 1.16, -0.015], [0.145, 0.27, 0.11], plush(color), 20);
			sphere(group, [side * 0.25, 1.17, 0.078], [0.085, 0.19, 0.025], blushMaterial, 18);
		}
	} else if (kind === "bunny") {
		for (const side of [-1, 1]) {
			const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 4, 10), plush(color));
			ear.position.set(side * 0.16, 1.29, 0);
			ear.rotation.z = side * -0.1;
			ear.castShadow = true;
			group.add(ear);
			sphere(group, [side * 0.16, 1.3, 0.075], [0.04, 0.19, 0.025], blushMaterial, 14);
		}
	} else if (kind === "bear") {
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.23, 1.02, 0], [0.15, 0.16, 0.13], plush(color));
			sphere(group, [side * 0.23, 1.02, 0.105], [0.075, 0.08, 0.035], blushMaterial, 14);
		}
	} else if (kind === "cat") {
		for (const side of [-1, 1]) {
			const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.31, 5), plush(color));
			ear.position.set(side * 0.22, 1.12, 0);
			ear.rotation.z = side * -0.2;
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
	sphere(group, [0, 1.08, 0.015], [0.29, 0.12, 0.26], material("#413b36", 0.97), 18);
	box(group, [0.075, 0.24, 0.045], [0, 0.4, 0.307], material(politicalTieColors[kind], 0.8));
	sphere(group, [0, 0.55, 0.312], [0.065, 0.035, 0.025], bellyMaterial, 14);
	sphere(group, [0.2, 0.4, 0.292], [0.035, 0.035, 0.025], mats.gold, 14);
}

function addSignatureDetails(group, kind) {
	if (kind === "moonjaeger") {
		const scarf = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 4, 8), material("#a84f43", 0.9));
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
	group.rotation.y = (index % 3 - 1) * 0.12;
	const fur = plush(color);
	sphere(group, [0, 0.34, 0], [0.34, 0.39, 0.29], fur, 24);
	sphere(group, [0, 0.81, 0.015], [0.35, 0.34, 0.3], fur, 24);
	for (const side of [-1, 1]) {
		sphere(group, [side * 0.33, 0.39, 0.015], [0.14, 0.24, 0.15], fur, 18);
		sphere(group, [side * 0.2, 0.08, 0.08], [0.19, 0.12, 0.2], fur, 18);
	}
	addEars(group, kind, color);
	sphere(group, [0, 0.35, 0.264], [0.19, 0.18, 0.04], bellyMaterial, 18);
	if (politicalKinds.has(kind)) addPoliticalDetails(group, kind);
	if (kind === "chizzilla" || kind === "moonjaeger") addSignatureDetails(group, kind);
	if (kind === "frog") {
		for (const side of [-1, 1]) sphere(group, [side * 0.2, 1.08, 0.11], [0.14, 0.16, 0.13], fur, 18);
	}
	if (kind === "chick" || kind === "duck") {
		for (const side of [-1, 1]) sphere(group, [side * 0.32, 0.48, 0], [0.1, 0.18, 0.12], fur, 16);
		const beak = kind === "duck"
			? new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mats.coral)
			: new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.15, 3), mats.coral);
		beak.position.set(0, 0.78, 0.31);
		beak.scale.set(0.13, 0.07, 0.07);
		if (kind === "chick") beak.rotation.x = Math.PI / 2;
		group.add(beak);
	}
	if (kind !== "chizzilla") {
		for (const side of [-1, 1]) {
			sphere(group, [side * 0.13, 0.84, 0.277], [0.045, 0.06, 0.035], eyeMaterial, 16);
			sphere(group, [side * 0.22, 0.72, 0.265], [0.045, 0.025, 0.02], blushMaterial, 14);
		}
		sphere(group, [0, 0.75, 0.29], [0.055, 0.04, 0.035], mats.coral, 14);
		const smileCurve = new THREE.QuadraticBezierCurve3(
			new THREE.Vector3(-0.06, 0.68, 0.29), new THREE.Vector3(0, 0.63, 0.32), new THREE.Vector3(0.06, 0.68, 0.29),
		);
		group.add(new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 8, 0.012, 6, false), eyeMaterial));
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

function resetToys() {
	for (const toy of toys) scene.remove(toy.group);
	toys.length = 0;
	initialToyData.forEach((data, index) => {
		if (respawnAt[index] <= Date.now()) toys.push(makeToy(data, index));
	});
}

function switchMap(mapId) {
	if (mapId === activeMapId) return false;
	if (mapId === "politics" && !politicsPaymentAuthorized) return false;
	if (clawState.mode !== "ready") {
		status.textContent = "집게가 돌아온 뒤 맵을 바꿀 수 있어요.";
		return false;
	}
	for (const toy of toys) scene.remove(toy.group);
	toys.length = 0;
	activeMapId = mapId;
	if (mapId === "politics") politicsPaymentAuthorized = false;
	initialToyData = mapDefinitions[activeMapId].toys;
	respawnAt = loadRespawnTimes(activeMapId);
	try { localStorage.setItem("plush-club-active-map-v1", activeMapId); } catch { /* The map remains selected for this session. */ }
	mapAnimalsButton.setAttribute("aria-pressed", String(activeMapId === "animals"));
	mapPoliticsButton.setAttribute("aria-pressed", String(activeMapId === "politics"));
	const stageLabel = document.querySelector(".stage-label");
	stageLabel.textContent = mapDefinitions[activeMapId].label.toUpperCase();
	const sceneColor = activeMapId === "politics" ? "#e5e2dc" : "#dcebe0";
	scene.background.set(sceneColor);
	scene.fog.color.set(sceneColor);
	interiorLight.color.set(activeMapId === "politics" ? "#f4e3c2" : "#ffdf9c");
	resetToys();
	clawState.x = -3.35;
	clawState.z = 0;
	clawState.cable = 0;
	updateClaw(0);
	updateRestockStatus();
	status.textContent = activeMapId === "politics" ? "찢토피아로 이동했어요." : "동물 인형으로 이동했어요.";
	setBusy(false);
	return true;
}

async function enterPoliticsRoom() {
	if (politicsEntryPending || activeMapId === "politics") return;
	if (clawState.mode !== "ready") {
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
		setBusy(clawState.mode !== "ready");
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
		if (!toys.some((toy) => toy.index === index)) toys.push(makeToy(initialToyData[index], index));
		changed = true;
	}
	if (changed) {
		saveRespawnTimes();
		setBusy(clawState.mode !== "ready");
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
const carriage = new THREE.Group();
gantry.add(carriage);
box(carriage, [0.92, 0.28, 0.7], [0, -0.04, 0], mats.frame);
box(carriage, [0.56, 0.12, 0.46], [0, -0.22, 0], mats.gold);
const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 12), mats.metal);
carriage.add(cable);
const claw = new THREE.Group();
carriage.add(claw);
sphere(claw, [0, 0, 0], [0.22, 0.12, 0.22], mats.metal, 18);
sphere(claw, [0, -0.16, 0], [0.14, 0.12, 0.14], mats.gold, 18);
const fingers = [];
for (let index = 0; index < 3; index += 1) {
	const finger = new THREE.Group();
	finger.rotation.y = index * (Math.PI * 2 / 3);
	claw.add(finger);
	const segment = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.31, 4, 8), mats.metal);
	segment.position.set(0, -0.31, 0.16);
	segment.rotation.x = -0.12;
	finger.add(segment);
	sphere(finger, [0, -0.51, 0.16], [0.065, 0.065, 0.065], mats.ink, 12);
	fingers.push(finger);
}

const clawState = {
	x: -3.35, z: 0, cable: 0, mode: "ready", target: null, delivered: false,
	modeTime: 0, gripQuality: 0, slipAt: Infinity, carriedTime: 0, fallVelocity: 0,
};
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
	setBusy(clawState.mode !== "ready");
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
		listItem.className = "bag-item-row";
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
		listItem.append(button);
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
		
		const quickSellButton = document.createElement("button");
		quickSellButton.className = "shop-sell-button";
		quickSellButton.type = "button";
		quickSellButton.textContent = "판매 (15코인)";
		quickSellButton.disabled = !supabaseClient || !item.id;
		quickSellButton.addEventListener("click", async () => {
			quickSellButton.disabled = true;
			try {
				const { error } = await supabaseClient.rpc("create_market_listing", { p_item_id: item.id, p_price: 15 });
				if (error) throw error;
				await reloadCurrentProfile();
				await refreshShop();
				shopStatus.textContent = "인형을 15코인으로 판매했어요. 코인이 즉시 지급됩니다.";
				currentAccount.coins += 15;
				coinsLabel.textContent = String(currentAccount.coins);
			} catch (error) {
				shopStatus.textContent = error.message.includes("create_market_listing")
					? "상점 데이터베이스 설정이 필요해요. 최신 supabase/schema.sql을 실행해 주세요."
					: error.message;
				quickSellButton.disabled = false;
			}
		});
		
		const tradeButton = document.createElement("button");
		tradeButton.className = "shop-sell-button";
		tradeButton.type = "button";
		tradeButton.textContent = "거래하기 (25코인)";
		tradeButton.disabled = !supabaseClient || !item.id;
		const tradePrice = 25;
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
	setBusy(clawState.mode !== "ready");
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

function resize() {
	const bounds = canvas.getBoundingClientRect();
	const width = Math.max(1, bounds.width);
	const height = Math.max(1, bounds.height);
	const aspect = width / height;
	cameraOrbit.distance = Math.max(9.4 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * aspect), 7.2 / (2 * Math.tan(THREE.MathUtils.degToRad(21)))) * 1.08 / cameraOrbit.zoom;
	camera.aspect = aspect;
	updateCameraOrbit();
	camera.updateProjectionMatrix();
	renderer.setSize(width, height, false);
}

function updateCameraOrbit() {
	const horizontalDistance = Math.cos(cameraOrbit.elevation) * cameraOrbit.distance;
	camera.position.set(
		Math.sin(cameraOrbit.azimuth) * horizontalDistance,
		cameraTarget.y + Math.sin(cameraOrbit.elevation) * cameraOrbit.distance,
		Math.cos(cameraOrbit.azimuth) * horizontalDistance,
	);
	camera.lookAt(cameraTarget);
	camera.updateMatrixWorld();
}

function setCameraZoom(zoom) {
	cameraOrbit.zoom = THREE.MathUtils.clamp(zoom, 0.7, 1.6);
	const bounds = canvas.getBoundingClientRect();
	const aspect = Math.max(1, bounds.width) / Math.max(1, bounds.height);
	cameraOrbit.distance = Math.max(9.4 / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * aspect), 7.2 / (2 * Math.tan(THREE.MathUtils.degToRad(21)))) * 1.08 / cameraOrbit.zoom;
	updateCameraOrbit();
}

function setBusy(busy) {
	const balance = currentAccount ? currentAccount.coins : guestCoins;
	dropButton.disabled = busy || politicsEntryPending || toys.length === 0 || !authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden || balance < playCost;
}

async function beginDrop() {
	if (playRequestPending || politicsEntryPending || !authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden) return;
	const balance = currentAccount ? currentAccount.coins : guestCoins;
	if (balance < playCost) {
		showCoinShortage();
		return;
	}
	if (clawState.mode !== "ready" || toys.length === 0) return;
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
	clawState.mode = "drop";
	clawState.target = null;
	clawState.delivered = false;
	clawState.modeTime = 0;
	clawState.slipAt = Infinity;
	setBusy(true);
	status.textContent = "집게가 내려가요. 앞뒤 위치도 잘 맞춰 보세요.";
}

function finishRound() {
	clawState.mode = "ready";
	clawState.target = null;
	clawState.cable = 0;
	clawState.z = 0;
	if (!clawState.delivered) status.textContent = "아깝다! 인형 위에 집게를 맞춰 다시 해봐요.";
	clawState.delivered = false;
	setBusy(false);
}

function beginLift() {
	const target = clawState.target;
	const xOffset = Math.abs(target.x - clawState.x);
	const zOffset = Math.abs(target.z - clawState.z);
	const alignmentError = Math.hypot(xOffset / 0.36, zOffset / 0.5);
	clawState.gripQuality = THREE.MathUtils.clamp(1 - alignmentError, 0, 1);
	const weightFactor = THREE.MathUtils.clamp(1.12 - target.weight * 0.31, 0.5, 0.98);
	const gripChance = clawState.gripQuality ** 2 * weightFactor;

	if (alignmentError > 0.95 || Math.random() > gripChance) {
		target.group.scale.y = target.baseScale;
		clawState.target = null;
		clawState.mode = "miss";
		status.textContent = alignmentError > 0.48
			? "인형 중심을 놓쳤어요. 앞뒤와 좌우를 더 정확히 맞춰 보세요."
			: target.weight > 0.82
				? "무거운 인형을 들어 올리지 못했어요. 가벼운 인형부터 도전해 보세요."
				: "집게가 인형을 제대로 감싸지 못했어요.";
		return;
	}

	const slipChance = THREE.MathUtils.clamp(0.08 + target.weight * 0.39 + (1 - clawState.gripQuality) * 0.32, 0.08, 0.72);
	clawState.slipAt = Math.random() < slipChance ? 0.25 + Math.random() * 1.25 : Infinity;
	clawState.carriedTime = 0;
	clawState.mode = "lift";
	status.textContent = target.weight > 0.82
		? "무거운 인형이에요! 집게가 버텨야 해요."
		: "집었어요! 집게가 천천히 들어 올립니다.";
}

function dropHeldToy() {
	if (!clawState.target) return;
	clawState.fallVelocity = 0;
	clawState.target.group.rotation.z = 0;
	clawState.target.group.scale.y = clawState.target.baseScale;
	clawState.mode = "slip";
	status.textContent = "인형이 무게를 못 이기고 집게에서 빠졌어요!";
}

function updateClaw(delta) {
	const step = delta;
	if (clawState.mode === "ready") {
		if (!authGate.hidden || !prizeGate.hidden || !bagGate.hidden || !shopGate.hidden) return;
		const direction = THREE.MathUtils.clamp((keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0) + joystickVector.x, -1, 1);
		const depthDirection = THREE.MathUtils.clamp((keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0) + joystickVector.z, -1, 1);
		clawState.x = THREE.MathUtils.clamp(clawState.x + direction * step * 4.7, -3.55, 3.55);
		clawState.z = THREE.MathUtils.clamp(clawState.z + depthDirection * step * 3.4, -1.12, 1.05);
	} else if (clawState.mode === "drop") {
		clawState.modeTime += step;
		clawState.cable = Math.min(4.02, clawState.cable + step * 5.8);
		if (clawState.cable >= 4.02) {
			const nearest = toys.reduce((best, toy) => {
				const distance = Math.hypot(toy.x - clawState.x, toy.z - clawState.z);
				const bestDistance = Math.hypot(best.x - clawState.x, best.z - clawState.z);
				return distance < bestDistance ? toy : best;
			}, toys[0]);
			const contactDistance = Math.hypot(nearest.x - clawState.x, nearest.z - clawState.z);
			clawState.target = contactDistance < 0.76 ? nearest : null;
			clawState.mode = "touch";
			clawState.modeTime = 0;
			status.textContent = clawState.target ? "인형에 닿았어요. 집게를 벌려 감쌉니다." : "집게가 바닥에 닿았어요. 위치를 다시 맞춰 보세요.";
		}
	} else if (clawState.mode === "touch") {
		clawState.modeTime += step;
		if (clawState.target) clawState.target.group.scale.y = clawState.target.baseScale * 0.96;
		if (clawState.modeTime >= 0.3) {
			clawState.mode = "close";
			clawState.modeTime = 0;
		}
	} else if (clawState.mode === "close") {
		clawState.modeTime += step;
		if (clawState.target) {
			const squeeze = THREE.MathUtils.clamp(clawState.modeTime / 0.42, 0, 1);
			clawState.target.group.scale.y = clawState.target.baseScale * (1 - squeeze * 0.12);
		}
		if (clawState.modeTime >= 0.42) {
			if (clawState.target) beginLift();
			else {
				clawState.mode = "miss";
				status.textContent = "인형에 닿지 않았어요. 방향을 조금 조정해 보세요.";
			}
			clawState.modeTime = 0;
		}
	} else if (clawState.mode === "lift" || clawState.mode === "miss") {
		clawState.cable = Math.max(0, clawState.cable - step * 6.3);
		if (clawState.mode === "lift") {
			clawState.carriedTime += step;
			if (clawState.carriedTime >= clawState.slipAt) dropHeldToy();
		}
		if (clawState.mode !== "slip" && clawState.cable === 0) clawState.mode = clawState.target ? "deliver" : "return";
	} else if (clawState.mode === "deliver") {
		clawState.carriedTime += step;
		if (clawState.carriedTime >= clawState.slipAt) dropHeldToy();
		clawState.x = Math.min(3.45, clawState.x + step * 5.1);
		if (clawState.mode === "deliver" && clawState.x >= 3.45) clawState.mode = "deposit";
	} else if (clawState.mode === "deposit") {
		if (clawState.target) {
			clawState.target.group.position.set(3.45, Math.max(0.2, clawState.target.group.position.y - step * 2.5), 1.02);
			clawState.target.group.rotation.z += step * 1.4;
		}
		if (!clawState.target || clawState.target.group.position.y <= 0.2) {
			const caughtToy = clawState.target;
			if (caughtToy) scene.remove(caughtToy.group);
			const caughtIndex = toys.indexOf(clawState.target);
			if (caughtIndex >= 0) toys.splice(caughtIndex, 1);
			if (caughtToy) {
				startRespawnCooldown(caughtToy.index);
				if (currentAccount) {
					currentAccount.bag.push({ id: crypto.randomUUID(), kind: caughtToy.kind, color: caughtToy.color, collectedAt: Date.now() });
					saveCurrentAccount();
					renderBag();
					status.textContent = toys.length ? "성공! 새 친구가 가방에 담겼어요." : "대성공! 모든 친구를 가방에 담았어요!";
				} else {
					status.textContent = "로그인하지 않으면 인형이 가방에 모이지 않아요.";
				}
			}
			clawState.target = null;
			clawState.delivered = true;
			score += 1;
			scoreLabel.textContent = `${score} 마리`;
			if (caughtToy) showPrize(caughtToy);
			clawState.mode = "return";
		}
	} else if (clawState.mode === "slip") {
		clawState.fallVelocity -= 9.8 * step;
		clawState.target.group.position.y = Math.max(0.69, clawState.target.group.position.y + clawState.fallVelocity * step);
		if (clawState.target.group.position.y <= 0.69) {
			clawState.target.group.position.y = 0.69;
			clawState.target.group.scale.y = clawState.target.baseScale;
			clawState.target = null;
			clawState.mode = "return";
		}
	} else if (clawState.mode === "return") {
		clawState.x = Math.max(0, clawState.x - step * 5.6);
		clawState.z = THREE.MathUtils.damp(clawState.z, 0, 5, step);
		clawState.cable = Math.max(0, clawState.cable - step * 6.3);
		if (clawState.x === 0 && Math.abs(clawState.z) < 0.02 && clawState.cable === 0) finishRound();
	}

	carriage.position.set(clawState.x, 5.7, clawState.z);
	claw.position.y = -clawState.cable;
	claw.position.z = 0;
	cable.position.y = -clawState.cable / 2;
	cable.position.z = 0;
	cable.scale.y = Math.max(0.01, clawState.cable);
	let spread = 0.27;
	if (clawState.mode === "drop") spread = THREE.MathUtils.lerp(0.27, 0.035, THREE.MathUtils.clamp(clawState.modeTime / 0.22, 0, 1));
	else if (clawState.mode === "touch") spread = THREE.MathUtils.lerp(0.035, 0.27, THREE.MathUtils.clamp(clawState.modeTime / 0.3, 0, 1));
	else if (clawState.mode === "close") spread = THREE.MathUtils.lerp(0.27, 0.035, THREE.MathUtils.clamp(clawState.modeTime / 0.42, 0, 1));
	else if (["lift", "deliver", "deposit", "return", "slip", "miss"].includes(clawState.mode)) spread = 0.035;
	for (const finger of fingers) finger.position.set(0, 0, spread);
	if (clawState.target && ["lift", "deliver"].includes(clawState.mode)) {
		clawState.target.group.position.set(clawState.x, 5.7 - clawState.cable - 0.78, clawState.z);
	}
}

function updateChizzillaEscape(toy, delta, elapsed) {
	if (toy.kind !== "chizzilla" || toy === clawState.target) return false;
	if (!(["ready", "drop", "touch", "close"].includes(clawState.mode))) return false;
	const awayX = toy.x - clawState.x;
	const awayZ = toy.z - clawState.z;
	const distance = Math.hypot(awayX, awayZ);
	if (distance > 2.1) return false;

	let directionX = distance > 0.001 ? awayX / distance : Math.cos(elapsed + toy.index);
	let directionZ = distance > 0.001 ? awayZ / distance : Math.sin(elapsed + toy.index);
	if (toy.x < -2.6) directionX += 0.8;
	if (toy.x > 2.6) directionX -= 0.8;
	if (toy.z < -0.7) directionZ += 0.8;
	if (toy.z > 0.7) directionZ -= 0.8;
	const directionLength = Math.hypot(directionX, directionZ) || 1;
	directionX /= directionLength;
	directionZ /= directionLength;
	const distanceStep = Math.min(delta * 2.2, Math.max(0, 2.1 - distance));
	let nextX = THREE.MathUtils.clamp(toy.x + directionX * distanceStep, -3.4, 3.4);
	let nextZ = THREE.MathUtils.clamp(toy.z + directionZ * distanceStep, -1.05, 1.05);
	const overlapsToy = (x, z) => toys.some((other) => other !== toy && other !== clawState.target && Math.hypot(other.x - x, other.z - z) < 0.9);
	if (overlapsToy(nextX, nextZ)) {
		nextX = THREE.MathUtils.clamp(toy.x + directionX * distanceStep, -3.4, 3.4);
		nextZ = toy.z;
		if (overlapsToy(nextX, nextZ)) {
			nextX = toy.x;
			nextZ = THREE.MathUtils.clamp(toy.z + directionZ * distanceStep, -1.05, 1.05);
		}
	}
	const movedX = nextX - toy.x;
	const movedZ = nextZ - toy.z;
	toy.x = nextX;
	toy.z = nextZ;
	toy.group.position.x = nextX;
	toy.group.position.z = nextZ;
	toy.group.position.y = 0.69 + Math.abs(Math.sin(elapsed * 20 + toy.index)) * 0.085;
	if (Math.hypot(movedX, movedZ) > 0.001) toy.group.rotation.y = Math.atan2(movedX, movedZ);
	toy.group.rotation.z = Math.sin(elapsed * 20 + toy.index) * 0.13;
	return true;
}

function animate() {
	const delta = Math.min(clock.getDelta(), 0.04);
	updateRespawns();
	updateClaw(delta);
	const elapsed = clock.elapsedTime;
	for (const toy of toys) {
		if (toy !== clawState.target && !updateChizzillaEscape(toy, delta, elapsed)) {
			toy.group.position.y = 0.69 + Math.sin(elapsed * 1.5 + toy.index) * 0.025;
			toy.group.rotation.z = THREE.MathUtils.damp(toy.group.rotation.z, 0, 8, delta);
		}
	}
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
	setBusy(clawState.mode !== "ready");
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
	setBusy(clawState.mode !== "ready");
	shopButton.focus();
}
closeShopButton.addEventListener("click", closeShop);
document.querySelector("#closeShopBackdrop").addEventListener("click", closeShop);
document.querySelector("#refreshShop").addEventListener("click", refreshShop);
document.querySelector("#closePrize").addEventListener("click", closePrize);
sharePrizeButton.addEventListener("click", sharePrize);
mapAnimalsButton.addEventListener("click", () => switchMap("animals"));
mapPoliticsButton.addEventListener("click", enterPoliticsRoom);
document.querySelector("#logout").addEventListener("click", () => {
	if (clawState.mode !== "ready") {
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
	if (event.pointerId !== cameraDrag.pointerId) {
		canvas.style.cursor = isAdInquiryTarget(event) ? "pointer" : "grab";
		return;
	}
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
	cameraDrag.startX = event.clientX;
	cameraDrag.startY = event.clientY;
	canvas.setPointerCapture(event.pointerId);
	canvas.classList.add("dragging-view");
});
function isAdInquiryTarget(event) {
	const bounds = canvas.getBoundingClientRect();
	pointerNdc.set(
		((event.clientX - bounds.left) / bounds.width) * 2 - 1,
		-((event.clientY - bounds.top) / bounds.height) * 2 + 1,
	);
	interactionRaycaster.setFromCamera(pointerNdc, camera);
	const firstOpaqueHit = interactionRaycaster.intersectObject(scene, true).find(({ object }) => {
		const surfaces = Array.isArray(object.material) ? object.material : [object.material];
		return !surfaces.every((surface) => surface?.transparent && surface.opacity < 0.95);
	});
	return firstOpaqueHit?.object.userData.adInquiryTarget === true;
}
function endCameraDrag(event) {
	if (event.pointerId !== cameraDrag.pointerId) return;
	const isClick = event.type === "pointerup" && Math.hypot(event.clientX - cameraDrag.startX, event.clientY - cameraDrag.startY) < 6;
	const openAdInquiry = isClick && isAdInquiryTarget(event);
	if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
	cameraDrag.pointerId = null;
	canvas.classList.remove("dragging-view");
	canvas.style.cursor = openAdInquiry ? "pointer" : "grab";
	if (openAdInquiry) window.open(adInquiryUrl, "_blank", "noopener,noreferrer");
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
	clawState.x = -3.35;
		clawState.z = 0;
	clawState.cable = 0;
	clawState.target = null;
	clawState.mode = "ready";
	clawState.delivered = false;
		clawState.modeTime = 0;
		clawState.gripQuality = 0;
		clawState.slipAt = Infinity;
		clawState.carriedTime = 0;
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