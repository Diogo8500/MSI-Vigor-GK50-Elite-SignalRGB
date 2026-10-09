export function Name() { return "MSI Vigor GK50 Elite"; }
export function VendorId() { return 0x0DB0; }
export function ProductId() { return [0x0B5B]; }
export function Publisher() { return "Diogo8500"; }
export function Size() { return [21, 6]; }
export function DeviceType() { return "keyboard"; }
export function Validate(endpoint) { return endpoint.interface === 1; }
export function ImageUrl() { return "https://assets.signalrgb.com/devices/brands/msi/keyboards/vigor-gk50-elite.png"; }
/* global
shutdownColor:readonly
LightingMode:readonly
forcedColor:readonly
hwBrightness:readonly
framesPerSecond:readonly
*/
export function ControllableParameters() {
	return [
		{"property":"shutdownColor", "group":"lighting", "label":"Shutdown Color", description: "This color is applied to the device when the System, or SignalRGB is shutting down", "min":"0", "max":"360", "type":"color", "default":"#000000"},
		{"property":"LightingMode", "group":"lighting", "label":"Lighting Mode", description: "Determines where the device's RGB comes from. Canvas will pull from the active Effect, while Forced will override it to a specific color", "type":"combobox", "values":["Canvas", "Forced"], "default":"Canvas"},
		{"property":"forcedColor", "group":"lighting", "label":"Forced Color", description: "The color used when 'Forced' Lighting Mode is enabled", "min":"0", "max":"360", "type":"color", "default":"#009bde"},
		{"property":"hwBrightness", "group":"lighting", "label":"Hardware Brightness", description: "The keyboard's own per-key brightness step. May still apply after SignalRGB closes or the keyboard is replugged","type":"combobox", "values":["20%", "40%", "60%", "80%", "100%"], "default":"100%"},
		{"property":"framesPerSecond", "group":"", "label":"Frames Per Second", description: "Upper limit on frames sent to the keyboard. Lower this if the keyboard's lighting ever stops responding", "type":"number", "min":"5", "max":"30", "step":"1", "default":"30"},
	];
}

/*
 * Protocol (decoded from MSI Dragon Center captures, firmware 0x0120). Vendor HID interface 1, 64-byte reports.
 * The keyboard echoes every command. Wait for the echo before sending the next one, as Dragon Center does:
 * back-to-back writes can lock up the lighting controller until the keyboard is replugged.
 *   41 80                       session start (MSI sends it before every lighting change)
 *   56 20 NN                    read config block NN (60-byte payload at offset 4 of the reply)
 *   56 21 NN 00 <60 bytes>      write config block NN to RAM
 *   51 28 00 00 MM              activate effect MM (0x0B = per-key custom) from RAM
 *   50 55                       save RAM config to flash (~130 ms). Never sent by this plugin.
 * Per-key colour table: blocks 0x06..0x0C, RGB triplets, slot = column * 6 + row (22 x 6 matrix).
 * Only slots 0..131 are colours; the rest of block 0x0C belongs to other settings and is preserved.
 * Per-key brightness: block 0x05 payload byte 55 (0x33/0x66/0x99/0xCC/0xFF).
 */
const MATRIX_ROWS = 6;
const SLOT_COUNT = 132;
const FIRST_COLOR_BLOCK = 0x06;
const COLOR_BLOCK_COUNT = 7;
const BLOCK_PAYLOAD = 60;
const PERKEY_EFFECT = 0x0B;
const SETTINGS_BLOCK = 0x05;
const BRIGHTNESS_OFFSET = 55;
const brightnessSteps = {"20%": 0x33, "40%": 0x66, "60%": 0x99, "80%": 0xCC, "100%": 0xFF};

