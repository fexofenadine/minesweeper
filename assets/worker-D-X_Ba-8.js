//#region node_modules/hyperapp/src/index.js
function h(name, attributes) {
	var rest = [];
	var children = [];
	var length = arguments.length;
	while (length-- > 2) rest.push(arguments[length]);
	while (rest.length) {
		var node = rest.pop();
		if (node && node.pop) for (length = node.length; length--;) rest.push(node[length]);
		else if (node != null && node !== true && node !== false) children.push(node);
	}
	return typeof name === "function" ? name(attributes || {}, children) : {
		nodeName: name,
		attributes: attributes || {},
		children,
		key: attributes && attributes.key
	};
}
function app(state, actions, view, container) {
	var map = [].map;
	var rootElement = container && container.children[0] || null;
	var oldNode = rootElement && recycleElement(rootElement);
	var lifecycle = [];
	var skipRender;
	var isRecycling = true;
	var globalState = clone(state);
	var wiredActions = wireStateToActions([], globalState, clone(actions));
	scheduleRender();
	return wiredActions;
	function recycleElement(element) {
		return {
			nodeName: element.nodeName.toLowerCase(),
			attributes: {},
			children: map.call(element.childNodes, function(element) {
				return element.nodeType === 3 ? element.nodeValue : recycleElement(element);
			})
		};
	}
	function resolveNode(node) {
		return typeof node === "function" ? resolveNode(node(globalState, wiredActions)) : node != null ? node : "";
	}
	function render() {
		skipRender = !skipRender;
		var node = resolveNode(view);
		if (container && !skipRender) rootElement = patch(container, rootElement, oldNode, oldNode = node);
		isRecycling = false;
		while (lifecycle.length) lifecycle.pop()();
	}
	function scheduleRender() {
		if (!skipRender) {
			skipRender = true;
			setTimeout(render);
		}
	}
	function clone(target, source) {
		var out = {};
		for (var i in target) out[i] = target[i];
		for (var i in source) out[i] = source[i];
		return out;
	}
	function setPartialState(path, value, source) {
		var target = {};
		if (path.length) {
			target[path[0]] = path.length > 1 ? setPartialState(path.slice(1), value, source[path[0]]) : value;
			return clone(source, target);
		}
		return value;
	}
	function getPartialState(path, source) {
		var i = 0;
		while (i < path.length) source = source[path[i++]];
		return source;
	}
	function wireStateToActions(path, state, actions) {
		for (var key in actions) typeof actions[key] === "function" ? (function(key, action) {
			actions[key] = function(data) {
				var result = action(data);
				if (typeof result === "function") result = result(getPartialState(path, globalState), actions);
				if (result && result !== (state = getPartialState(path, globalState)) && !result.then) scheduleRender(globalState = setPartialState(path, clone(state, result), globalState));
				return result;
			};
		})(key, actions[key]) : wireStateToActions(path.concat(key), state[key] = clone(state[key]), actions[key] = clone(actions[key]));
		return actions;
	}
	function getKey(node) {
		return node ? node.key : null;
	}
	function eventListener(event) {
		return event.currentTarget.events[event.type](event);
	}
	function updateAttribute(element, name, value, oldValue, isSvg) {
		if (name === "key") {} else if (name === "style") {
			if (typeof value === "string") element.style.cssText = value;
			else {
				if (typeof oldValue === "string") oldValue = element.style.cssText = "";
				for (var i in clone(oldValue, value)) {
					var style = value == null || value[i] == null ? "" : value[i];
					if (i[0] === "-") element.style.setProperty(i, style);
					else element.style[i] = style;
				}
			}
		} else {
			if (name[0] === "o" && name[1] === "n") {
				name = name.slice(2);
				if (element.events) {
					if (!oldValue) oldValue = element.events[name];
				} else element.events = {};
				element.events[name] = value;
				if (value) {
					if (!oldValue) element.addEventListener(name, eventListener);
				} else element.removeEventListener(name, eventListener);
			} else if (name in element && name !== "list" && name !== "type" && name !== "draggable" && name !== "spellcheck" && name !== "translate" && !isSvg) element[name] = value == null ? "" : value;
			else if (value != null && value !== false) element.setAttribute(name, value);
			if (value == null || value === false) element.removeAttribute(name);
		}
	}
	function createElement(node, isSvg) {
		var element = typeof node === "string" || typeof node === "number" ? document.createTextNode(node) : (isSvg = isSvg || node.nodeName === "svg") ? document.createElementNS("http://www.w3.org/2000/svg", node.nodeName) : document.createElement(node.nodeName);
		var attributes = node.attributes;
		if (attributes) {
			if (attributes.oncreate) lifecycle.push(function() {
				attributes.oncreate(element);
			});
			for (var i = 0; i < node.children.length; i++) element.appendChild(createElement(node.children[i] = resolveNode(node.children[i]), isSvg));
			for (var name in attributes) updateAttribute(element, name, attributes[name], null, isSvg);
		}
		return element;
	}
	function updateElement(element, oldAttributes, attributes, isSvg) {
		for (var name in clone(oldAttributes, attributes)) if (attributes[name] !== (name === "value" || name === "checked" ? element[name] : oldAttributes[name])) updateAttribute(element, name, attributes[name], oldAttributes[name], isSvg);
		var cb = isRecycling ? attributes.oncreate : attributes.onupdate;
		if (cb) lifecycle.push(function() {
			cb(element, oldAttributes);
		});
	}
	function removeChildren(element, node) {
		var attributes = node.attributes;
		if (attributes) {
			for (var i = 0; i < node.children.length; i++) removeChildren(element.childNodes[i], node.children[i]);
			if (attributes.ondestroy) attributes.ondestroy(element);
		}
		return element;
	}
	function removeElement(parent, element, node) {
		function done() {
			parent.removeChild(removeChildren(element, node));
		}
		var cb = node.attributes && node.attributes.onremove;
		if (cb) cb(element, done);
		else done();
	}
	function patch(parent, element, oldNode, node, isSvg) {
		if (node === oldNode) {} else if (oldNode == null || oldNode.nodeName !== node.nodeName) {
			var newElement = createElement(node, isSvg);
			parent.insertBefore(newElement, element);
			if (oldNode != null) removeElement(parent, element, oldNode);
			element = newElement;
		} else if (oldNode.nodeName == null) element.nodeValue = node;
		else {
			updateElement(element, oldNode.attributes, node.attributes, isSvg = isSvg || node.nodeName === "svg");
			var oldKeyed = {};
			var newKeyed = {};
			var oldElements = [];
			var oldChildren = oldNode.children;
			var children = node.children;
			for (var i = 0; i < oldChildren.length; i++) {
				oldElements[i] = element.childNodes[i];
				var oldKey = getKey(oldChildren[i]);
				if (oldKey != null) oldKeyed[oldKey] = [oldElements[i], oldChildren[i]];
			}
			var i = 0;
			var k = 0;
			while (k < children.length) {
				var oldKey = getKey(oldChildren[i]);
				var newKey = getKey(children[k] = resolveNode(children[k]));
				if (newKeyed[oldKey]) {
					i++;
					continue;
				}
				if (newKey != null && newKey === getKey(oldChildren[i + 1])) {
					if (oldKey == null) removeElement(element, oldElements[i], oldChildren[i]);
					i++;
					continue;
				}
				if (newKey == null || isRecycling) {
					if (oldKey == null) {
						patch(element, oldElements[i], oldChildren[i], children[k], isSvg);
						k++;
					}
					i++;
				} else {
					var keyedNode = oldKeyed[newKey] || [];
					if (oldKey === newKey) {
						patch(element, keyedNode[0], keyedNode[1], children[k], isSvg);
						i++;
					} else if (keyedNode[0]) patch(element, element.insertBefore(keyedNode[0], oldElements[i]), keyedNode[1], children[k], isSvg);
					else patch(element, oldElements[i], null, children[k], isSvg);
					newKeyed[newKey] = children[k];
					k++;
				}
			}
			while (i < oldChildren.length) {
				if (getKey(oldChildren[i]) == null) removeElement(element, oldElements[i], oldChildren[i]);
				i++;
			}
			for (var i in oldKeyed) if (!newKeyed[i]) removeElement(element, oldKeyed[i][0], oldKeyed[i][1]);
		}
		return element;
	}
}
var Game_module_default = {
	root: "Game_root",
	scoreboard: "Game_scoreboard",
	buttons: "Game_buttons",
	field: "Game_field",
	active: "Game_active",
	inactive: "Game_inactive",
	fieldLost: "Game_fieldLost Game_field",
	jitter: "Game_jitter",
	chroma: "Game_chroma",
	band: "Game_band",
	flicker: "Game_flicker"
};
var Dialog_module_default = {
	a: "Dialog_a",
	b: "Dialog_b",
	dialog: "Dialog_dialog",
	glow: "Dialog_glow",
	container: "Dialog_container",
	header: "Dialog_header",
	title: "Dialog_title",
	button: "Dialog_button",
	controls: "Dialog_controls",
	close: "Dialog_close"
};
var Button_module_default = { root: "Button_root" };
//#endregion
//#region src/Button.jsx
var Button = ({ key, type, tabIndex, title, disabled, onClick, onCreate }, children) => /* @__PURE__ */ h("button", {
	key,
	class: Button_module_default.root,
	type,
	tabindex: tabIndex,
	title,
	disabled,
	onclick: onClick,
	oncreate: onCreate
}, children);
//#endregion
//#region src/Dialog.jsx
var Dialog = ({ key, title, titleHint, onTitleDoubleClick, controls, onClose, onCreate }, children) => /* @__PURE__ */ h("div", { key }, /* @__PURE__ */ h("div", { class: Dialog_module_default.a }, /* @__PURE__ */ h("div", { class: Dialog_module_default.b }, /* @__PURE__ */ h("div", {
	class: Dialog_module_default.dialog,
	oncreate: onCreate
}, /* @__PURE__ */ h("div", { class: Dialog_module_default.container }, title && /* @__PURE__ */ h("div", { class: Dialog_module_default.header }, /* @__PURE__ */ h("h1", {
	class: Dialog_module_default.title,
	title: titleHint,
	ondblclick: onTitleDoubleClick
}, title), controls && /* @__PURE__ */ h("div", { class: Dialog_module_default.controls }, controls), onClose && /* @__PURE__ */ h("div", { class: Dialog_module_default.button }, /* @__PURE__ */ h(Button, {
	tabIndex: -1,
	onClick: onClose
}, /* @__PURE__ */ h("svg", {
	class: Dialog_module_default.close,
	width: "13",
	height: "11"
}, /* @__PURE__ */ h("path", { d: "M10.977 2.406l-.883-.883L7 4.616 3.906 1.523l-.883.883L6.116 5.5 3.023 8.594l.883.883L7 6.384l3.094 3.093.883-.883L7.884 5.5l3.093-3.094z" }))))), children)))));
var Menu_module_default = {
	root: "Menu_root",
	column: "Menu_column",
	columnActive: "Menu_columnActive Menu_column",
	button: "Menu_button",
	menu: "Menu_menu",
	item: "Menu_item",
	list: "Menu_list",
	option: "Menu_option",
	hotKey: "Menu_hotKey",
	check: "Menu_check",
	separator: "Menu_separator"
};
//#endregion
//#region src/shell/storage.js
var load = (key) => {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
};
var save = (key, value) => {
	try {
		localStorage.setItem(key, value);
	} catch {}
};
var remove = (key) => {
	try {
		localStorage.removeItem(key);
	} catch {}
};
//#endregion
//#region src/shell/backgrounds/matrix.js
var GRID_SIZE = 70;
var GRID_DEPTH = 35;
var WAVE_SIZE = 22;
var SPLASH_RATIO = .7;
var TICK = 30;
var encodings = {
	matrix: [..."ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789"],
	binary: [..."01"],
	hexadecimal: [..."0123456789ABCDEF"],
	decimal: [..."0123456789"],
	dna: [..."ACGT"]
};
var frand$1 = (n) => Math.random() * n;
var bellrand = (n) => (frand$1(n) + frand$1(n) + frand$1(n)) / 3;
var randomGlyph = (count) => Math.floor(Math.random() * count) + 1;
var ramp = Array.from({ length: WAVE_SIZE }, (_, i) => {
	return .2 + Math.sin((WAVE_SIZE - i) / 21 * Math.PI / 2) * .8;
});
var resetStrip = (s, count) => {
	s.x = frand$1(GRID_SIZE) - GRID_SIZE / 2;
	s.y = GRID_SIZE / 2 + bellrand(.5);
	s.z = GRID_DEPTH * .2 - frand$1(GRID_DEPTH * .7);
	s.dz = bellrand(.02);
	s.erasing = false;
	s.spinnerY = 0;
	s.spinnerSpeed = bellrand(.3);
	s.spinnerGlyph = -randomGlyph(count);
	s.spinSpeed = Math.floor(bellrand(2)) + 1;
	s.spinTick = 0;
	s.wavePosition = 0;
	s.waveSpeed = Math.floor(bellrand(3)) + 1;
	s.waveTick = 0;
	s.glyphs = Array.from({ length: GRID_SIZE }, () => {
		if (!Math.floor(Math.random() * 7)) return 0;
		const g = randomGlyph(count);
		return Math.floor(Math.random() * 20) ? g : -g;
	});
};
var tickStrip = (s, count) => {
	s.z += s.dz;
	if (s.z > GRID_DEPTH * SPLASH_RATIO) return resetStrip(s, count);
	s.spinnerY += s.spinnerSpeed;
	if (s.spinnerY >= GRID_SIZE) {
		if (s.erasing) return resetStrip(s, count);
		s.erasing = true;
		s.spinnerY = 0;
		s.spinnerSpeed /= 2;
	}
	if (++s.spinTick > s.spinSpeed) {
		s.spinTick = 0;
		s.spinnerGlyph = -randomGlyph(count);
		s.glyphs.forEach((g, i) => {
			if (g >= 0) return;
			s.glyphs[i] = Math.floor(Math.random() * 800) ? -randomGlyph(count) : randomGlyph(count);
		});
	}
	if (++s.waveTick > s.waveSpeed) {
		s.waveTick = 0;
		s.wavePosition = (s.wavePosition + 1) % WAVE_SIZE;
	}
};
var newStrip = (count) => {
	const s = {};
	resetStrip(s, count);
	s.erasing = Math.random() < .5;
	s.spinnerY = frand$1(GRID_SIZE);
	return s;
};
var PAD = 1.6;
var GLYPH = "#2cff6e";
var BRIGHT = "#d4ffe0";
var drawGlyph = (context, glyph, x, y, cell, colour) => {
	context.save();
	context.font = `${Math.round(cell / PAD * .8)}px monospace`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillStyle = colour;
	context.shadowColor = colour;
	context.translate(x, y);
	context.scale(-1, 1);
	context.shadowBlur = cell * .3;
	context.fillText(glyph, 0, 0);
	context.fillText(glyph, 0, 0);
	context.shadowBlur = cell * .07;
	context.fillText(glyph, 0, 0);
	context.restore();
};
var buildAtlas = (glyphs, cell) => {
	const atlas = document.createElement("canvas");
	atlas.width = cell * glyphs.length;
	atlas.height = cell * 2;
	const context = atlas.getContext("2d");
	[GLYPH, BRIGHT].forEach((colour, row) => {
		glyphs.forEach((glyph, i) => {
			drawGlyph(context, glyph, (i + .5) * cell, (row + .5) * cell, cell, colour);
		});
	});
	return atlas;
};
var glyphImage = (glyph, cell, colour = GLYPH) => {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = cell;
	const context = canvas.getContext("2d");
	if (!context) return null;
	drawGlyph(context, glyph, cell / 2, cell / 2, cell, colour);
	return canvas.toDataURL();
};
var matrix_default = {
	name: "GLMatrix",
	credit: "Ported from GLMatrix by Jamie Zawinski, part of xscreensaver",
	wallpaper: true,
	filter: (pixels) => `blur(${.6 / pixels}px)`,
	ratio: (pixels) => Math.min(pixels, 2),
	options: [
		{
			key: "density",
			label: "Density",
			type: "range",
			min: 10,
			max: 100,
			step: 1,
			value: 44
		},
		{
			key: "speed",
			label: "Speed",
			type: "range",
			min: .25,
			max: 3,
			step: .25,
			value: 1,
			format: (v) => `${v}×`
		},
		{
			key: "encoding",
			label: "Glyphs",
			type: "select",
			choices: [
				["matrix", "Matrix"],
				["binary", "Binary"],
				["hexadecimal", "Hexadecimal"],
				["decimal", "Decimal"],
				["dna", "DNA"]
			],
			value: "matrix"
		},
		{
			key: "fog",
			label: "Fog",
			type: "toggle",
			value: true
		},
		{
			key: "waves",
			label: "Waves",
			type: "toggle",
			value: true
		}
	],
	create: (context, settings) => {
		const cell = 96;
		let options = settings;
		let glyphs = encodings[options.encoding];
		let atlas = null;
		let strips = [];
		let width = 0;
		let height = 0;
		let last = 0;
		const configure = (next) => {
			if (next.encoding !== options.encoding || !strips.length) {
				glyphs = encodings[next.encoding];
				atlas = null;
				strips = [];
			}
			options = next;
			while (strips.length < options.density) strips.push(newStrip(glyphs.length));
			strips.length = options.density;
		};
		const draw = () => {
			context.globalCompositeOperation = "source-over";
			context.globalAlpha = 1;
			context.fillStyle = "#000";
			context.fillRect(0, 0, width, height);
			context.globalCompositeOperation = "lighter";
			const focal = height / 2 / Math.tan(40 * Math.PI / 180);
			const glyph = (g, x, y, z, brightness) => {
				const changing = g < 0;
				if (changing) brightness *= 1.5;
				if (options.fog) brightness *= .2 + (z / GRID_DEPTH + .5) * .8;
				if (z > GRID_DEPTH / 2) {
					const ratio = (z - GRID_DEPTH / 2) / (GRID_DEPTH * SPLASH_RATIO - GRID_DEPTH / 2);
					brightness *= ramp[Math.min(21, Math.max(0, Math.floor(ratio * WAVE_SIZE)))];
				}
				const top = y + 1;
				const depth = 25 - z;
				if (depth < 1) return;
				const scale = focal / depth;
				const sx = width / 2 + x * scale;
				const sy = height / 2 - top * scale;
				if (scale < 2 || sx > width || sy > height || sx + scale < 0 || sy + scale < 0) return;
				context.globalAlpha = Math.min(1, brightness);
				const index = Math.abs(g) - 1;
				const size = scale * PAD;
				const offset = (size - scale) / 2;
				context.drawImage(atlas, index * cell, changing ? cell : 0, cell, cell, sx - offset, sy - offset, size, size);
			};
			for (const s of strips) {
				s.glyphs.forEach((g, i) => {
					const passed = s.erasing ? s.spinnerY < i : s.spinnerY >= i;
					if (!g || !passed) return;
					const wave = WAVE_SIZE - (i + (GRID_SIZE - s.wavePosition)) % WAVE_SIZE;
					glyph(g, s.x, s.y - i, s.z, options.waves ? ramp[Math.min(wave, 21)] : 1);
				});
				if (!s.erasing) glyph(s.spinnerGlyph, s.x, s.y - s.spinnerY, s.z, 1);
			}
		};
		configure(settings);
		return {
			configure,
			resize: (w, h) => {
				width = w;
				height = h;
				last = performance.now();
			},
			frame: (now) => {
				const tick = TICK / options.speed;
				if (now - last < tick) return;
				const ticks = Math.min(3, Math.floor((now - last) / tick));
				last = now;
				for (let n = 0; n < ticks; n++) strips.forEach((s) => tickStrip(s, glyphs.length));
				atlas ??= buildAtlas(glyphs, cell);
				draw();
			}
		};
	}
};
//#endregion
//#region src/shell/backgrounds/substrate.js
var STEP = .42;
var EMPTY = 10001;
var palettes$1 = {
	nord: [
		"#8fbcbb",
		"#88c0d0",
		"#81a1c1",
		"#5e81ac",
		"#bf616a",
		"#d08770",
		"#ebcb8b",
		"#a3be8c",
		"#b48ead"
	],
	frost: [
		"#8fbcbb",
		"#88c0d0",
		"#81a1c1",
		"#5e81ac"
	],
	aurora: [
		"#bf616a",
		"#d08770",
		"#ebcb8b",
		"#a3be8c",
		"#b48ead"
	]
};
var BACKGROUND$2 = "#2e3440";
var FOREGROUND = "#d8dee9";
var rgbCache = /* @__PURE__ */ new Map();
var rgbOf = (hex) => rgbCache.get(hex) ?? rgbCache.set(hex, [
	1,
	3,
	5
].map((i) => parseInt(hex.slice(i, i + 2), 16))).get(hex);
var frand = (n) => Math.random() * n;
var random$1 = (n) => Math.floor(Math.random() * n);
var radians = (degrees) => degrees * Math.PI / 180;
var substrate_default = {
	name: "Substrate",
	credit: "Ported from Substrate by J. Tarbell and Mike Kershaw, part of xscreensaver",
	ratio: (pixels, { detail }) => detail === "sharp" ? pixels : detail === "balanced" ? Math.min(pixels, 1.5) : 1,
	options: [
		{
			key: "growthDelay",
			label: "Growth delay",
			type: "range",
			min: 0,
			max: 50,
			step: 1,
			value: 18,
			format: (v) => `${v} ms`
		},
		{
			key: "initialCracks",
			label: "Initial cracks",
			type: "range",
			min: 3,
			max: 20,
			step: 1,
			value: 3
		},
		{
			key: "maxCracks",
			label: "Max cracks",
			type: "range",
			min: 11,
			max: 300,
			step: 1,
			value: 100
		},
		{
			key: "sandGrains",
			label: "Sand grains",
			type: "range",
			min: 2,
			max: 256,
			step: 1,
			value: 64
		},
		{
			key: "circlePercent",
			label: "Circular cracks",
			type: "range",
			min: 0,
			max: 100,
			step: 1,
			value: 33,
			format: (v) => `${v}%`
		},
		{
			key: "maxCycles",
			label: "Restart after",
			type: "range",
			min: 0,
			max: 5e4,
			step: 1e3,
			value: 1e4,
			format: (v) => v ? `${v} cycles` : "never"
		},
		{
			key: "palette",
			label: "Colours",
			type: "select",
			choices: [
				["nord", "Frost and aurora"],
				["frost", "Frost"],
				["aurora", "Aurora"]
			],
			value: "nord"
		},
		{
			key: "wireframe",
			label: "Wireframe",
			type: "toggle",
			value: false
		},
		{
			key: "seamless",
			label: "Seamless",
			type: "toggle",
			value: false
		},
		{
			key: "detail",
			label: "Detail",
			type: "select",
			choices: [
				["balanced", "Balanced"],
				["sharp", "Sharp (slow on big screens)"],
				["original", "Original"]
			],
			value: "balanced"
		}
	],
	create: (context, settings) => {
		let f = settings;
		let width = 0;
		let height = 0;
		let cgrid = /* @__PURE__ */ new Int32Array(0);
		let cracks = [];
		let cycles = 0;
		let last = 0;
		let pace = 1;
		let owed = 0;
		let style = null;
		let pixelsOf = null;
		const plot = (x, y, colour, alpha) => {
			if (x < 0 || x >= width || y < 0 || y >= height) return;
			const a = Math.min(1, alpha);
			if (pixelsOf) {
				const data = pixelsOf.data;
				const i = (y * width + x) * 4;
				const [r, g, b] = rgbOf(colour);
				data[i] += (r - data[i]) * a;
				data[i + 1] += (g - data[i + 1]) * a;
				data[i + 2] += (b - data[i + 2]) * a;
				return;
			}
			context.globalAlpha = a;
			if (colour !== style) context.fillStyle = style = colour;
			context.fillRect(x, y, 1, 1);
		};
		const startCrack = (cr) => {
			let px = 0;
			let py = 0;
			let found = false;
			let timeout = 0;
			while (!found && timeout++ < 1e4) {
				px = random$1(width);
				py = random$1(height);
				if (cgrid[py * width + px] < 1e4) found = true;
			}
			if (!found) {
				px = Math.min(width - 1, Math.max(0, Math.trunc(cr.x)));
				py = Math.min(height - 1, Math.max(0, Math.trunc(cr.y)));
				cgrid[py * width + px] = cr.t;
			}
			let a = cgrid[py * width + px];
			if (random$1(100) < 50) a -= 90 + (frand(4.1) - 2);
			else a += 90 + (frand(4.1) - 2);
			if (random$1(100) < f.circlePercent) {
				cr.curved = true;
				cr.degreesDrawn = 0;
				let r = 10 + random$1(Math.floor((width + height) / 2));
				if (random$1(100) < 50) r *= -1;
				const radianInc = STEP / r;
				cr.tInc = radianInc * 360 / 2 / Math.PI;
				cr.ys = r * Math.sin(radianInc);
				cr.xs = r * (1 - Math.cos(radianInc));
			} else cr.curved = false;
			cr.x = px + .61 * Math.cos(radians(a));
			cr.y = py + .61 * Math.sin(radians(a));
			cr.t = a;
		};
		const makeCrack = () => {
			if (cracks.length >= f.maxCracks) return;
			const colours = palettes$1[f.palette];
			const cr = {
				sandp: 0,
				sandg: frand(.2) - .01,
				sandcolor: colours[random$1(colours.length)],
				curved: false,
				degreesDrawn: 0,
				x: random$1(width),
				y: random$1(height),
				t: random$1(360)
			};
			startCrack(cr);
			cracks.push(cr);
		};
		const regionColor = (cr) => {
			let rx = cr.x;
			let ry = cr.y;
			const sx = .81 * Math.sin(radians(cr.t));
			const sy = .81 * Math.cos(radians(cr.t));
			for (let steps = (width + height) * 4; steps > 0; steps--) {
				rx += sx;
				ry -= sy;
				let cx = Math.trunc(rx);
				let cy = Math.trunc(ry);
				if (f.seamless) {
					cx %= width;
					cy %= height;
				}
				if (cx < 0 || cx >= width || cy < 0 || cy >= height) break;
				if (cgrid[cy * width + cx] <= 1e4) break;
			}
			cr.sandg = Math.min(1, Math.max(0, cr.sandg + frand(.1) - .05));
			const grains = f.sandGrains;
			const w = cr.sandg / (grains - 1);
			for (let i = 0; i < grains; i++) {
				const s = Math.sin(cr.sandp + Math.sin(i * w));
				let drawx = cr.x + (rx - cr.x) * s;
				let drawy = cr.y + (ry - cr.y) * s;
				if (f.seamless) {
					drawx = (drawx + width) % width;
					drawy = (drawy + height) % height;
				}
				plot(Math.trunc(drawx), Math.trunc(drawy), cr.sandcolor, .1 - i / (grains * 10));
			}
		};
		const restartCrack = (cr) => {
			startCrack(cr);
			makeCrack();
		};
		const moveDrawCrack = (cr) => {
			if (!cr.curved) {
				cr.x += STEP * Math.cos(radians(cr.t));
				cr.y += STEP * Math.sin(radians(cr.t));
			} else {
				cr.x += cr.ys * Math.cos(radians(cr.t));
				cr.y += cr.ys * Math.sin(radians(cr.t));
				cr.x += cr.xs * Math.cos(radians(cr.t) - Math.PI / 2);
				cr.y += cr.xs * Math.sin(radians(cr.t) - Math.PI / 2);
				cr.t += cr.tInc;
				cr.degreesDrawn += Math.abs(cr.tInc);
			}
			if (f.seamless) {
				cr.x = (cr.x + width) % width;
				cr.y = (cr.y + height) % height;
			}
			let cx = Math.trunc(cr.x + frand(.66) - .33);
			let cy = Math.trunc(cr.y + frand(.66) - .33);
			if (f.seamless) {
				cx %= width;
				cy %= height;
			}
			if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
				cr.x = random$1(width);
				cr.y = random$1(height);
				cr.t = random$1(360);
				restartCrack(cr);
				return;
			}
			if (!f.wireframe) regionColor(cr);
			plot(cx, cy, FOREGROUND, 1);
			const here = cy * width + cx;
			if (cr.curved && cr.degreesDrawn > 360) restartCrack(cr);
			else if (cgrid[here] > 1e4 || Math.abs(cgrid[here] - cr.t) < 5) cgrid[here] = Math.trunc(cr.t);
			else if (Math.abs(cgrid[here] - cr.t) > 2) restartCrack(cr);
		};
		const build = () => {
			pixelsOf = null;
			context.globalAlpha = 1;
			context.fillStyle = style = BACKGROUND$2;
			context.fillRect(0, 0, width, height);
			cgrid.fill(EMPTY);
			cracks = [];
			cycles = 0;
			for (let n = 0; n < f.initialCracks; n++) makeCrack();
		};
		return {
			configure: (next) => {
				f = next;
				if (width) build();
			},
			resize: (w, h, pixels = 1) => {
				width = w;
				height = h;
				pace = Math.max(1, pixels);
				owed = 0;
				cgrid = new Int32Array(w * h);
				last = performance.now();
				build();
			},
			frame: (now) => {
				const delay = Math.max(1, f.growthDelay);
				const due = Math.min(8, Math.floor((now - last) / delay));
				if (!due) return;
				last = now - delay > last + due * delay ? now : last + due * delay;
				owed += due * pace;
				for (; owed >= 1; owed--) {
					for (let i = 0; i < cracks.length; i++) moveDrawCrack(cracks[i]);
					if (++cycles >= f.maxCycles * pace && f.maxCycles) build();
				}
			},
			still: (now) => {
				const target = Math.min(3e3, (f.maxCycles || Infinity) * .95) * pace;
				if (cycles >= target) return true;
				pixelsOf ??= context.getImageData(0, 0, width, height);
				while (cycles < target && performance.now() - now < 40) {
					for (let i = 0; i < cracks.length; i++) moveDrawCrack(cracks[i]);
					cycles++;
				}
				context.putImageData(pixelsOf, 0, 0);
				if (cycles < target) return false;
				pixelsOf = null;
				return true;
			}
		};
	}
};
//#endregion
//#region src/shell/backgrounds/truchet.js
var MAXRATIO = 2;
var palettes = {
	accents: [
		"#b58900",
		"#cb4b16",
		"#dc322f",
		"#d33682",
		"#6c71c4",
		"#268bd2",
		"#2aa198",
		"#859900"
	],
	cool: [
		"#6c71c4",
		"#268bd2",
		"#2aa198",
		"#859900"
	],
	warm: [
		"#b58900",
		"#cb4b16",
		"#dc322f",
		"#d33682"
	],
	base: [
		"#586e75",
		"#657b83",
		"#839496",
		"#93a1a1"
	]
};
var BACKGROUND$1 = "#002b36";
var random = (n) => Math.floor(Math.random() * n);
var xarc = (context, x, y, w, h, a1, a2) => {
	const rad = Math.PI / 11520;
	context.moveTo(x + w / 2 + w / 2 * Math.cos(a1 * rad), y + h / 2 - h / 2 * Math.sin(a1 * rad));
	context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, -a1 * rad, -(a1 + a2) * rad, a2 > 0);
};
var line = (context, x1, y1, x2, y2) => {
	context.moveTo(x1, y1);
	context.lineTo(x2, y2);
};
var curve = (context, x, y, w, h, flip) => {
	if (!flip) {
		xarc(context, x - w / 2, y - h / 2, w, h, 0, -5760);
		xarc(context, x + w / 2, y + h / 2, w, h, 11520, -5760);
	} else {
		xarc(context, x + w / 2, y - h / 2, w, h, 17280, -5760);
		xarc(context, x - w / 2, y + h / 2, w, h, 0, 5760);
	}
};
var angle = (context, x, y, w, h, flip) => {
	if (!flip) {
		line(context, x + w / 2, y, x + w, y + h / 2);
		line(context, x, y + h / 2, x + w / 2, y + h);
	} else {
		line(context, x + w / 2, y, x, y + h / 2);
		line(context, x + w, y + h / 2, x + w / 2, y + h);
	}
};
var truchet_default = {
	name: "Truchet",
	credit: "Ported from Truchet by Adrian Likins, part of xscreensaver",
	wallpaper: true,
	ratio: (pixels) => pixels,
	options: [
		{
			key: "minWidth",
			label: "Smallest tile",
			type: "range",
			min: 12,
			max: 256,
			step: 4,
			value: 40
		},
		{
			key: "maxWidth",
			label: "Largest tile",
			type: "range",
			min: 12,
			max: 512,
			step: 4,
			value: 150
		},
		{
			key: "minLineWidth",
			label: "Thinnest line",
			type: "range",
			min: 1,
			max: 48,
			step: 1,
			value: 2
		},
		{
			key: "maxLineWidth",
			label: "Thickest line",
			type: "range",
			min: 2,
			max: 96,
			step: 1,
			value: 25
		},
		{
			key: "curves",
			label: "Curves",
			type: "toggle",
			value: true
		},
		{
			key: "angles",
			label: "Angles",
			type: "toggle",
			value: true
		},
		{
			key: "square",
			label: "Square tiles",
			type: "toggle",
			value: true
		},
		{
			key: "erase",
			label: "Erase each pattern",
			type: "toggle",
			value: true
		},
		{
			key: "eraseCount",
			label: "Layers before erasing",
			type: "range",
			min: 2,
			max: 50,
			step: 1,
			value: 25
		},
		{
			key: "scroll",
			label: "Scroll",
			type: "toggle",
			value: true
		},
		{
			key: "delay",
			label: "Pattern delay",
			type: "range",
			min: .2,
			max: 20,
			step: .2,
			value: 6,
			format: (v) => `${v} s`
		},
		{
			key: "animDelay",
			label: "Scroll step delay",
			type: "range",
			min: 10,
			max: 200,
			step: 5,
			value: 30,
			format: (v) => `${v} ms`
		},
		{
			key: "animStep",
			label: "Scroll step size",
			type: "range",
			min: 1,
			max: 9,
			step: 1,
			value: 1
		},
		{
			key: "palette",
			label: "Colours",
			type: "select",
			choices: [
				["accents", "All accents"],
				["cool", "Violet to green"],
				["warm", "Yellow to magenta"],
				["base", "Base tones"]
			],
			value: "accents"
		},
		{
			key: "opacity",
			label: "Line strength",
			type: "range",
			min: 10,
			max: 100,
			step: 5,
			value: 45,
			format: (v) => `${v}%`
		}
	],
	create: (context, settings) => {
		let f = settings;
		let width = 0;
		let height = 0;
		let pixels = 1;
		let overlap = 0;
		let layers = [];
		let count = 0;
		let scrolling = 0;
		let last = 0;
		let wait = 0;
		const pattern = () => {
			let linewidth = random(f.maxLineWidth);
			if (linewidth < f.minLineWidth) linewidth = f.minLineWidth;
			if (linewidth % 2) linewidth++;
			let w = random(f.maxWidth);
			let h = random(f.maxWidth);
			if (w === 0 || h === 0) w = h = f.maxWidth;
			if (h < f.minWidth) h = f.minWidth;
			if (w < f.minWidth) w = f.minWidth;
			if (f.square) h = w;
			if (Math.floor(w / h) > MAXRATIO) h = w;
			if (Math.floor(h / w) > MAXRATIO) w = h;
			if (linewidth >= h / 5) linewidth = Math.floor(h / 5);
			linewidth = Math.max(1, linewidth);
			if (f.erase || count >= f.eraseCount) {
				layers = [];
				count = 0;
			}
			overlap = f.scroll ? 400 * pixels : 0;
			const kind = f.angles && (!f.curves || random(2)) ? "angle" : "curve";
			const colours = palettes[f.palette];
			const cols = Math.ceil((width + overlap) / (w * pixels)) + 1;
			const rows = Math.ceil((height + overlap) / (h * pixels)) + 1;
			layers.push({
				kind,
				w: w * pixels,
				h: h * pixels,
				linewidth: linewidth * pixels,
				colour: colours[random(colours.length)],
				cols,
				tiles: Uint8Array.from({ length: cols * rows }, () => random(2))
			});
			count++;
			if (f.scroll) scrolling = Math.floor(overlap / pixels / 4 / f.animStep) * 4;
		};
		const offsetOf = () => {
			if (!f.scroll) return [0, 0];
			const offset = overlap / 2;
			const scroll = overlap / pixels / 4;
			const legs = Math.max(1, Math.floor(scroll / f.animStep));
			const direction = Math.floor(scrolling / legs);
			const progress = scrolling % legs * f.animStep;
			let x = direction & 1 ? progress - scroll : -progress;
			let y = direction & 1 ? progress : progress - scroll;
			if (direction & 2) {
				x = -x;
				y = -y;
			}
			return [x * pixels + offset, y * pixels + offset];
		};
		const draw = () => {
			const [ox, oy] = offsetOf();
			context.globalAlpha = 1;
			context.fillStyle = BACKGROUND$1;
			context.fillRect(0, 0, width, height);
			context.globalAlpha = f.opacity / 100;
			context.lineCap = "round";
			context.lineJoin = "round";
			for (const layer of layers) {
				const { w, h, cols, tiles } = layer;
				const tile = layer.kind === "curve" ? curve : angle;
				context.strokeStyle = layer.colour;
				context.lineWidth = layer.linewidth;
				context.beginPath();
				const x0 = Math.max(0, Math.floor(ox / w) - 1);
				const y0 = Math.max(0, Math.floor(oy / h) - 1);
				const x1 = Math.min(cols, Math.ceil((ox + width) / w) + 1);
				const y1 = Math.min(tiles.length / cols, Math.ceil((oy + height) / h) + 1);
				for (let cy = y0; cy < y1; cy++) for (let cx = x0; cx < x1; cx++) tile(context, cx * w - ox, cy * h - oy, w, h, tiles[cy * cols + cx]);
				context.stroke();
			}
			context.globalAlpha = 1;
		};
		const restart = () => {
			layers = [];
			count = 0;
			scrolling = 0;
			pattern();
			wait = f.scroll ? f.animDelay : f.delay * 1e3;
			draw();
		};
		return {
			configure: (next) => {
				f = next;
				if (width) restart();
			},
			resize: (w, h, scale = 1) => {
				width = w;
				height = h;
				pixels = scale;
				last = performance.now();
				restart();
			},
			frame: (now) => {
				if (now - last < wait) return;
				last = now;
				if (scrolling) {
					scrolling--;
					wait = f.animDelay;
				} else {
					pattern();
					wait = f.scroll ? f.animDelay : f.delay * 1e3;
				}
				draw();
			},
			still: () => {
				scrolling = 0;
				draw();
				return true;
			}
		};
	}
};
//#endregion
//#region src/shell/backgrounds/font6x10.js
var bytes = Uint8Array.from(atob("AAFQAAAAAAAAAIAABAh+AAAAAgQIACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAPgAAYcCAAAAAIAACBBgAIBBBIoIAACAQQUIBBBQAKIBBAooAAEAggoEAACAQQKACAAAgEEACAgQAACiAQQKAAABAIIAAAABUAKpHBxAIAJEggAAECAAAAAACBAgAIDMAAIYAACChQQSICAhAAAAAAAIQIOPgj4Y+OHAAAEAIHDgh4cePnxxEcHIkCJEceHHhx8iRIkSJ8cQHBAAIAQAAQAYAQCASAwAAAAAAAAIAAAAAAABhBgkqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKgAgAMAIhBwAcHAAAA4AEACQIQAPAABgYAYMBAgQIKLABQecfPnz4QIKAHhQQIKFAAA4IEFAAhAcECChQoUAABAgoUEEChRgUECChQoAACBBQoEAFAAhUkQIEBQQ0SCAAAQIAPwAAAIECAAgwMABCQAAIKFDipQIECEQgAAAAihhECGICAJEiECAgAQiRFCSIkgQIkQgIkQIkSJEiRIhCJEiRIgRBAEKAAABAABACQBAAAIBAAAAAAAAAgAAAAAAAIEBFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBIAiEIACIkAAAEQAoICDAAB0AACCQAgQIADhw4cOHCiJAgQIDhw4cJIjhw4cOAEyJEARIniIAAAAAAgAAAAAAAAAAABgAAAAAAAgAAAAAAhAARHCrxggQCBDQwIAABAgAAAAAAgQIACEAJ8+IAAAgo+UFFAggEKCAAAAERKAQQosQBESY4cEPggRMiJICSBAgRCAihA2ZIkSJEgEIkSIoUCECAREAAHFhw0cIHlhgMiENFhxYaWHHiJEiRInwQQISIkSJEiRIkSJEiRIkSJEiRIkSJEiRIkSJEiRIkSIAIPEERQQ4AKiwkAAdABAgQCAInQAAIJJCBAQIRIkSJEiSIECBAgECBAgkyRIkSJEiTIkSJEiRJDhw4cOHDxw4cOHDBgwYOLDhw4cOADyJEiRIniIA+VJEBx4AfLCAgAAECAAAAAACBAgAIMDCghwIACABQ4IIACAR8+APgAhEIGDEjJYEOGhAggABCFSI4gJPHiB8ICMECpUieInhwQiKKhAgQQEBAAAACZIkyJ4iZCASQQqZImSZkgIIkSIoiCGBAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAhQ4OCACQAyFEjx5kAAPjxwAiNCABwYScumQhEiRIkSJOgePHjwQIECHSpEiRIkRRUiRIkRR4oBAgQIECCokSJEiECBAhEyRIkSJE+TIkSJEiRIkRwqkXHDwAQkPOHA8e/AAH4AAPcP34gMwKPiAAAIAPhRRUAIBCggAAAEEQggCfAmQhECAABD4IIWPiSAkgQJkQgIoQIkyJAiUAhCIoqKCCBAIEAAAB5EgRPiCJEIBOBCpEiRIkBwgiKKhCYQEECACJEiRIkSJEiRIkSJEiRIkSJEiRIkSJEiRIkSJEiACFBAo+EEgCoAkBAGQAAIAAACIUAAAAAkGFDEHz58+fPniBAgQIBAgQIJJkSJEiRCGSJEiRCECQ8ePHjx4+gfPnz4QIECESJEiRIkQBUiRIkSZEmACFR4QSIABBAIAECAAgAAAAAAgQAECAAAoQJAAAAAUOKkgAQIRCBgAQgKCECIIiREEQQQMCABABAiJIiSBAiRCEiRAiRIkCpIiEIijZEIQEAQQAAAImSJMgIHkQgEkEKkSJkmQAiSYoqKGiAgQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIUEjggQOAIjxIAARAAAgAAAMhQAAAPEgoEUiRIkSJEiSIkCBAgECBAgkiRIkSJEUZIkSJEIQIkSJEiRIkiJAgQIBAgQIRIkSJEiRCGSZMmTGkRpUAKhBhw4AfEAgAQIACAAAA/ACBAAQIfPiiBYAACABQQkNAAhAAAEADiAQ+fHAhw4QOGDggEAICDiJ4cePkBxEcMInyJEcQHERwQcEIkQh8cBHAAAAeWHDRwgCRHCSI4iRHFhpA8GGhBRECfBhBgAqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKlSpUqVKgAg8sRCBAIAcACQAA4AAPgAAAsFAAAAAkHgjxxEiRIkSJOcfPnz44cOHHiI4cOHDiI4cOHDghAsPHjx48ePnDhw4cOHDhw4iOHDhw4AeGjRo0CeAgABUEEEiAAAQCABAgAIAAAAAAIEABAgAAAAAAAAAAAAAAAAAAAAAgAEAAAAAAAAAAAAAEEAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAPgAAAAAAACIAAJAAAAAAQAgAAAAAAACIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAIAHAAAAAAAAAAAAAAACAAACAAAACHBAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAACJAiAACoQQSIAAB4IAECAAgAAAAH4gQAECAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAYAAAAABACAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAHEBw="), (c) => c.charCodeAt(0));
var pixel = (c, x, y) => {
	const bit = c * 7 + x;
	return bytes[y * 224 + (bit >> 3)] >> 7 - (bit & 7) & 1;
};
//#endregion
//#region \0vite/preload-helper.js
var scriptRel = /* @__PURE__ */ (function detectScriptRel() {
	const relList = typeof document !== "undefined" && document.createElement("link").relList;
	return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
})();
var assetsURL = function(dep, importerUrl) {
	return new URL(dep, importerUrl).href;
};
var seen = {};
var isCssPreloadUrl = function isCssPreloadUrl(url) {
	return url.pathname.endsWith(".css");
};
var preloadOnce = function preloadOnce(seen, href, preload) {
	if (href in seen) return seen[href];
	const promise = preload();
	if (!promise) {
		seen[href] = void 0;
		return;
	}
	const preloadPromise = promise.then(() => {
		seen[href] = void 0;
	}, (err) => {
		seen[href] = void 0;
		throw err;
	});
	seen[href] = preloadPromise;
	return preloadPromise;
};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		let preloadedHrefs;
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return new URL(import.meta.resolve(specifier));
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			);
		}
		promise = allSettled(deps.map((depString) => {
			depString = assetsURL(depString, importerUrl);
			const dep = importMetaResolve(depString);
			const isCss = isCssPreloadUrl(dep);
			return preloadOnce(seen, dep.href, () => {
				if (preloadedHrefs === void 0) {
					preloadedHrefs = {
						all: /* @__PURE__ */ new Set(),
						styles: /* @__PURE__ */ new Set()
					};
					const links = document.getElementsByTagName("link");
					for (let i = links.length - 1; i >= 0; i--) {
						const link = links[i];
						preloadedHrefs.all.add(link.href);
						if (link.rel === "stylesheet") preloadedHrefs.styles.add(link.href);
					}
				}
				if ((isCss ? preloadedHrefs.styles : preloadedHrefs.all).has(dep.href)) return;
				const link = document.createElement("link");
				link.rel = isCss ? "stylesheet" : scriptRel;
				if (!isCss) link.as = "script";
				link.crossOrigin = "";
				link.href = dep.href;
				if (cspNonce) link.setAttribute("nonce", cspNonce);
				document.head.appendChild(link);
				if (isCss) return new Promise((res, rej) => {
					link.addEventListener("load", res);
					link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`)));
				});
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
//#endregion
//#region src/shell/backgrounds/phosphor.js
var BLANK = 0;
var FLARE = 1;
var NORMAL = 2;
var FADE = 3;
var STATE_MAX = FADE;
var CHAR_WIDTH = 6;
var CHAR_HEIGHT = 10;
var BACKGROUND = "#002b36";
var WHITE = "#fdf6e3";
var colours = {
	base1: "#93a1a1",
	cyan: "#2aa198",
	green: "#859900",
	yellow: "#b58900",
	blue: "#268bd2",
	violet: "#6c71c4"
};
var rgb = (hex) => [
	1,
	3,
	5
].map((i) => parseInt(hex.slice(i, i + 2), 16));
var css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
var brightness = ([r, g, b]) => Math.max(r, g, b);
var sources = /* #__PURE__ */ Object.assign({
	"/src/About.jsx": () => __vitePreload(() => import("./About-DEpsAxqj.js").then((m) => m["default"]), [], import.meta.url),
	"/src/BestTime.jsx": () => __vitePreload(() => import("./BestTime-qV8WJr3z.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Button.jsx": () => __vitePreload(() => import("./Button-C8D8-FiQ.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Cell.jsx": () => __vitePreload(() => import("./Cell-GIKddMdx.js").then((m) => m["default"]), [], import.meta.url),
	"/src/CustomField.jsx": () => __vitePreload(() => import("./CustomField-DS_mYmEf.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Dialog.jsx": () => __vitePreload(() => import("./Dialog-BXD_Wy5m.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Digit.jsx": () => __vitePreload(() => import("./Digit-B5rGRU4Q.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Game.jsx": () => __vitePreload(() => import("./Game-CuFEYF5N.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Input.jsx": () => __vitePreload(() => import("./Input-BH3afC1u.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Menu.jsx": () => __vitePreload(() => import("./Menu-CsDqIfnR.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Overlay.jsx": () => __vitePreload(() => import("./Overlay-CBzd_TPF.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Play.jsx": () => __vitePreload(() => import("./Play-DPV83WcB.js").then((m) => m["default"]), [], import.meta.url),
	"/src/Winner.jsx": () => __vitePreload(() => import("./Winner-BcLjHZfV.js").then((m) => m["default"]), [], import.meta.url),
	"/src/app.jsx": () => __vitePreload(() => import("./app-B_1TrhCZ.js").then((m) => m["default"]), [], import.meta.url),
	"/src/hint.js": () => __vitePreload(() => import("./hint-BnxKYGV5.js").then((m) => m["default"]), [], import.meta.url),
	"/src/index.js": () => __vitePreload(() => import("./src-2iRfJ9t-.js").then((m) => m["default"]), [], import.meta.url),
	"/src/mines.js": () => __vitePreload(() => import("./mines-Da7olYdB.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/About.jsx": () => __vitePreload(() => import("./About-C3ovWGOG.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/BackgroundSettings.jsx": () => __vitePreload(() => import("./BackgroundSettings-C7OYl7t1.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/Board.jsx": () => __vitePreload(() => import("./Board-DPSJdVmY.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/Boss.jsx": () => __vitePreload(() => import("./Boss-CgNRzjtu.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/SideButton.jsx": () => __vitePreload(() => import("./SideButton-CAoiUk4E.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/Tabs.jsx": () => __vitePreload(() => import("./Tabs-ClkdhSrf.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/ThemeMenu.jsx": () => __vitePreload(() => import("./ThemeMenu-CjGFC0cl.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/WindowControls.jsx": () => __vitePreload(() => import("./WindowControls-Cz0TNK3C.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/actions.js": () => __vitePreload(() => import("./actions-DphZoY6B.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/backgrounds/hill.js": () => __vitePreload(() => import("./hill-C0RBa6DT.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/backgrounds/index.js": () => __vitePreload(() => import("./backgrounds-DqF45KDc.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/backgrounds/matrix.js": () => __vitePreload(() => import("./matrix-BPjC-X-W.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/backgrounds/substrate.js": () => __vitePreload(() => import("./substrate-PZSDDw_U.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/backgrounds/truchet.js": () => __vitePreload(() => import("./truchet-MOZfSJKS.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/clock.js": () => __vitePreload(() => import("./clock-_tnDKn1R.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/prepaint.js": () => __vitePreload(() => import("./prepaint-BOQns3Rk.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/storage.js": () => __vitePreload(() => import("./storage-Cj0EFyod.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/themes.js": () => __vitePreload(() => import("./themes-DFrkB3pZ.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/worker.js": () => __vitePreload(() => import("./worker-D6fmPkLz.js").then((m) => m["default"]), [], import.meta.url),
	"/src/shell/zoom.js": () => __vitePreload(() => import("./zoom-C_qZLAIo.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/About.jsx": () => __vitePreload(() => import("./About-Di5OkK2F.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/BestTimes.jsx": () => __vitePreload(() => import("./BestTimes-CO-gWBZY.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/Cell.jsx": () => __vitePreload(() => import("./Cell-B28BFMy2.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/Game.jsx": () => __vitePreload(() => import("./Game-BPUyXzE6.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/Menu.jsx": () => __vitePreload(() => import("./Menu-C4C3lgHN.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/Prompt.jsx": () => __vitePreload(() => import("./Prompt-zY7l38Ey.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/app.jsx": () => __vitePreload(() => import("./app-zf0-JfD5.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/deal.js": () => __vitePreload(() => import("./deal-CXGq3ded.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/deal.worker.js": () => __vitePreload(() => import("./deal.worker-CZDca1Jh.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/generate.js": () => __vitePreload(() => import("./generate-Dikzn-tm.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/hint.js": () => __vitePreload(() => import("./hint-CdZRjkO5.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/index.js": () => __vitePreload(() => import("./takuzu-AO7c84x8.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/rain.js": () => __vitePreload(() => import("./rain-Dc-4LR4I.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/rules.js": () => __vitePreload(() => import("./rules-OtVkdrpA.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/solver.js": () => __vitePreload(() => import("./solver-DSUf_BR0.js").then((m) => m["default"]), [], import.meta.url),
	"/src/takuzu/techniques.js": () => __vitePreload(() => import("./techniques-C0hPPQel.js").then((m) => m["default"]), [], import.meta.url)
});
var texts = null;
var loadTexts = () => texts ??= Promise.all(Object.entries(sources).map(async ([path, load]) => ({
	name: path.slice(1),
	text: await load()
})));
var runCache = /* @__PURE__ */ new Map();
var runsOf = (c, inverted) => {
	const key = c * 2 + (inverted ? 1 : 0);
	if (runCache.has(key)) return runCache.get(key);
	const runs = [];
	for (let y = 0; y < 10; y++) for (let x1 = 0; x1 < 7; x1++) {
		if (!(pixel(c, x1, y) ^ inverted)) continue;
		let x2 = x1;
		while (x2 + 1 < 7 && pixel(c, x2 + 1, y) ^ inverted) x2++;
		runs.push([
			y,
			x1,
			x2
		]);
		x1 = x2;
	}
	runCache.set(key, runs);
	return runs;
};
var phosphor_default = {
	name: "Phosphor",
	credit: "Ported from Phosphor by Jamie Zawinski, part of xscreensaver",
	wallpaper: true,
	ratio: (pixels) => pixels,
	options: [
		{
			key: "scale",
			label: "Scale",
			type: "range",
			min: 2,
			max: 12,
			step: 1,
			value: 6
		},
		{
			key: "ticks",
			label: "Fade",
			type: "range",
			min: 4,
			max: 40,
			step: 1,
			value: 20
		},
		{
			key: "delay",
			label: "Typing delay",
			type: "range",
			min: 10,
			max: 200,
			step: 5,
			value: 50,
			format: (v) => `${v} ms`
		},
		{
			key: "cursor",
			label: "Cursor blink",
			type: "range",
			min: 100,
			max: 1e3,
			step: 1,
			value: 333,
			format: (v) => `${v} ms`
		},
		{
			key: "colour",
			label: "Colour",
			type: "select",
			choices: [
				["cyan", "Cyan"],
				["base1", "Grey"],
				["green", "Green"],
				["yellow", "Yellow"],
				["blue", "Blue"],
				["violet", "Violet"]
			],
			value: "cyan"
		},
		{
			key: "brightness",
			label: "Brightness",
			type: "range",
			min: 10,
			max: 100,
			step: 5,
			value: 55,
			format: (v) => `${v}%`
		}
	],
	create: (context, settings) => {
		let f = settings;
		let width = 0;
		let height = 0;
		let pixels = 1;
		let scale = 6;
		let gridWidth = 0;
		let gridHeight = 0;
		let ticks = 0;
		let gcs = [];
		let chars = /* @__PURE__ */ new Uint8Array(0);
		let states = /* @__PURE__ */ new Uint8Array(0);
		let changed = /* @__PURE__ */ new Uint8Array(0);
		let tty = /* @__PURE__ */ new Uint8Array(0);
		let x = 0;
		let y = 0;
		let cursorX = 0;
		let cursorY = 0;
		let cursorOn = true;
		let cursorAt = 0;
		let queue = "$ ";
		let last = 0;
		const colour = () => {
			const bg = rgb(BACKGROUND);
			const dim = (hex) => rgb(hex).map((ch, i) => bg[i] + (ch - bg[i]) * f.brightness / 100);
			const fg = dim(colours[f.colour]);
			ticks = STATE_MAX + f.ticks;
			const ncolors = Math.max(1, ticks - 3);
			const start = fg.map((ch, i) => (ch * 100 + bg[i] * 156) / 256);
			const ramp = Array.from({ length: ncolors }, (_, i) => css(start.map((ch, j) => ch + (bg[j] - ch) * i / ncolors)));
			ticks = ncolors + STATE_MAX;
			gcs = [
				BACKGROUND,
				css(brightness(bg) <= brightness(fg) ? dim(WHITE) : fg),
				css(fg),
				...ramp
			];
		};
		const drawCell = (cx, cy) => {
			const i = cy * gridWidth + cx;
			let st = states[i];
			let c = chars[i];
			let inverted = false;
			const cursor = cx === cursorX && cy === cursorY;
			if (cursor) {
				if (cursorOn) inverted = true;
				if (st >= FADE) c = 32;
				if (st === BLANK || st >= FADE) st = NORMAL;
			}
			const w = CHAR_WIDTH * scale;
			const h = CHAR_HEIGHT * scale;
			const tx = cx * w;
			const ty = cy * h;
			context.fillStyle = BACKGROUND;
			context.fillRect(tx, ty, w, h);
			const runs = runsOf(c, inverted);
			if (!runs.length || states[i] === BLANK && !cursor) return;
			const strokeRuns = (lineWidth, style) => {
				context.lineCap = "round";
				context.lineWidth = lineWidth;
				context.strokeStyle = style;
				context.beginPath();
				for (const [row, x1, x2] of runs) {
					context.moveTo(tx + x1 * scale + scale / 2, ty + row * scale);
					context.lineTo(tx + x2 * scale + scale / 2, ty + row * scale);
				}
				context.stroke();
			};
			context.save();
			context.beginPath();
			context.rect(tx, ty, w, h);
			context.clip();
			const outer = Math.round(scale * 1.3) === scale ? scale + 1 : Math.round(scale * 1.3);
			const dim = st + 2 < ticks ? gcs[st + 2] : null;
			strokeRuns(outer, dim || gcs[st]);
			if (dim) strokeRuns(Math.max(1, Math.min(scale - 1, Math.round(scale * .8))), gcs[st]);
			context.restore();
		};
		const update = () => {
			for (let i = 0; i < changed.length; i++) {
				if (!changed[i]) continue;
				drawCell(i % gridWidth, Math.floor(i / gridWidth));
				changed[i] = 0;
			}
		};
		const decay = () => {
			for (let i = 0; i < states.length; i++) if (states[i] === FLARE) {
				states[i] = NORMAL;
				changed[i] = 1;
			} else if (states[i] >= FADE) {
				states[i]++;
				if (states[i] >= ticks) {
					states[i] = BLANK;
					chars[i] = 32;
				}
				changed[i] = 1;
			}
		};
		const newline = () => {
			x = 0;
			if (++y < gridHeight) return;
			y = gridHeight - 1;
			tty.copyWithin(0, gridWidth);
			tty.fill(32, (gridHeight - 1) * gridWidth);
		};
		const ttyPrint = (code) => {
			if (code === 10) return newline();
			if (code === 13) return x = 0;
			if (code === 9) {
				do
					ttyPrint(32);
				while (x % 8 && x < gridWidth);
				return;
			}
			if (code < 32) return;
			if (x >= gridWidth) newline();
			tty[y * gridWidth + x++] = code > 255 ? 63 : code;
		};
		const printChar = (code) => {
			ttyPrint(code);
			for (let i = 0; i < tty.length; i++) if (!!runsOf(chars[i], false).length && tty[i] === 32) {
				if (states[i] === FLARE || states[i] === NORMAL) states[i] = FADE;
				changed[i] = 1;
			} else if (chars[i] !== tty[i] || states[i] >= FADE) {
				states[i] = NORMAL;
				changed[i] = 1;
				chars[i] = tty[i];
			}
			const cx = Math.min(x, gridWidth - 1);
			if (cursorX !== cx || cursorY !== y) {
				changed[cursorY * gridWidth + cursorX] = 1;
				const next = y * gridWidth + cx;
				if (states[next] >= FADE) chars[next] = 32;
				states[next] = FLARE;
				changed[next] = 1;
				cursorX = cx;
				cursorY = y;
				cursorOn = true;
				cursorAt = performance.now() + 2 * f.cursor;
			}
		};
		const refill = () => {
			loadTexts().then((files) => {
				if (queue.length > 2) return;
				const { name, text } = files[Math.floor(Math.random() * files.length)];
				queue += `cat ${name}\n${text.replace(/\r\n/g, "\n")}\n$ `;
			});
		};
		const build = () => {
			scale = f.scale * pixels;
			gridWidth = Math.max(1, Math.floor(width / (CHAR_WIDTH * scale)));
			gridHeight = Math.max(1, Math.floor(height / (CHAR_HEIGHT * scale)));
			const size = gridWidth * gridHeight;
			chars = new Uint8Array(size).fill(32);
			states = new Uint8Array(size);
			changed = new Uint8Array(size);
			tty = new Uint8Array(size).fill(32);
			x = y = cursorX = cursorY = 0;
			colour();
			context.globalAlpha = 1;
			context.fillStyle = BACKGROUND;
			context.fillRect(0, 0, width, height);
			changed[0] = 1;
		};
		return {
			configure: (next) => {
				f = next;
				if (width) build();
			},
			resize: (w, h, scale = 1) => {
				width = w;
				height = h;
				pixels = scale;
				last = performance.now();
				build();
			},
			frame: (now) => {
				if (now >= cursorAt) {
					cursorOn = !cursorOn;
					cursorAt = now + (cursorOn ? 2 : 1) * f.cursor;
					changed[cursorY * gridWidth + cursorX] = 1;
				}
				const due = Math.min(8, Math.floor((now - last) / f.delay));
				for (let n = 0; n < due; n++) {
					update();
					decay();
					if (queue.length < 2) refill();
					if (queue) {
						printChar(queue.charCodeAt(0));
						queue = queue.slice(1);
					}
				}
				if (due) last = now - (now - last) % f.delay;
				update();
			}
		};
	}
};
//#endregion
//#region src/shell/backgrounds/hill.webp
var hill_default$1 = new URL("hill.webp", import.meta.url).href;
//#endregion
//#region src/shell/backgrounds/ridge.json
var ridge_default = [
	[0, .0057],
	[.0208, .0069],
	[.0417, .0082],
	[.0625, .0095],
	[.0834, .0108],
	[.1042, .0121],
	[.1251, .0133],
	[.1459, .0144],
	[.1667, .0155],
	[.1876, .0164],
	[.2084, .0172],
	[.2293, .0179],
	[.2501, .0185],
	[.2709, .019],
	[.2918, .0194],
	[.3126, .0197],
	[.3335, .02],
	[.3543, .0202],
	[.3752, .0205],
	[.396, .0207],
	[.4168, .021],
	[.4377, .0213],
	[.4585, .0217],
	[.4794, .0222],
	[.5002, .0229],
	[.5211, .0237],
	[.5419, .0247],
	[.5627, .0259],
	[.5836, .0272],
	[.6044, .0288],
	[.6253, .0307],
	[.6461, .0327],
	[.6669, .035],
	[.6878, .0375],
	[.7086, .0403],
	[.7295, .0432],
	[.7503, .0464],
	[.7712, .0497],
	[.792, .0531],
	[.8128, .0566],
	[.8337, .0601],
	[.8545, .0636],
	[.8754, .067],
	[.8962, .0703],
	[.917, .0733],
	[.9379, .0759],
	[.9587, .0781],
	[.9796, .0797],
	[1, .0806]
];
//#endregion
//#region src/shell/backgrounds/hill.js
var HILL_WIDTH = 2400;
var HILL_HEIGHT = 851;
var RIDGE = .53;
var sky = [
	[0, "#4279ee"],
	[.2, "#3d76ee"],
	[.3, "#4e84f1"],
	[.42, "#84a8f2"],
	[.56, "#96b2f2"]
];
var hash = (x, y, seed) => {
	const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
	return n - Math.floor(n);
};
var smooth = (t) => t * t * (3 - 2 * t);
var noise = (x, y, seed) => {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const u = smooth(x - xi);
	const v = smooth(y - yi);
	const a = hash(xi, yi, seed);
	const b = hash(xi + 1, yi, seed);
	const c = hash(xi, yi + 1, seed);
	const d = hash(xi + 1, yi + 1, seed);
	return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
var fbm = (x, y, seed) => {
	let sum = 0;
	let amp = .5;
	for (let octave = 0; octave < 5; octave++) {
		sum += amp * noise(x, y, seed + octave * 13);
		x *= 2.03;
		y *= 2.03;
		amp /= 2;
	}
	return sum;
};
var SPRITE_WIDTH = 384;
var SPRITE_HEIGHT = 128;
var makeCloud = (seed, kind) => {
	const canvas = document.createElement("canvas");
	canvas.width = SPRITE_WIDTH;
	canvas.height = SPRITE_HEIGHT;
	const context = canvas.getContext("2d");
	if (!context) return null;
	const image = context.createImageData(SPRITE_WIDTH, SPRITE_HEIGHT);
	for (let y = 0; y < SPRITE_HEIGHT; y++) for (let x = 0; x < SPRITE_WIDTH; x++) {
		const dx = x / SPRITE_WIDTH * 2 - 1;
		const dy = y / SPRITE_HEIGHT * 2 - 1;
		const i = (y * SPRITE_WIDTH + x) * 4;
		let alpha;
		let shade;
		if (kind === "cirrus") {
			const falloff = Math.max(0, 1 - dx * dx - dy * dy * 2);
			const n = fbm(x / SPRITE_WIDTH * 2.5, y / SPRITE_HEIGHT * 9, seed);
			alpha = Math.min(1, Math.max(0, (n - .42) * 3)) * falloff;
			shade = 252;
		} else {
			const falloff = Math.max(0, 1 - dx * dx - dy * dy * (dy > 0 ? 4 : 1.1));
			const n = fbm(x / SPRITE_WIDTH * 4, y / SPRITE_HEIGHT * 2.6, seed);
			alpha = Math.min(1, Math.max(0, (n * falloff - .14) * 5));
			shade = 255 - 55 * Math.max(0, dy + .15) * Math.min(1, alpha * 1.5);
		}
		image.data[i] = shade - 10;
		image.data[i + 1] = shade - 5;
		image.data[i + 2] = shade;
		image.data[i + 3] = alpha * 255;
	}
	context.putImageData(image, 0, 0);
	return canvas;
};
var kinds = [
	"cumulus",
	"cumulus",
	"cumulus",
	"cumulus",
	"cirrus",
	"cirrus"
];
var hillLayout = (width, height) => {
	const scale = Math.max(width / HILL_WIDTH, height * .47 / HILL_HEIGHT);
	const w = HILL_WIDTH * scale;
	return {
		x: (width - w) / 2,
		y: height * RIDGE,
		w,
		h: HILL_HEIGHT * scale
	};
};
//#endregion
//#region src/shell/backgrounds/index.js
var backgrounds = {
	matrix: matrix_default,
	substrate: substrate_default,
	truchet: truchet_default,
	phosphor: phosphor_default,
	hill: {
		name: "Hill",
		credit: "Hill from a CC0 photo of Cattle Hill, Roedean by Hassocks5489, colour matched to Bliss, under a sky drawn live",
		wallpaper: true,
		animated: false,
		ratio: (pixels) => pixels,
		options: [
			{
				key: "wind",
				label: "Wind speed",
				type: "range",
				min: .25,
				max: 4,
				step: .25,
				value: 1,
				format: (v) => `${v}×`
			},
			{
				key: "cover",
				label: "Cloud cover",
				type: "range",
				min: 0,
				max: 100,
				step: 5,
				value: 35,
				format: (v) => `${v}%`
			},
			{
				key: "shadows",
				label: "Cloud shadows",
				type: "toggle",
				value: true
			}
		],
		create: (context, settings) => {
			let f = settings;
			let width = 0;
			let height = 0;
			let last = 0;
			const hill = new Image();
			hill.src = hill_default$1;
			let shape = null;
			const sprites = {
				cumulus: [],
				cirrus: []
			};
			let made = 0;
			let clouds = [];
			const layers = [
				{
					top: .38,
					bottom: .47,
					size: .35,
					alpha: .95,
					speed: 3,
					kind: "cumulus"
				},
				{
					top: .15,
					bottom: .32,
					size: .7,
					alpha: .95,
					speed: 7,
					kind: "cumulus"
				},
				{
					top: 0,
					bottom: .14,
					size: 1.6,
					alpha: .6,
					speed: 10,
					kind: "cirrus"
				}
			];
			const spriteOf = (cloud) => {
				const list = sprites[cloud.layer.kind];
				return list[cloud.sprite % list.length];
			};
			const scatter = () => {
				const count = Math.round(f.cover / 100 * 18);
				clouds = Array.from({ length: count }, (_, i) => {
					const layer = layers[i % layers.length];
					return {
						layer,
						sprite: i,
						x: Math.random(),
						y: layer.top + Math.random() * (layer.bottom - layer.top),
						stretch: .7 + Math.random() * .8
					};
				});
			};
			const outline = () => {
				const { x, y, w, h } = hillLayout(width, height);
				const path = new Path2D();
				path.moveTo(x, height);
				for (const [px, py] of ridge_default) path.lineTo(x + px * w, y + py * h);
				path.lineTo(x + w, height);
				path.closePath();
				return path;
			};
			const cloudBox = (cloud) => {
				const w = width / 3 * cloud.layer.size * cloud.stretch;
				const h = w * SPRITE_HEIGHT / SPRITE_WIDTH;
				const span = width + w;
				return {
					x: cloud.x * span % span - w,
					y: cloud.y * height,
					w,
					h
				};
			};
			const draw = () => {
				const gradient = context.createLinearGradient(0, 0, 0, height * RIDGE);
				for (const [stop, colour] of sky) gradient.addColorStop(stop / sky[sky.length - 1][0], colour);
				context.globalAlpha = 1;
				context.fillStyle = gradient;
				context.fillRect(0, 0, width, height);
				for (const cloud of clouds) {
					const sprite = spriteOf(cloud);
					if (!sprite) continue;
					const { x, y, w, h } = cloudBox(cloud);
					context.globalAlpha = cloud.layer.alpha;
					context.drawImage(sprite, x, y, w, h);
				}
				context.globalAlpha = 1;
				if (!hill.complete || !hill.naturalWidth) return;
				const { x, y, w, h } = hillLayout(width, height);
				context.drawImage(hill, x, y, w, h);
				if (f.shadows && shape) {
					context.save();
					context.clip(shape);
					for (const cloud of clouds) {
						if (cloud.layer !== layers[1]) continue;
						const sprite = spriteOf(cloud);
						if (!sprite) continue;
						const box = cloudBox(cloud);
						context.globalAlpha = .18;
						context.globalCompositeOperation = "multiply";
						context.drawImage(sprite, box.x, height * .62 + box.y * .6, box.w * 1.3, box.h * 1.8);
					}
					context.restore();
				}
			};
			return {
				configure: (next) => {
					f = next;
					scatter();
				},
				resize: (w, h) => {
					width = w;
					height = h;
					last = performance.now();
					shape = typeof Path2D === "undefined" ? null : outline();
					if (!clouds.length) scatter();
					draw();
				},
				frame: (now) => {
					if (made < kinds.length) {
						const kind = kinds[made++];
						const sprite = makeCloud(made, kind);
						if (sprite) sprites[kind].push(sprite);
					}
					const seconds = Math.min(.1, (now - last) / 1e3);
					last = now;
					for (const cloud of clouds) cloud.x += cloud.layer.speed * f.wind * seconds / 1e3;
					draw();
				}
			};
		}
	}
};
var themeBackgrounds = {
	classic: "hill",
	matrix: "matrix",
	nord: "substrate",
	solarized: "truchet",
	"solarized-phosphor": "phosphor"
};
var backgroundFor = (theme) => themeBackgrounds[theme] || null;
var optionsOf = (id) => [{
	key: "animated",
	label: "Animated",
	type: "toggle",
	value: backgrounds[id].animated ?? true
}, ...backgrounds[id].options];
var defaults = (id) => Object.fromEntries(optionsOf(id).map((option) => [option.key, option.value]));
var clean = (option, value) => {
	if (option.type === "toggle") return typeof value === "boolean" ? value : option.value;
	if (option.type === "select") return option.choices.some(([choice]) => choice === value) ? value : option.value;
	const number = Number(value);
	if (value === null || value === "" || !Number.isFinite(number)) return option.value;
	return Math.min(option.max, Math.max(option.min, number));
};
var loadSettings = () => {
	let stored = {};
	try {
		stored = JSON.parse(load("backgrounds")) || {};
	} catch {}
	return Object.fromEntries(Object.keys(backgrounds).map((id) => [id, Object.fromEntries(optionsOf(id).map((option) => [option.key, clean(option, stored[id]?.[option.key])]))]));
};
var saveSettings = (settings) => save("backgrounds", JSON.stringify(settings));
var settings = loadSettings();
var instances = {};
var refresh = () => {};
var configure = (id, values) => {
	settings = {
		...settings,
		[id]: values
	};
	instances[id]?.configure(values);
	refresh(id);
};
var startBackgrounds = () => {
	const root = document.documentElement;
	const canvas = document.createElement("canvas");
	canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none";
	document.body.prepend(canvas);
	const context = canvas.getContext("2d");
	let active = null;
	let mode = null;
	let frame = null;
	const loop = (now) => {
		frame = requestAnimationFrame(loop);
		instances[active].frame(now);
	};
	const settle = (now) => {
		if (!instances[active].still(now)) frame = requestAnimationFrame(settle);
	};
	const resize = () => {
		const { ratio, filter } = backgrounds[active];
		const pixels = window.devicePixelRatio || 1;
		const scale = ratio(pixels, settings[active]);
		canvas.width = Math.round(innerWidth * scale);
		canvas.height = Math.round(innerHeight * scale);
		canvas.style.filter = filter ? filter(pixels) : "none";
		instances[active].resize(canvas.width, canvas.height, scale);
	};
	const start = () => {
		cancelAnimationFrame(frame);
		if (mode === "wallpaper") return;
		resize();
		if (!root.dataset.boss) frame = requestAnimationFrame(mode === "animated" ? loop : settle);
	};
	const cover = () => {
		cancelAnimationFrame(frame);
		if (root.dataset.boss || !active || mode === "wallpaper") return;
		frame = requestAnimationFrame(mode === "animated" ? loop : settle);
	};
	const watchPixels = () => {
		matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`).addEventListener("change", () => {
			if (active) start();
			watchPixels();
		}, { once: true });
	};
	const update = (changed) => {
		const id = backgroundFor(root.dataset.theme);
		const still = backgrounds[id]?.wallpaper ? "wallpaper" : "still";
		const next = id && (settings[id].animated ? "animated" : still);
		if (next) root.dataset.background = next;
		else delete root.dataset.background;
		if (id === active && next === mode && changed !== id) return;
		cancelAnimationFrame(frame);
		active = id;
		mode = next;
		canvas.style.display = id && mode !== "wallpaper" ? "block" : "none";
		if (!id) return;
		instances[id] ??= backgrounds[id].create(context, settings[id]);
		start();
	};
	refresh = update;
	new MutationObserver(() => update()).observe(root, {
		attributes: true,
		attributeFilter: ["data-theme"]
	});
	new MutationObserver(cover).observe(root, {
		attributes: true,
		attributeFilter: ["data-boss"]
	});
	window.addEventListener("resize", () => active && start());
	watchPixels();
	update();
};
//#endregion
//#region src/shell/themes.js
var themes = [
	["classic", "Classic"],
	["synthwave", "Synthwave"],
	["solarized", "Solarized Truchet"],
	["solarized-phosphor", "Solarized Phosphor"],
	["matrix", "Matrix"],
	["nord", "Nord"]
];
//#endregion
//#region src/shell/ThemeMenu.jsx
var ThemeMenu = ({ state, actions }, children) => /* @__PURE__ */ h(MenuItem, {
	name: "Theme",
	type: "theme",
	active: state.menu,
	onChange: actions.toggleMenu
}, themes.map(([theme, name]) => /* @__PURE__ */ h(SubMenuItem, {
	name,
	checked: state.theme === theme,
	onClick: () => actions.setTheme(theme)
})), backgroundFor(state.theme) && /* @__PURE__ */ h(Separator, null), backgroundFor(state.theme) && /* @__PURE__ */ h(SubMenuItem, {
	name: "Background Settings...",
	onClick: actions.toggleBackgroundSettings
}), children);
//#endregion
//#region src/Menu.jsx
var SubMenuItem = ({ key, name, hotKey, checked, disabled, onClick }, children) => /* @__PURE__ */ h("li", {
	key,
	class: Menu_module_default.item
}, /* @__PURE__ */ h("button", {
	type: "button",
	class: Menu_module_default.option,
	tabindex: -1,
	disabled,
	onclick: onClick
}, checked && /* @__PURE__ */ h("svg", {
	class: Menu_module_default.check,
	width: "7",
	height: "7"
}, /* @__PURE__ */ h("path", { d: "M0 4.5L2.5 7 7 2.5V0L2.5 4.5 0 2v2.5z" })), name, hotKey && /* @__PURE__ */ h("span", { class: Menu_module_default.hotKey }, hotKey)), children.length > 0 && /* @__PURE__ */ h("div", { class: Menu_module_default.menu }, /* @__PURE__ */ h("ul", { class: Menu_module_default.list }, children)));
var MenuItem = ({ key, name, type, active, onChange }, children) => /* @__PURE__ */ h("li", {
	key,
	class: active && active[type] ? Menu_module_default.columnActive : Menu_module_default.column
}, /* @__PURE__ */ h("button", {
	type: "button",
	class: Menu_module_default.button,
	tabindex: -1,
	"data-name": type,
	onclick: onChange,
	onmouseenter: onChange
}, name), children.length > 0 && /* @__PURE__ */ h("div", { class: Menu_module_default.menu }, /* @__PURE__ */ h("ul", { class: Menu_module_default.list }, children)));
var Separator = () => /* @__PURE__ */ h("li", { class: Menu_module_default.separator });
var Menu = ({ state, actions }) => /* @__PURE__ */ h("ul", {
	class: Menu_module_default.root,
	tabindex: -1,
	onfocusout: actions.toggleMenu
}, /* @__PURE__ */ h(MenuItem, {
	name: "Game",
	type: "game",
	active: state.menu,
	onChange: actions.toggleMenu
}, /* @__PURE__ */ h(SubMenuItem, {
	name: "New",
	hotKey: "F2",
	onClick: () => actions.reset()
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Hint",
	hotKey: "H",
	onClick: () => actions.hint()
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Beginner",
	checked: state.game.level === "beginner",
	onClick: () => actions.reset({ level: "beginner" })
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Intermediate",
	checked: state.game.level === "intermediate",
	onClick: () => actions.reset({ level: "intermediate" })
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Expert",
	checked: state.game.level === "expert",
	onClick: () => actions.reset({ level: "expert" })
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Extreme",
	checked: state.game.level === "extreme",
	onClick: () => actions.reset({ level: "extreme" })
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Custom...",
	checked: state.game.level === "custom",
	onClick: actions.toggleCustomField
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Marks (?)",
	checked: state.marks,
	onClick: actions.toggleMarks
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Safe First Click",
	checked: state.safeStart || state.noGuess,
	onClick: actions.toggleSafeStart
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "No Guessing",
	checked: state.noGuess,
	onClick: actions.toggleNoGuess
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Best Times...",
	onClick: actions.toggleBestTime
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Takuzu",
	onClick: () => location.assign("../takuzu/")
})), /* @__PURE__ */ h(ThemeMenu, {
	state,
	actions
}), /* @__PURE__ */ h(MenuItem, {
	name: "Help",
	type: "help",
	active: state.menu,
	onChange: actions.toggleMenu
}, /* @__PURE__ */ h(SubMenuItem, {
	name: "About Minesweeper Plus...",
	onClick: actions.toggleAbout
})));
var Digit_module_default = {
	root: "Digit_root",
	digit: "Digit_digit",
	t: "Digit_t",
	rt: "Digit_rt",
	rb: "Digit_rb",
	b: "Digit_b",
	lb: "Digit_lb",
	lt: "Digit_lt",
	m: "Digit_m",
	lcdGlitch: "Digit_lcdGlitch",
	lcdBand: "Digit_lcdBand",
	lcdFlicker: "Digit_lcdFlicker"
};
//#endregion
//#region src/Digit.jsx
var Digit = ({ value }) => /* @__PURE__ */ h("div", { class: Digit_module_default.root }, `00${Math.max(-99, Math.min(999, value))}`.slice(-3).split("").sort((a) => a === "-" ? -1 : 0).map((digit) => /* @__PURE__ */ h("svg", {
	class: Digit_module_default.digit,
	width: "13",
	height: "23",
	"data-n": digit
}, /* @__PURE__ */ h("path", {
	class: Digit_module_default.t,
	d: "M1.5 1l3 3h4l3-3h-10z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.rt,
	d: "M12 1.5l-3 3v4l3 3v-10z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.rb,
	d: "M12 11.5l-3 3v4l3 3v-10z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.b,
	d: "M11.5 22l-3-3h-4l-3 3h10z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.lb,
	d: "M1 21.5l3-3v-4l-3-3v10z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.lt,
	d: "M1 1.5v10l3-3v-4l-3-3z"
}), /* @__PURE__ */ h("path", {
	class: Digit_module_default.m,
	d: "M8.5 13h-4L3 11.5 4.5 10h4l1.5 1.5L8.5 13z"
}))));
var Play_module_default = {
	root: "Play_root",
	down: "Play_down",
	up: "Play_up",
	face: "Play_face",
	skin: "Play_skin"
};
//#endregion
//#region src/Play.jsx
var Smile = () => /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("circle", {
	cx: "12",
	cy: "7",
	r: "1.5"
}), /* @__PURE__ */ h("circle", {
	cx: "7",
	cy: "7",
	r: "1.5"
}), /* @__PURE__ */ h("path", { d: "M13.779 11.1a.5.5 0 0 0-.7.1 4.455 4.455 0 0 1-7.158 0 .5.5 0 0 0-.8.6 5.455 5.455 0 0 0 8.752 0 .5.5 0 0 0-.094-.7z" }));
var Afraid = () => /* @__PURE__ */ h("g", null, /* @__PURE__ */ h("circle", {
	cx: "12.5",
	cy: "6.5",
	r: "1.5"
}), /* @__PURE__ */ h("circle", {
	cx: "6.5",
	cy: "6.5",
	r: "1.5"
}), /* @__PURE__ */ h("path", { d: "M9.5 10a2.5 2.5 0 1 0 2.5 2.5A2.5 2.5 0 0 0 9.5 10zm0 4a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 9.5 14z" }));
var Sunglasses = () => /* @__PURE__ */ h("path", { d: "M12.227 12.188a5.067 5.067 0 0 1-5.454 0 .5.5 0 0 0-.546.837 5.981 5.981 0 0 0 6.546 0 .5.5 0 1 0-.546-.837zm4.627-3.042l-3-3A.5.5 0 0 0 13.5 6h-8a.5.5 0 0 0-.354.146l-3 3a.5.5 0 0 0 .708.708L5 7.707V9a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2V7h1v1a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1V7.707l2.146 2.147a.5.5 0 0 0 .708-.708z" });
var Sad = () => /* @__PURE__ */ h("path", { d: "M5.146 7.854a.5.5 0 0 0 .708 0l.646-.647.646.647a.5.5 0 0 0 .708-.708L7.207 6.5l.647-.646a.5.5 0 0 0-.708-.708l-.646.647-.646-.647a.5.5 0 0 0-.708.708l.647.646-.647.646a.5.5 0 0 0 0 .708zM13.207 6.5l.647-.646a.5.5 0 0 0-.708-.708l-.646.647-.646-.647a.5.5 0 0 0-.708.708l.647.646-.647.646a.5.5 0 0 0 .708.708l.646-.647.646.647a.5.5 0 0 0 .708-.708zM9.5 11a5.455 5.455 0 0 0-4.376 2.2.5.5 0 0 0 .8.6 4.455 4.455 0 0 1 7.158 0 .5.5 0 0 0 .8-.6A5.453 5.453 0 0 0 9.5 11z" });
var Face = ({ pressed, win, lose }) => {
	if (pressed) return /* @__PURE__ */ h(Afraid, null);
	if (lose) return /* @__PURE__ */ h(Sad, null);
	if (win) return /* @__PURE__ */ h(Sunglasses, null);
	return /* @__PURE__ */ h(Smile, null);
};
var Play = ({ pressed, lose, win, onReset }) => /* @__PURE__ */ h("button", {
	class: Play_module_default.root,
	type: "button",
	tabindex: -1,
	onclick: () => onReset(),
	oncreate: (el) => el.focus()
}, /* @__PURE__ */ h("svg", {
	class: Play_module_default.face,
	width: "19",
	height: "19"
}, /* @__PURE__ */ h("circle", {
	class: Play_module_default.skin,
	cx: "9.5",
	cy: "9.5",
	r: "8.5"
}), /* @__PURE__ */ h("path", { d: "M9.5 2A7.5 7.5 0 1 1 2 9.5 7.508 7.508 0 0 1 9.5 2m0-1A8.5 8.5 0 1 0 18 9.5 8.5 8.5 0 0 0 9.5 1z" }), /* @__PURE__ */ h("g", { class: Play_module_default.up }, /* @__PURE__ */ h(Face, {
	pressed,
	lose,
	win
})), /* @__PURE__ */ h("g", { class: Play_module_default.down }, /* @__PURE__ */ h(Smile, null))));
var SideButton_module_default = { root: "SideButton_root" };
//#endregion
//#region src/shell/SideButton.jsx
var SideButton = ({ title, disabled, onClick }, children) => /* @__PURE__ */ h("button", {
	type: "button",
	class: SideButton_module_default.root,
	tabindex: -1,
	title,
	disabled,
	onclick: () => onClick()
}, /* @__PURE__ */ h("svg", {
	width: "19",
	height: "19"
}, children));
var HintIcon = () => /* @__PURE__ */ h("path", { d: "M9.5 2a4.5 4.5 0 0 0-4.5 4.5h2a2.5 2.5 0 1 1 3.4 2.3c-1 .4-1.9 1.3-1.9 2.6V13h2v-1.6c0-.4.3-.7.7-.8A4.5 4.5 0 0 0 9.5 2zm-1 12.5v2h2v-2z" });
var UndoIcon = () => /* @__PURE__ */ h("path", { d: "M8 4L3 8.5 8 13v-3h4.5a2.5 2.5 0 0 1 0 5H9v2h3.5a4.5 4.5 0 0 0 0-9H8z" });
//#endregion
//#region src/shell/WindowControls.jsx
var WindowControls = ({ scale, onZoom, paused, canPause, onPause }) => [
	/* @__PURE__ */ h(Button, {
		tabIndex: -1,
		title: paused ? "Resume (P)" : "Pause (P)",
		disabled: !canPause,
		onClick: () => onPause()
	}, /* @__PURE__ */ h("svg", {
		width: "13",
		height: "11"
	}, /* @__PURE__ */ h("path", { d: paused ? "M4 1.5v8l6-4z" : "M4 2h2v7H4zM8 2h2v7H8z" }))),
	/* @__PURE__ */ h(Button, {
		tabIndex: -1,
		title: "Zoom out",
		disabled: scale <= .5,
		onClick: () => onZoom(-1)
	}, /* @__PURE__ */ h("svg", {
		width: "13",
		height: "11"
	}, /* @__PURE__ */ h("path", { d: "M3 5h8v2H3z" }))),
	/* @__PURE__ */ h(Button, {
		tabIndex: -1,
		title: "Zoom in",
		disabled: scale >= 4,
		onClick: () => onZoom(1)
	}, /* @__PURE__ */ h("svg", {
		width: "13",
		height: "11"
	}, /* @__PURE__ */ h("path", { d: "M6 2h2v3h3v2H8v3H6V7H3V5h3z" })))
];
var Board_module_default = {
	paused: "Board_paused",
	hint: "Board_hint",
	outline: "Board_outline"
};
//#endregion
//#region src/shell/zoom.js
var root$7 = document.documentElement;
var steps = [
	.5,
	.625,
	.75,
	.875,
	1,
	1.25,
	1.5,
	1.75,
	2,
	2.5,
	3,
	4
];
var MIN_FIT = .625;
var loadZoom = () => {
	const scale = parseFloat(load("scale"));
	return Number.isFinite(scale) ? Math.min(4, Math.max(.5, scale)) : 1;
};
var stepZoom = (scale, direction) => direction > 0 ? steps.find((step) => step > scale + .001) ?? steps[steps.length - 1] : steps.findLast((step) => step < scale - .001) ?? steps[0];
var fitZoom = (chosen, fit) => fit >= chosen ? chosen : Math.min(chosen, Math.max(MIN_FIT, Math.floor(fit * 50) / 50));
var applyZoom = (scale) => root$7.style.setProperty("--scale", scale);
var saveZoom = (scale) => save("scale", scale);
var gameWindow = null;
var hanging = 0;
var measureFit = (scale) => {
	const rect = gameWindow && gameWindow.getBoundingClientRect();
	if (!rect || !rect.width || !rect.height) return {
		fit: Infinity,
		size: null
	};
	const frame = getComputedStyle(gameWindow.parentElement.parentElement);
	const width = innerWidth - parseFloat(frame.marginLeft) - parseFloat(frame.marginRight);
	const height = innerHeight - parseFloat(frame.marginTop) - parseFloat(frame.marginBottom);
	const size = {
		width: rect.width / scale,
		height: (rect.height - hanging) / scale,
		room: `${width}x${height}`
	};
	return {
		fit: Math.min(width / size.width, height / size.height) * .99,
		size
	};
};
var sameSize = (a, b) => Boolean(a && b) && a.room === b.room && Math.abs(a.width / b.width - 1) < .03 && Math.abs(a.height / b.height - 1) < .03;
var hang = (panel) => {
	const height = panel ? panel.getBoundingClientRect().bottom - panel.previousElementSibling.getBoundingClientRect().bottom : 0;
	if (!gameWindow || Math.abs(height - hanging) < .5) return;
	hanging = height;
	gameWindow.parentElement.style.marginBottom = height ? `calc(env(safe-area-inset-bottom) - ${height}px)` : "";
};
var hangBelow = {
	oncreate: (panel) => hang(panel),
	onupdate: (panel) => hang(panel),
	ondestroy: () => hang(null)
};
var watchWindow = (dialog, refit) => {
	gameWindow = dialog;
	if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => refit()).observe(dialog);
	window.addEventListener("resize", () => refit());
};
//#endregion
//#region src/shell/Board.jsx
var PausedCover = ({ onResume }) => /* @__PURE__ */ h("div", { class: Board_module_default.paused }, /* @__PURE__ */ h(Button, {
	tabIndex: -1,
	title: "Resume (P)",
	onClick: () => onResume()
}, /* @__PURE__ */ h("svg", {
	width: "40",
	height: "40"
}, /* @__PURE__ */ h("path", { d: "M14 9v22l17-11z" }))));
var HintPanel = ({ text }) => /* @__PURE__ */ h("p", {
	class: Board_module_default.hint,
	role: "status",
	...hangBelow
}, text);
var Winner_module_default = {
	root: "Winner_root",
	text: "Winner_text",
	input: "Winner_input",
	button: "Winner_button"
};
var Overlay_module_default = {
	root: "Overlay_root",
	table: "Overlay_table",
	cell: "Overlay_cell"
};
//#endregion
//#region src/Overlay.jsx
var keyDown = (onKeyDown) => (event) => {
	if (event.keyCode === 27 && onKeyDown) event.stopPropagation();
	if (onKeyDown) onKeyDown(event);
};
var Overlay = ({ key, onKeyDown }, children) => /* @__PURE__ */ h("section", {
	key,
	class: Overlay_module_default.root,
	tabindex: -1,
	onkeydown: keyDown(onKeyDown)
}, /* @__PURE__ */ h("div", { class: Overlay_module_default.table }, /* @__PURE__ */ h("div", { class: Overlay_module_default.cell }, children)));
var Input_module_default = {
	root: "Input_root",
	input: "Input_input"
};
//#endregion
//#region src/Input.jsx
var Input = ({ key, id, type, name, value, maxLength, inputMode, onInput, onCreate }) => /* @__PURE__ */ h("span", { class: Input_module_default.root }, /* @__PURE__ */ h("input", {
	key,
	id,
	class: Input_module_default.input,
	type: type || "text",
	name,
	value,
	maxlength: maxLength,
	inputmode: inputMode,
	oninput: onInput,
	oncreate: onCreate
}));
//#endregion
//#region src/Winner.jsx
var Winner = ({ key, state, actions }) => /* @__PURE__ */ h(Overlay, { key }, /* @__PURE__ */ h(Dialog, null, /* @__PURE__ */ h("form", {
	class: Winner_module_default.root,
	autocomplete: "off",
	onsubmit: actions.submitBestTime
}, /* @__PURE__ */ h("label", {
	for: "winner",
	class: Winner_module_default.text
}, "You have the fastest time for ", state.level, " level", state.hinted ? " with hints" : "", "."), /* @__PURE__ */ h("label", {
	for: "winner",
	class: Winner_module_default.text
}, "Please enter your name."), /* @__PURE__ */ h("div", { class: Winner_module_default.input }, /* @__PURE__ */ h(Input, {
	id: "winner",
	name: "winner",
	value: state.name,
	maxLength: 32,
	inputMode: "latin-name",
	onInput: (event) => actions.changeWinner({ name: event.target.value }),
	onCreate: (input) => {
		input.focus();
		input.select();
	}
})), /* @__PURE__ */ h(Button, null, /* @__PURE__ */ h("span", { class: Winner_module_default.button }, "OK")))));
var BestTime_module_default = {
	root: "BestTime_root",
	table: "BestTime_table",
	cell: "BestTime_cell",
	footer: "BestTime_footer",
	button: "BestTime_button",
	tabs: "BestTime_tabs",
	tab: "BestTime_tab",
	tabActive: "BestTime_tabActive BestTime_tab"
};
//#endregion
//#region src/shell/Tabs.jsx
var Tabs = ({ tabs, active, onSelect }) => /* @__PURE__ */ h("div", {
	class: BestTime_module_default.tabs,
	role: "tablist"
}, tabs.map((tab) => /* @__PURE__ */ h("button", {
	type: "button",
	role: "tab",
	tabindex: -1,
	"aria-selected": active === tab.id,
	class: active === tab.id ? BestTime_module_default.tabActive : BestTime_module_default.tab,
	onclick: () => onSelect(tab.id)
}, tab.name)));
var BackgroundSettings_module_default = {
	root: "BackgroundSettings_root",
	row: "BackgroundSettings_row",
	name: "BackgroundSettings_name",
	range: "BackgroundSettings_range",
	slider: "BackgroundSettings_slider",
	value: "BackgroundSettings_value",
	check: "BackgroundSettings_check",
	frame: "BackgroundSettings_frame",
	select: "BackgroundSettings_select",
	credit: "BackgroundSettings_credit",
	footer: "BackgroundSettings_footer",
	button: "BackgroundSettings_button"
};
//#endregion
//#region src/shell/BackgroundSettings.jsx
var Control = ({ option, value, onChange }) => {
	if (option.type === "toggle") return /* @__PURE__ */ h("input", {
		type: "checkbox",
		class: BackgroundSettings_module_default.check,
		checked: value,
		onchange: (event) => onChange(event.target.checked)
	});
	if (option.type === "select") return /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.frame }, /* @__PURE__ */ h("select", {
		class: BackgroundSettings_module_default.select,
		onchange: (event) => onChange(event.target.value)
	}, option.choices.map(([choice, name]) => /* @__PURE__ */ h("option", {
		value: choice,
		selected: choice === value
	}, name))));
	return /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.range }, /* @__PURE__ */ h("input", {
		type: "range",
		class: BackgroundSettings_module_default.slider,
		min: option.min,
		max: option.max,
		step: option.step,
		value,
		oninput: (event) => onChange(Number(event.target.value))
	}), /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.value }, option.format ? option.format(value) : value));
};
var BackgroundSettings = ({ key, state, actions }) => {
	const background = backgrounds[state.id];
	return /* @__PURE__ */ h(Overlay, {
		key,
		onKeyDown: (event) => event.keyCode === 27 && actions.toggleBackgroundSettings()
	}, /* @__PURE__ */ h(Dialog, {
		title: `${background.name} Settings`,
		onClose: actions.toggleBackgroundSettings
	}, /* @__PURE__ */ h("form", {
		class: BackgroundSettings_module_default.root,
		autocomplete: "off",
		onsubmit: actions.submitBackgroundSettings
	}, optionsOf(state.id).map((option) => /* @__PURE__ */ h("label", { class: BackgroundSettings_module_default.row }, /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.name }, option.label, ":"), /* @__PURE__ */ h(Control, {
		option,
		value: state.draft[option.key],
		onChange: (value) => actions.changeBackgroundSettings({ [option.key]: value })
	}))), /* @__PURE__ */ h("p", { class: BackgroundSettings_module_default.credit }, background.credit), /* @__PURE__ */ h("div", { class: BackgroundSettings_module_default.footer }, /* @__PURE__ */ h(Button, { onCreate: (el) => el.focus() }, /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.button }, "OK")), /* @__PURE__ */ h(Button, {
		type: "button",
		onClick: actions.toggleBackgroundSettings
	}, /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.button }, "Cancel")), /* @__PURE__ */ h(Button, {
		type: "button",
		onClick: actions.resetBackgroundSettings
	}, /* @__PURE__ */ h("span", { class: BackgroundSettings_module_default.button }, "Defaults"))))));
};
var About_module_default = {
	root: "About_root",
	name: "About_name",
	link: "About_link",
	footer: "About_footer",
	button: "About_button"
};
//#endregion
//#region src/shell/About.jsx
var Link = ({ href }, children) => /* @__PURE__ */ h("a", {
	class: About_module_default.link,
	href,
	target: "_blank",
	rel: "noopener noreferrer"
}, children);
var About = ({ key, name, actions }, children) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleAbout()
}, /* @__PURE__ */ h(Dialog, {
	title: `About ${name}`,
	onClose: actions.toggleAbout
}, /* @__PURE__ */ h("div", { class: About_module_default.root }, /* @__PURE__ */ h("p", { class: About_module_default.name }, name), children, /* @__PURE__ */ h("p", null, "Uses canvas ports of xscreensaver's GLMatrix, Substrate, Truchet and Phosphor under the xscreensaver licence, fonts under the SIL Open Font License and LGPL 2.1, photos from Unsplash and CC0 photos from Wikimedia Commons, and the SynthWave '84, Solarized and Nord colour schemes. Released under the MIT licence; full credits are in the README."), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h(Link, { href: "https://github.com/fexofenadine/puzzles" }, "github.com/fexofenadine/puzzles")), /* @__PURE__ */ h("div", { class: About_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.toggleAbout,
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: About_module_default.button }, "OK"))))));
var Boss_module_default = {
	root: "Boss_root",
	header: "Boss_header",
	title: "Boss_title",
	menus: "Boss_menus",
	formula: "Boss_formula",
	ref: "Boss_ref",
	fx: "Boss_fx",
	grid: "Boss_grid",
	table: "Boss_table",
	corner: "Boss_corner",
	number: "Boss_number",
	figure: "Boss_figure",
	negative: "Boss_negative",
	total: "Boss_total",
	selected: "Boss_selected",
	footer: "Boss_footer",
	tabs: "Boss_tabs",
	tab: "Boss_tab",
	tabActive: "Boss_tabActive Boss_tab",
	status: "Boss_status",
	exit: "Boss_exit",
	button: "Boss_button",
	label: "Boss_label"
};
//#endregion
//#region src/shell/Boss.jsx
var departments = [
	"Engineering",
	"Sales",
	"Marketing",
	"Customer support",
	"Operations",
	"Finance",
	"People",
	"Facilities",
	"IT",
	"Legal"
];
var headings = [
	"Department",
	"Jul",
	"Aug",
	"Sep",
	"Q3 total",
	"Budget",
	"Variance",
	"% of budget"
];
var columns = "ABCDEFGHIJKLMN".split("");
var icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='2' fill='%232b6cb0'/%3E%3Cpath d='M3 5.5h10M3 8.5h10M3 11.5h10M6.5 3v10M10 3v10' stroke='%23fff'/%3E%3C/svg%3E";
var makeSheet = () => ({ rows: departments.map((name) => {
	const base = 2e4 + Math.random() * 18e4;
	const spend = [
		0,
		1,
		2
	].map(() => Math.round(base * (.9 + Math.random() * .2)));
	const total = spend[0] + spend[1] + spend[2];
	const budget = Math.round(total * (.92 + Math.random() * .16) / 1e3) * 1e3;
	return [
		name,
		...spend,
		total,
		budget,
		budget - total
	];
}) });
var money = (n) => n < 0 ? `(${(-n).toLocaleString()})` : n.toLocaleString();
var Row = ({ number, cells, total }) => /* @__PURE__ */ h("tr", { class: total ? Boss_module_default.total : null }, /* @__PURE__ */ h("th", { class: Boss_module_default.number }, number), columns.map((_, i) => {
	const value = cells && cells[i];
	const negative = typeof value === "number" && value < 0 && i === 6;
	return /* @__PURE__ */ h("td", { class: [
		i > 0 && Boss_module_default.figure,
		negative && Boss_module_default.negative,
		total && i === 4 && Boss_module_default.selected
	].filter(Boolean).join(" ") }, typeof value === "number" ? money(value) : value);
}));
var saved = null;
var cover = (el) => {
	const link = document.querySelector("link[rel~=\"icon\"]");
	saved = {
		title: document.title,
		href: link && link.getAttribute("href")
	};
	document.title = "Q3 budget";
	if (link) link.setAttribute("href", icon);
	document.documentElement.dataset.boss = "true";
	el.focus();
};
var uncover = () => {
	const link = document.querySelector("link[rel~=\"icon\"]");
	document.title = saved.title;
	if (link && saved.href) link.setAttribute("href", saved.href);
	delete document.documentElement.dataset.boss;
};
var Boss = ({ key, state, actions }) => {
	const sums = [
		1,
		2,
		3,
		4,
		5,
		6
	].map((i) => state.rows.reduce((sum, row) => sum + row[i], 0));
	const percent = (row) => `${(row[4] / row[5] * 100).toFixed(1)}%`;
	const rows = [
		headings,
		...state.rows.map((row) => [...row, percent(row)]),
		[
			"Total",
			...sums,
			percent([0, ...sums])
		]
	];
	return /* @__PURE__ */ h("section", {
		key,
		class: Boss_module_default.root,
		tabindex: -1,
		oncreate: cover,
		ondestroy: uncover
	}, /* @__PURE__ */ h("header", { class: Boss_module_default.header }, /* @__PURE__ */ h("div", { class: Boss_module_default.title }, "Q3 budget"), /* @__PURE__ */ h("nav", { class: Boss_module_default.menus }, [
		"File",
		"Edit",
		"View",
		"Insert",
		"Format",
		"Data",
		"Tools",
		"Help"
	].map((name) => /* @__PURE__ */ h("span", null, name)))), /* @__PURE__ */ h("div", { class: Boss_module_default.formula }, /* @__PURE__ */ h("span", { class: Boss_module_default.ref }, "E", rows.length), /* @__PURE__ */ h("span", { class: Boss_module_default.fx }, "fx"), /* @__PURE__ */ h("span", null, "=SUM(E2:E", rows.length - 1, ")")), /* @__PURE__ */ h("div", { class: Boss_module_default.grid }, /* @__PURE__ */ h("table", { class: Boss_module_default.table }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("th", { class: Boss_module_default.corner }), columns.map((c) => /* @__PURE__ */ h("th", null, c)))), /* @__PURE__ */ h("tbody", null, Array.from({ length: 60 }, (_, i) => /* @__PURE__ */ h(Row, {
		number: i + 1,
		cells: rows[i],
		total: i === rows.length - 1
	}))))), /* @__PURE__ */ h("footer", { class: Boss_module_default.footer }, /* @__PURE__ */ h("div", { class: Boss_module_default.tabs }, /* @__PURE__ */ h("span", { class: Boss_module_default.tab }, "Summary"), /* @__PURE__ */ h("span", { class: Boss_module_default.tabActive }, "Departments"), /* @__PURE__ */ h("span", { class: Boss_module_default.tab }, "Assumptions")), /* @__PURE__ */ h("div", { class: Boss_module_default.status }, /* @__PURE__ */ h("span", null, "Ready"), /* @__PURE__ */ h("span", null, "Sum: ", money(sums[3])), /* @__PURE__ */ h("button", {
		type: "button",
		class: Boss_module_default.exit,
		onclick: () => actions.boss()
	}, "100%"))));
};
var BossButton = ({ key, actions }) => /* @__PURE__ */ h("div", {
	key,
	class: Boss_module_default.button
}, /* @__PURE__ */ h(Button, {
	tabIndex: -1,
	title: "Boss key (Esc)",
	onClick: () => actions.boss()
}, /* @__PURE__ */ h("span", { class: Boss_module_default.label }, "Esc")));
//#endregion
//#region src/shell/actions.js
var loadTheme = () => {
	const theme = load("theme");
	return themes.some(([id]) => id === theme) ? theme : "classic";
};
var shellState = () => ({
	menu: null,
	theme: loadTheme(),
	boss: null,
	backgrounds: loadSettings(),
	backgroundSettings: null,
	zoom: {
		chosen: loadZoom(),
		scale: loadZoom(),
		seen: null
	},
	portrait: Boolean(window.matchMedia && matchMedia("(orientation: portrait)").matches)
});
var listen = (actions) => {
	document.addEventListener("visibilitychange", () => document.hidden && actions.pause(true));
	window.addEventListener("blur", () => actions.pause(true));
	if (window.matchMedia) matchMedia("(orientation: portrait)").addEventListener("change", (event) => actions.setPortrait(event.matches));
};
var typing = (event) => [
	"INPUT",
	"SELECT",
	"TEXTAREA"
].includes(event.target.tagName);
var shortcut = (event, state, actions) => {
	if (typing(event) || event.ctrlKey || event.metaKey || event.altKey) return null;
	if (event.keyCode === 27) {
		if (state.menu) actions.closeMenu();
		else actions.boss();
		return null;
	}
	return state.boss ? null : event.keyCode;
};
var shellActions = {
	closeMenu: () => ({ menu: null }),
	setPortrait: (portrait) => ({ portrait }),
	boss: () => ({ boss }, actions) => {
		if (boss) return { boss: null };
		actions.pause(true);
		return {
			menu: null,
			boss: makeSheet()
		};
	},
	toggleBackgroundSettings: () => ({ theme, backgrounds, backgroundSettings }) => {
		if (backgroundSettings) {
			configure(backgroundSettings.id, backgrounds[backgroundSettings.id]);
			return { backgroundSettings: null };
		}
		const id = backgroundFor(theme);
		return {
			menu: null,
			backgroundSettings: id && {
				id,
				draft: { ...backgrounds[id] }
			}
		};
	},
	changeBackgroundSettings: (values) => ({ backgroundSettings: { id, draft } }) => {
		const next = {
			...draft,
			...values
		};
		configure(id, next);
		return { backgroundSettings: {
			id,
			draft: next
		} };
	},
	resetBackgroundSettings: () => (state, actions) => actions.changeBackgroundSettings(defaults(state.backgroundSettings.id)),
	submitBackgroundSettings: (event) => ({ backgrounds, backgroundSettings: { id, draft } }) => {
		event.preventDefault();
		const next = {
			...backgrounds,
			[id]: draft
		};
		saveSettings(next);
		return {
			backgrounds: next,
			backgroundSettings: null
		};
	},
	fit: () => ({ zoom }) => {
		const { fit, size } = measureFit(zoom.scale);
		if (sameSize(size, zoom.seen)) return null;
		const scale = fitZoom(zoom.chosen, fit);
		applyZoom(scale);
		return { zoom: {
			...zoom,
			scale,
			seen: size
		} };
	},
	zoom: (direction) => ({ zoom }) => {
		const { fit, size } = measureFit(zoom.scale);
		const chosen = direction ? stepZoom(zoom.scale, direction) : 1;
		const scale = direction ? chosen : fitZoom(chosen, fit);
		saveZoom(chosen);
		applyZoom(scale);
		return { zoom: {
			chosen,
			scale,
			seen: size
		} };
	},
	setTheme: (theme) => () => {
		save("theme", theme);
		document.documentElement.dataset.theme = theme;
		return {
			menu: null,
			theme
		};
	},
	toggleMenu: (event) => ({ menu }) => {
		const { name } = event.currentTarget.dataset;
		if (event.type === "click") return { menu: menu && menu[name] ? null : { [name]: true } };
		if (event.type === "mouseenter") return menu ? { menu: { [name]: true } } : null;
		if (event.type === "focusout" && !event.currentTarget.contains(event.relatedTarget)) return { menu: null };
		return null;
	}
};
//#endregion
//#region src/shell/clock.js
var pauseAction = (running, onPause = () => ({})) => (paused) => ({ game }, actions) => {
	const next = paused === void 0 ? !game.paused : paused;
	if (!running(game) || next === game.paused) return null;
	if (!next) {
		game.raf = requestAnimationFrame(actions.tick);
		return { game: {
			...game,
			paused: false,
			start: game.start + performance.now() - game.pausedAt
		} };
	}
	cancelAnimationFrame(game.raf);
	return {
		menu: null,
		game: {
			...game,
			...onPause(game, actions),
			paused: true,
			pausedAt: performance.now()
		}
	};
};
//#endregion
//#region src/shell/worker.js
var registerWorker = () => {
	if ("serviceWorker" in navigator && true) navigator.serviceWorker.register("../service-worker.js", { scope: "./" }).catch(() => {});
};
//#endregion
export { SubMenuItem as A, Dialog as B, SideButton as C, Menu as D, Digit as E, glyphImage as F, Game_module_default as H, load as I, remove as L, startBackgrounds as M, BRIGHT as N, MenuItem as O, GLYPH as P, save as R, HintIcon as S, Play as T, app as U, Button as V, h as W, Overlay as _, shellState as a, watchWindow as b, Boss as c, Link as d, BackgroundSettings as f, Input as g, Winner as h, shellActions as i, ThemeMenu as j, Separator as k, BossButton as l, BestTime_module_default as m, pauseAction as n, shortcut as o, Tabs as p, listen as r, typing as s, registerWorker as t, About as u, HintPanel as v, UndoIcon as w, WindowControls as x, PausedCover as y, Menu_module_default as z };