// Tail of block 0x0C as seen in the captures; replaced by the keyboard's own bytes when it can be read.
const defaultTableTail = [0x56, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0xC1, 0x00, 0x00, 0x00, 0x00, 0xBE, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

// [name, matrix column, matrix row, canvas x, canvas y] - ISO (PT) layout, 105 keys.
const vLayout = [
	["Esc", 0, 0, 0, 0], ["F1", 2, 0, 2, 0], ["F2", 3, 0, 3, 0], ["F3", 4, 0, 4, 0], ["F4", 5, 0, 5, 0],
	["F5", 7, 0, 6, 0], ["F6", 8, 0, 7, 0], ["F7", 9, 0, 8, 0], ["F8", 10, 0, 9, 0],
	["F9", 11, 0, 10, 0], ["F10", 12, 0, 11, 0], ["F11", 13, 0, 12, 0], ["F12", 14, 0, 13, 0],
	["Print Screen", 15, 0, 14, 0], ["Scroll Lock", 16, 0, 15, 0], ["Pause Break", 17, 0, 16, 0],

	["\\", 0, 1, 0, 1], ["1", 1, 1, 1, 1], ["2", 2, 1, 2, 1], ["3", 3, 1, 3, 1], ["4", 4, 1, 4, 1], ["5", 5, 1, 5, 1],
	["6", 6, 1, 6, 1], ["7", 7, 1, 7, 1], ["8", 8, 1, 8, 1], ["9", 9, 1, 9, 1], ["0", 10, 1, 10, 1],
	["'", 11, 1, 11, 1], ["«", 12, 1, 12, 1], ["Backspace", 14, 1, 13, 1],
	["Insert", 15, 1, 14, 1], ["Home", 16, 1, 15, 1], ["Page Up", 17, 1, 16, 1],
	["Num Lock", 18, 1, 17, 1], ["Num /", 19, 1, 18, 1], ["Num *", 20, 1, 19, 1], ["Num -", 21, 1, 20, 1],

	["Tab", 0, 2, 0, 2], ["Q", 1, 2, 1, 2], ["W", 2, 2, 2, 2], ["E", 3, 2, 3, 2], ["R", 4, 2, 4, 2], ["T", 5, 2, 5, 2],
	["Y", 6, 2, 6, 2], ["U", 7, 2, 7, 2], ["I", 8, 2, 8, 2], ["O", 9, 2, 9, 2], ["P", 10, 2, 10, 2],
	["+", 11, 2, 11, 2], ["´", 12, 2, 12, 2],
	["Del", 15, 2, 14, 2], ["End", 16, 2, 15, 2], ["Page Down", 17, 2, 16, 2],
	["Num 7", 18, 2, 17, 2], ["Num 8", 19, 2, 18, 2], ["Num 9", 20, 2, 19, 2], ["Num +", 21, 2, 20, 2],

	["Caps Lock", 0, 3, 0, 3], ["A", 1, 3, 1, 3], ["S", 2, 3, 2, 3], ["D", 3, 3, 3, 3], ["F", 4, 3, 4, 3], ["G", 5, 3, 5, 3],
	["H", 6, 3, 6, 3], ["J", 7, 3, 7, 3], ["K", 8, 3, 8, 3], ["L", 9, 3, 9, 3],
	["Ç", 10, 3, 10, 3], ["º", 11, 3, 11, 3], ["~", 12, 3, 12, 3], ["Enter", 14, 3, 13, 3],
	["Num 4", 18, 3, 17, 3], ["Num 5", 19, 3, 18, 3], ["Num 6", 20, 3, 19, 3],

	["Left Shift", 0, 4, 0, 4], ["<", 1, 4, 1, 4], ["Z", 2, 4, 2, 4], ["X", 3, 4, 3, 4], ["C", 4, 4, 4, 4], ["V", 5, 4, 5, 4],
	["B", 6, 4, 6, 4], ["N", 7, 4, 7, 4], ["M", 8, 4, 8, 4], [",", 9, 4, 9, 4], [".", 10, 4, 10, 4], ["-", 11, 4, 11, 4],
	["Right Shift", 13, 4, 13, 4], ["Up Arrow", 16, 4, 15, 4],
	["Num 1", 18, 4, 17, 4], ["Num 2", 19, 4, 18, 4], ["Num 3", 20, 4, 19, 4],

	["Left Ctrl", 0, 5, 0, 5], ["Left Win", 1, 5, 1, 5], ["Left Alt", 2, 5, 2, 5], ["Space", 6, 5, 6, 5],
	["Right Alt", 10, 5, 10, 5], ["Right Win", 12, 5, 11, 5], ["Menu", 13, 5, 12, 5], ["Right Ctrl", 14, 5, 13, 5],
	["Left Arrow", 15, 5, 14, 5], ["Down Arrow", 16, 5, 15, 5], ["Right Arrow", 17, 5, 16, 5],
	["Num 0", 18, 5, 17, 5], ["Num .", 20, 5, 19, 5], ["Num Enter", 21, 5, 20, 4],
];

const vKeys = vLayout.map(key => key[1] * MATRIX_ROWS + key[2]);
const vKeyNames = vLayout.map(key => key[0]);
const vKeyPositions = vLayout.map(key => [key[3], key[4]]);

let tableTail = defaultTableTail.slice();
let settingsBlock = null;
let appliedBrightness = null;
let lastSentBlocks = [];
let frameCredit = 1;
let lastRenderTime = 0;
let warnedNoEcho = false;

export function LedNames() {
	return vKeyNames;
}

export function LedPositions() {
	return vKeyPositions;
}

export function Initialize() {
	warnedNoEcho = false;

	if (!sendCommand([0x00, 0x41, 0x80])) {
		device.log("Keyboard lighting controller is not responding. Unplug the keyboard, wait a few seconds and plug it back in.");
	}

	const tail = readBlock(FIRST_COLOR_BLOCK + COLOR_BLOCK_COUNT - 1);

	if (tail) {
		tableTail = tail.slice(SLOT_COUNT * 3 - (COLOR_BLOCK_COUNT - 1) * BLOCK_PAYLOAD);
	} else {
		device.log("Could not read block 0x0C, using captured defaults for its trailing settings");
	}

	settingsBlock = readBlock(SETTINGS_BLOCK);

	if (!settingsBlock) {
		device.log("Could not read block 0x05, hardware brightness control disabled");
	}

	appliedBrightness = null;
	lastSentBlocks = [];
	sendColors();
}

export function Render() {
	const now = Date.now();
	const fps = Math.min(30, Math.max(5, Number(framesPerSecond)));

	// Earn fps credits per second and spend one per frame. A plain "time since last frame" check would
	// halve the rate whenever SignalRGB's own ~30 Hz calls land a hair early.
	frameCredit = Math.min(2, frameCredit + (now - lastRenderTime) * fps / 1000);
	lastRenderTime = now;

	if (frameCredit < 1) {
		return;
	}

	frameCredit -= 1;
	sendColors();
}

export function Shutdown(SystemSuspending) {
	const color = SystemSuspending ? "#000000" : shutdownColor;
	sendColors(color);
}

function sendColors(overrideColor) {
	applyBrightness();

	const table = new Array(SLOT_COUNT * 3).fill(0).concat(tableTail);

	for (let iIdx = 0; iIdx < vKeys.length; iIdx++) {
		let color;

		if (overrideColor) {
			color = hexToRgb(overrideColor);
		} else if (LightingMode === "Forced") {
			color = hexToRgb(forcedColor);
		} else {
			color = device.color(vKeyPositions[iIdx][0], vKeyPositions[iIdx][1]);
		}

		table[vKeys[iIdx] * 3] = color[0];
		table[vKeys[iIdx] * 3 + 1] = color[1];
		table[vKeys[iIdx] * 3 + 2] = color[2];
	}

	let changed = false;

	for (let block = 0; block < COLOR_BLOCK_COUNT; block++) {
		const payload = table.slice(block * BLOCK_PAYLOAD, (block + 1) * BLOCK_PAYLOAD);

		if (lastSentBlocks[block] && payload.every((value, i) => value === lastSentBlocks[block][i])) {
			continue;
		}

		if (!sendCommand([0x00, 0x56, 0x21, FIRST_COLOR_BLOCK + block, 0x00].concat(payload))) {
			// Keyboard is busy: drop this frame and resend everything on the next one.
			lastSentBlocks = [];

			return;
		}

		lastSentBlocks[block] = payload;
		changed = true;
	}

	if (changed && !sendCommand([0x00, 0x51, 0x28, 0x00, 0x00, PERKEY_EFFECT])) {
		lastSentBlocks = [];
	}
}

function applyBrightness() {
	const value = brightnessSteps[hwBrightness];

	if (!settingsBlock || value === undefined || value === appliedBrightness) {
		return;
	}

	settingsBlock[BRIGHTNESS_OFFSET] = value;

	if (!sendCommand([0x00, 0x56, 0x21, SETTINGS_BLOCK, 0x00].concat(settingsBlock))) {
		return;
	}

	appliedBrightness = value;
	// Force a full table resend so the effect is re-activated with the new brightness.
	lastSentBlocks = [];
}

function readBlock(block) {
	const response = sendCommand([0x00, 0x56, 0x20, block]);

	return response ? response.slice(4, 4 + BLOCK_PAYLOAD) : null;
}

// Writes one command and waits for its echo. Returns the 64-byte reply, or null if none arrived.
function sendCommand(packet) {
	device.clearReadBuffer();
	device.write(packet, 65);

	for (let attempt = 0; attempt < 10; attempt++) {
		const response = device.read([0x00], 65, 10);

		if (device.getLastReadSize() === 0) {
			continue;
		}

		// Replies normally start with report ID 0x00; accept them without it as well.
		const start = response[0] === packet[1] ? 0 : 1;
		const sameCommand = response[start] === packet[1] && response[start + 1] === packet[2];

		// 0x56 replies also echo the block number.
		if (sameCommand && (packet[1] !== 0x56 || response[start + 2] === packet[3])) {
			return response.slice(start, start + 64);
		}
	}

	if (!warnedNoEcho) {
		device.log("No reply to command " + packet[1].toString(16) + " " + packet[2].toString(16) + "; dropping the frame");
		warnedNoEcho = true;
	}

	return null;
}

function hexToRgb(hex) {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const colors = [];
	colors[0] = parseInt(result[1], 16);
	colors[1] = parseInt(result[2], 16);
	colors[2] = parseInt(result[3], 16);

	return colors;
}
