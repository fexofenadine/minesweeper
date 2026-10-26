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
	field: "Game_field",
	active: "Game_active",
	inactive: "Game_inactive",
	fieldLost: "Game_fieldLost Game_field",
	jitter: "Game_jitter",
	chroma: "Game_chroma",
	band: "Game_band",
	flicker: "Game_flicker",
	hint: "Game_hint"
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
//#region src/storage.js
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
//#region src/backgrounds/matrix.js
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
var buildAtlas = (glyphs, cell) => {
	const atlas = document.createElement("canvas");
	atlas.width = cell * glyphs.length;
	atlas.height = cell * 2;
	const context = atlas.getContext("2d");
	context.font = `${Math.round(cell / PAD * .8)}px monospace`;
	context.textAlign = "center";
	context.textBaseline = "middle";
	["#2cff6e", "#d4ffe0"].forEach((colour, row) => {
		context.fillStyle = colour;
		context.shadowColor = colour;
		glyphs.forEach((glyph, i) => {
			context.save();
			context.translate((i + .5) * cell, (row + .5) * cell);
			context.scale(-1, 1);
			context.shadowBlur = cell * .3;
			context.fillText(glyph, 0, 0);
			context.fillText(glyph, 0, 0);
			context.shadowBlur = cell * .07;
			context.fillText(glyph, 0, 0);
			context.restore();
		});
	});
	return atlas;
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
//#region src/backgrounds/substrate.js
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
var rgbOf = (hex) => {
	if (!rgbCache.has(hex)) rgbCache.set(hex, [
		1,
		3,
		5
	].map((i) => parseInt(hex.slice(i, i + 2), 16)));
	return rgbCache.get(hex);
};
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
//#region src/backgrounds/truchet.js
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
			const kind = f.curves && f.angles ? random(2) ? "curve" : "angle" : f.curves || !f.angles ? "curve" : "angle";
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
//#region src/backgrounds/font6x10.js
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
//#region src/backgrounds/phosphor.js
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
	"../About.jsx": () => __vitePreload(() => import("./About-D9CbMnRN.js").then((m) => m["default"]), [], import.meta.url),
	"../BackgroundSettings.jsx": () => __vitePreload(() => import("./BackgroundSettings-D3giHqNw.js").then((m) => m["default"]), [], import.meta.url),
	"../BestTime.jsx": () => __vitePreload(() => import("./BestTime-Ce22rTOt.js").then((m) => m["default"]), [], import.meta.url),
	"../Button.jsx": () => __vitePreload(() => import("./Button-C8D8-FiQ.js").then((m) => m["default"]), [], import.meta.url),
	"../Cell.jsx": () => __vitePreload(() => import("./Cell-GIKddMdx.js").then((m) => m["default"]), [], import.meta.url),
	"../CustomField.jsx": () => __vitePreload(() => import("./CustomField-DS_mYmEf.js").then((m) => m["default"]), [], import.meta.url),
	"../Dialog.jsx": () => __vitePreload(() => import("./Dialog-BXD_Wy5m.js").then((m) => m["default"]), [], import.meta.url),
	"../Digit.jsx": () => __vitePreload(() => import("./Digit-B5rGRU4Q.js").then((m) => m["default"]), [], import.meta.url),
	"../Game.jsx": () => __vitePreload(() => import("./Game-rnd9BPSW.js").then((m) => m["default"]), [], import.meta.url),
	"../Input.jsx": () => __vitePreload(() => import("./Input-BH3afC1u.js").then((m) => m["default"]), [], import.meta.url),
	"../Menu.jsx": () => __vitePreload(() => import("./Menu-CM-8ws1g.js").then((m) => m["default"]), [], import.meta.url),
	"../Overlay.jsx": () => __vitePreload(() => import("./Overlay-BtrJ3RPa.js").then((m) => m["default"]), [], import.meta.url),
	"../Play.jsx": () => __vitePreload(() => import("./Play-DPV83WcB.js").then((m) => m["default"]), [], import.meta.url),
	"../Winner.jsx": () => __vitePreload(() => import("./Winner-BcLjHZfV.js").then((m) => m["default"]), [], import.meta.url),
	"../app.jsx": () => __vitePreload(() => import("./app-UHd7D_YL.js").then((m) => m["default"]), [], import.meta.url),
	"./hill.js": () => __vitePreload(() => import("./hill-z0PhJZqK.js").then((m) => m["default"]), [], import.meta.url),
	"./index.js": () => __vitePreload(() => import("./backgrounds-y8fCa31h.js").then((m) => m["default"]), [], import.meta.url),
	"./matrix.js": () => __vitePreload(() => import("./matrix-D_vYPxu0.js").then((m) => m["default"]), [], import.meta.url),
	"./substrate.js": () => __vitePreload(() => import("./substrate-CETR7kLC.js").then((m) => m["default"]), [], import.meta.url),
	"./truchet.js": () => __vitePreload(() => import("./truchet-BRKY3zWa.js").then((m) => m["default"]), [], import.meta.url),
	"../hint.js": () => __vitePreload(() => import("./hint-Sn72Q7dE.js").then((m) => m["default"]), [], import.meta.url),
	"../index.js": () => __vitePreload(() => import("./src-BXMJwuxq.js").then((m) => m["default"]), [], import.meta.url),
	"../mines.js": () => __vitePreload(() => import("./mines-fdYoz0O3.js").then((m) => m["default"]), [], import.meta.url),
	"../storage.js": () => __vitePreload(() => import("./storage-BFgRqbmn.js").then((m) => m["default"]), [], import.meta.url),
	"../zoom.js": () => __vitePreload(() => import("./zoom-BEqOxbr8.js").then((m) => m["default"]), [], import.meta.url)
});
var texts = null;
var loadTexts = () => texts ??= Promise.all(Object.entries(sources).map(async ([path, load]) => ({
	name: `src/${path.replace(/^\.\.\//, "").replace(/^\.\//, "backgrounds/")}`,
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
//#region src/backgrounds/hill.webp
var hill_default$1 = new URL("hill.webp", import.meta.url).href;
//#endregion
//#region src/backgrounds/ridge.json
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
//#region src/backgrounds/hill.js
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
//#region src/backgrounds/index.js
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
			const sprites = [];
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
				const choices = sprites.filter((sprite, i) => sprite && kinds[i] === cloud.layer.kind);
				return choices[cloud.sprite % Math.max(1, choices.length)];
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
					if (sprites.length < kinds.length) sprites.push(makeCloud(sprites.length + 1, kinds[sprites.length]));
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
		const next = !id ? null : settings[id].animated ? "animated" : backgrounds[id].wallpaper ? "wallpaper" : "still";
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
	window.addEventListener("resize", () => active && start());
	watchPixels();
	update();
};
//#endregion
//#region src/Menu.jsx
var SubMenuItem = ({ key, name, hotKey, checked, onClick }, children) => /* @__PURE__ */ h("li", {
	key,
	class: Menu_module_default.item
}, /* @__PURE__ */ h("button", {
	type: "button",
	class: Menu_module_default.option,
	tabindex: -1,
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
})), /* @__PURE__ */ h(MenuItem, {
	name: "Theme",
	type: "theme",
	active: state.menu,
	onChange: actions.toggleMenu
}, /* @__PURE__ */ h(SubMenuItem, {
	name: "Classic",
	checked: state.theme === "classic",
	onClick: () => actions.setTheme("classic")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Synthwave",
	checked: state.theme === "synthwave",
	onClick: () => actions.setTheme("synthwave")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Solarized Truchet",
	checked: state.theme === "solarized",
	onClick: () => actions.setTheme("solarized")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Solarized Phosphor",
	checked: state.theme === "solarized-phosphor",
	onClick: () => actions.setTheme("solarized-phosphor")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Matrix",
	checked: state.theme === "matrix",
	onClick: () => actions.setTheme("matrix")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Nord",
	checked: state.theme === "nord",
	onClick: () => actions.setTheme("nord")
}), backgroundFor(state.theme) && /* @__PURE__ */ h(Separator, null), backgroundFor(state.theme) && /* @__PURE__ */ h(SubMenuItem, {
	name: "Background Settings...",
	onClick: actions.toggleBackgroundSettings
})), /* @__PURE__ */ h(MenuItem, {
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
var Cell_module_default = {
	root: "Cell_root",
	pressed: "Cell_pressed Cell_root",
	image: "Cell_image",
	hurt: "Cell_hurt Cell_image",
	n1: "Cell_n1",
	n2: "Cell_n2",
	n3: "Cell_n3",
	n4: "Cell_n4",
	n5: "Cell_n5",
	n6: "Cell_n6",
	n7: "Cell_n7",
	n8: "Cell_n8",
	flagCloth: "Cell_flagCloth",
	wrong: "Cell_wrong",
	mine: "Cell_mine",
	shine: "Cell_shine",
	hintSource: "Cell_hintSource",
	hintSafe: "Cell_hintSafe",
	hintMine: "Cell_hintMine",
	hintWrong: "Cell_hintWrong",
	hintUnsure: "Cell_hintUnsure"
};
//#endregion
//#region src/Cell.jsx
var inRange = (x, y, u, v) => u >= 0 && v >= 0 && (x - u - 1) * (x - u + 1) <= 0 && (y - v - 1) * (y - v + 1) <= 0;
var Num1 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n1,
	d: "M4 12v-2h2V6H4V5l3-3h2v8h2v2H4z"
});
var Num2 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n2,
	d: "M2 12h10v-2H6v-.5L11 7l1-1V3l-1-1H3L2 3v2h3V4h4v1L8 6 2 9v3z"
});
var Num3 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n3,
	d: "M2 10h7V8H5V6h4V4H2V2h9l1 1v3l-1 1 1 1v3l-1 1H2v-2z"
});
var Num4 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n4,
	d: "M8 12h3V8h1V6h-1V2H8v4H5l2-4H4L2 6v2h6v4z"
});
var Num5 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n5,
	d: "M2 2h10v2H5v2h6l1 1v4l-1 1H2v-2h7V8H2V2z"
});
var Num6 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n6,
	d: "M11 6H5V4h6V2H3L2 3v8l1 1h8l1-1V7zm-2 4H5V8h4z"
});
var Num7 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n7,
	d: "M2 2h10v4l-3 6H6l3-6V4H2V2z"
});
var Num8 = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.n8,
	d: "M12 3l-1-1H3L2 3v3l1 1-1 1v3l1 1h8l1-1V8l-1-1 1-1zm-3 7H5V8h4zm0-4H5V4h4z"
});
var Flag = () => /* @__PURE__ */ h("g", { class: Cell_module_default.flag }, /* @__PURE__ */ h("path", { d: "M9 10.5V3H8v7l-4 2v1h8v-1z" }), /* @__PURE__ */ h("path", {
	class: Cell_module_default.flagCloth,
	d: "M9 3v5H8L4 5.5 8 3z"
}));
var Mark = () => /* @__PURE__ */ h("text", {
	x: "50%",
	y: "50%",
	dx: ".5",
	dy: ".4em",
	"text-anchor": "middle"
}, "?");
var Fail = () => /* @__PURE__ */ h("path", {
	class: Cell_module_default.wrong,
	d: "M13.854 1.854l-.708-.708L7.5 6.793 1.854 1.146l-.708.708L6.793 7.5l-5.647 5.646.708.708L7.5 8.207l5.646 5.647.708-.708L8.207 7.5l5.647-5.646z"
});
var Mine = () => /* @__PURE__ */ h("g", { class: Cell_module_default.mine }, /* @__PURE__ */ h("path", { d: "M13.5 7h-1.55A4.445 4.445 0 0 0 11 4.705l.741-.741a.5.5 0 1 0-.707-.707l-.74.743A4.446 4.446 0 0 0 8 3.05V1.5a.5.5 0 0 0-1 0v1.55A4.452 4.452 0 0 0 4.705 4l-.741-.741a.5.5 0 0 0-.707.707L4 4.705A4.452 4.452 0 0 0 3.05 7H1.5a.5.5 0 0 0 0 1h1.55A4.446 4.446 0 0 0 4 10.294l-.741.741a.5.5 0 0 0 .354.854.5.5 0 0 0 .353-.147L4.705 11A4.445 4.445 0 0 0 7 11.95v1.55a.5.5 0 0 0 1 0v-1.55a4.452 4.452 0 0 0 2.3-.95l.74.74a.5.5 0 0 0 .707-.707L11 10.3a4.452 4.452 0 0 0 .95-2.3h1.55a.5.5 0 0 0 0-1z" }), /* @__PURE__ */ h("circle", {
	class: Cell_module_default.shine,
	cx: "6",
	cy: "6",
	r: "1"
}));
var Symbol = ({ opened, mined, flag, mark, num, lose }) => {
	if (opened) {
		if (mined) return /* @__PURE__ */ h(Mine, null);
		switch (num) {
			case 1: return /* @__PURE__ */ h(Num1, null);
			case 2: return /* @__PURE__ */ h(Num2, null);
			case 3: return /* @__PURE__ */ h(Num3, null);
			case 4: return /* @__PURE__ */ h(Num4, null);
			case 5: return /* @__PURE__ */ h(Num5, null);
			case 6: return /* @__PURE__ */ h(Num6, null);
			case 7: return /* @__PURE__ */ h(Num7, null);
			case 8: return /* @__PURE__ */ h(Num8, null);
			default: return null;
		}
	}
	if (flag) {
		if (lose && !mined) return /* @__PURE__ */ h("g", null, /* @__PURE__ */ h(Mine, null), /* @__PURE__ */ h(Fail, null));
		return /* @__PURE__ */ h(Flag, null);
	}
	if (lose && mined) return /* @__PURE__ */ h(Mine, null);
	if (mark) return /* @__PURE__ */ h(Mark, null);
	return null;
};
var hintClass = {
	source: Cell_module_default.hintSource,
	safe: Cell_module_default.hintSafe,
	mine: Cell_module_default.hintMine,
	wrong: Cell_module_default.hintWrong,
	unsure: Cell_module_default.hintUnsure
};
var isPressed = ({ x, y, pressed, pressedX, pressedY, group, opened, mined, flag, lose }) => opened || pressed && !flag && pressedX === x && pressedY === y || group && !flag && inRange(x, y, pressedX, pressedY) || lose && (!flag && mined || flag && !mined);
var Cell = ({ x, y, pressed, pressedX, pressedY, group, opened, mined, flag, mark, num, lose, hint, onDown, onMove, onTouch, onChord }) => /* @__PURE__ */ h("button", {
	type: "button",
	class: [isPressed({
		x,
		y,
		pressed,
		pressedX,
		pressedY,
		group,
		opened,
		mined,
		flag,
		lose
	}) ? Cell_module_default.pressed : Cell_module_default.root, hint && hintClass[hint]].filter(Boolean).join(" "),
	tabindex: -1,
	onmousedown: (event) => {
		onDown({
			event,
			x,
			y
		});
	},
	onmouseenter: () => {
		onMove({
			x,
			y
		});
	},
	onmouseleave: () => {
		onMove({
			x: -1,
			y: -1
		});
	},
	ontouchstart: (event) => {
		onTouch({
			event,
			x,
			y
		});
	},
	ondblclick: () => {
		onChord({
			x,
			y
		});
	}
}, /* @__PURE__ */ h("svg", {
	class: opened && mined ? Cell_module_default.hurt : Cell_module_default.image,
	width: "15",
	height: "15"
}, /* @__PURE__ */ h(Symbol, {
	opened,
	mined,
	flag,
	mark,
	num,
	lose
})));
//#endregion
//#region src/zoom.js
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
		height: rect.height / scale,
		room: `${width}x${height}`
	};
	return {
		fit: Math.min(width / size.width, height / size.height) * .99,
		size
	};
};
var sameSize = (a, b) => Boolean(a && b) && a.room === b.room && Math.abs(a.width / b.width - 1) < .03 && Math.abs(a.height / b.height - 1) < .03;
var watchWindow = (dialog, refit) => {
	gameWindow = dialog;
	if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => refit()).observe(dialog);
	window.addEventListener("resize", () => refit());
};
//#endregion
//#region src/Game.jsx
var Zoom = ({ scale, onZoom }) => [/* @__PURE__ */ h(Button, {
	tabIndex: -1,
	title: "Zoom out",
	disabled: scale <= .5,
	onClick: () => onZoom(-1)
}, /* @__PURE__ */ h("svg", {
	width: "13",
	height: "11"
}, /* @__PURE__ */ h("path", { d: "M3 5h8v2H3z" }))), /* @__PURE__ */ h(Button, {
	tabIndex: -1,
	title: "Zoom in",
	disabled: scale >= 4,
	onClick: () => onZoom(1)
}, /* @__PURE__ */ h("svg", {
	width: "13",
	height: "11"
}, /* @__PURE__ */ h("path", { d: "M6 2h2v3h3v2H8v3H6V7H3V5h3z" })))];
var transposed = ({ portrait, game }) => portrait && game.width > game.height;
var rowsOf = (state) => {
	const { field } = state.game;
	if (!transposed(state)) return field.map((row, y) => row.map((cell, x) => ({
		cell,
		x,
		y
	})));
	return field[0].map((_, x) => field.map((row, y) => ({
		cell: row[x],
		x,
		y
	})));
};
var Game = ({ key, state, actions }) => /* @__PURE__ */ h(Dialog, {
	key,
	title: state.theme === "classic" ? "Minesweeper" : "Minesweeper Plus",
	titleHint: "Double-click for 100% zoom",
	onTitleDoubleClick: () => actions.zoom(0),
	controls: /* @__PURE__ */ h(Zoom, {
		scale: state.zoom.scale,
		onZoom: actions.zoom
	}),
	onCreate: (dialog) => {
		watchWindow(dialog, actions.fit);
		actions.fit();
	}
}, /* @__PURE__ */ h(Menu, {
	state,
	actions
}), /* @__PURE__ */ h("div", { class: Game_module_default.root }, /* @__PURE__ */ h("div", { class: Game_module_default.scoreboard }, /* @__PURE__ */ h(Digit, { value: state.game.flags }), /* @__PURE__ */ h(Play, {
	pressed: state.game.pressed,
	lose: state.game.lose,
	win: state.game.win,
	onReset: actions.reset
}), /* @__PURE__ */ h(Digit, { value: state.game.time })), /* @__PURE__ */ h("div", { class: state.game.lose ? Game_module_default.fieldLost : Game_module_default.field }, rowsOf(state).map((row) => /* @__PURE__ */ h("div", { class: state.game.win || state.game.lose ? Game_module_default.inactive : Game_module_default.active }, row.map(({ cell, x, y }) => /* @__PURE__ */ h(Cell, {
	x,
	y,
	pressed: state.game.pressed,
	pressedX: state.game.pressedX,
	pressedY: state.game.pressedY,
	group: state.game.group,
	opened: cell.opened,
	mined: cell.mined,
	flag: cell.flag,
	mark: cell.mark,
	num: cell.num,
	hint: state.hint && state.hint.marks[y * state.game.width + x],
	lose: state.game.lose,
	onDown: actions.down,
	onMove: actions.move,
	onTouch: actions.touch,
	onChord: actions.chord
}))))), state.hint && /* @__PURE__ */ h("p", {
	class: Game_module_default.hint,
	role: "status"
}, state.hint.text)));
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
var Overlay = ({ key, onKeyDown }, children) => /* @__PURE__ */ h("section", {
	key,
	class: Overlay_module_default.root,
	tabindex: -1,
	onkeydown: onKeyDown
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
//#region src/BestTime.jsx
var tabs = [{
	id: "clean",
	name: "No hints"
}, {
	id: "hinted",
	name: "Hints used"
}];
var BestTime = ({ key, state, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleBestTime()
}, /* @__PURE__ */ h(Dialog, {
	title: "Fastest Mine Sweepers",
	onClose: actions.toggleBestTime
}, /* @__PURE__ */ h("div", { class: BestTime_module_default.root }, /* @__PURE__ */ h("div", {
	class: BestTime_module_default.tabs,
	role: "tablist"
}, tabs.map((tab) => /* @__PURE__ */ h("button", {
	type: "button",
	role: "tab",
	tabindex: -1,
	"aria-selected": state.tab === tab.id,
	class: state.tab === tab.id ? BestTime_module_default.tabActive : BestTime_module_default.tab,
	onclick: () => actions.setBestTimeTab(tab.id)
}, tab.name))), /* @__PURE__ */ h("table", { class: BestTime_module_default.table }, /* @__PURE__ */ h("tbody", null, state[state.tab].map((row) => /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.level, ":"), /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.time, " seconds"), /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.name))))), /* @__PURE__ */ h("div", { class: BestTime_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.resetBestTime
}, /* @__PURE__ */ h("span", { class: BestTime_module_default.button }, "Reset Scores")), /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.toggleBestTime,
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: BestTime_module_default.button }, "OK"))))));
var CustomField_module_default = {
	root: "CustomField_root",
	row: "CustomField_row",
	name: "CustomField_name",
	value: "CustomField_value",
	footer: "CustomField_footer",
	button: "CustomField_button"
};
//#endregion
//#region src/CustomField.jsx
var CustomField = ({ key, state, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleCustomField()
}, /* @__PURE__ */ h(Dialog, {
	title: "Custom Field",
	onClose: actions.toggleCustomField
}, /* @__PURE__ */ h("form", {
	class: CustomField_module_default.root,
	autocomplete: "off",
	onsubmit: actions.submitCustomField
}, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("label", { class: CustomField_module_default.row }, /* @__PURE__ */ h("span", { class: CustomField_module_default.name }, "Height: "), /* @__PURE__ */ h("span", { class: CustomField_module_default.value }, /* @__PURE__ */ h(Input, {
	value: state.height,
	maxLength: 5,
	inputMode: "numeric",
	onInput: (event) => actions.changeCustomField({ height: event.target.value })
}))), /* @__PURE__ */ h("label", { class: CustomField_module_default.row }, /* @__PURE__ */ h("span", { class: CustomField_module_default.name }, "Width: "), /* @__PURE__ */ h("span", { class: CustomField_module_default.value }, /* @__PURE__ */ h(Input, {
	value: state.width,
	maxLength: 5,
	inputMode: "numeric",
	onInput: (event) => actions.changeCustomField({ width: event.target.value })
}))), /* @__PURE__ */ h("label", { class: CustomField_module_default.row }, /* @__PURE__ */ h("span", { class: CustomField_module_default.name }, "Mines: "), /* @__PURE__ */ h("span", { class: CustomField_module_default.value }, /* @__PURE__ */ h(Input, {
	value: state.mines,
	maxLength: 5,
	inputMode: "numeric",
	onInput: (event) => actions.changeCustomField({ mines: event.target.value })
})))), /* @__PURE__ */ h("div", { class: CustomField_module_default.footer }, /* @__PURE__ */ h(Button, { onCreate: (el) => el.focus() }, /* @__PURE__ */ h("span", { class: CustomField_module_default.button }, "OK")), /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.toggleCustomField
}, /* @__PURE__ */ h("span", { class: CustomField_module_default.button }, "Cancel"))))));
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
//#region src/BackgroundSettings.jsx
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
//#region src/About.jsx
var Link = ({ href }, children) => /* @__PURE__ */ h("a", {
	class: About_module_default.link,
	href,
	target: "_blank",
	rel: "noopener noreferrer"
}, children);
var About = ({ key, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleAbout()
}, /* @__PURE__ */ h(Dialog, {
	title: "About Minesweeper Plus",
	onClose: actions.toggleAbout
}, /* @__PURE__ */ h("div", { class: About_module_default.root }, /* @__PURE__ */ h("p", { class: About_module_default.name }, "Minesweeper Plus"), /* @__PURE__ */ h("p", null, "A Windows style minesweeper with boards that never need a guess, hints that explain their reasoning, zoom, and animated themes ported from xscreensaver."), /* @__PURE__ */ h("p", null, "Based on ", /* @__PURE__ */ h(Link, { href: "https://github.com/frenzzy/minesweeper" }, "Minesweeper"), " by Vladimir Kutepov, extended by fexofenadine."), /* @__PURE__ */ h("p", null, "Uses canvas ports of xscreensaver's GLMatrix, Substrate, Truchet and Phosphor under the xscreensaver licence, fonts under the SIL Open Font License and LGPL 2.1, photos from Unsplash and CC0 photos from Wikimedia Commons, and the SynthWave '84, Solarized and Nord colour schemes. Released under the MIT licence; full credits are in the README."), /* @__PURE__ */ h("p", null, /* @__PURE__ */ h(Link, { href: "https://github.com/fexofenadine/minesweeperplus" }, "github.com/fexofenadine/minesweeperplus")), /* @__PURE__ */ h("div", { class: About_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.toggleAbout,
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: About_module_default.button }, "OK"))))));
//#endregion
//#region src/mines.js
var neighbourCache = /* @__PURE__ */ new Map();
var neighboursOf = (width, height) => {
	const key = `${width}x${height}`;
	if (!neighbourCache.has(key)) {
		const list = [];
		for (let i = 0; i < width * height; i++) {
			const x = i % width;
			const y = (i - x) / width;
			const around = [];
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				const nx = x + dx;
				const ny = y + dy;
				if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) around.push(ny * width + nx);
			}
			list.push(around);
		}
		neighbourCache.set(key, list);
	}
	return neighbourCache.get(key);
};
var scatter = (size, mines, clear) => {
	const free = [];
	for (let i = 0; i < size; i++) if (!clear.has(i)) free.push(i);
	const mined = new Uint8Array(size);
	for (let n = 0; n < mines; n++) {
		const j = n + Math.floor(Math.random() * (free.length - n));
		const pick = free[j];
		free[j] = free[n];
		free[n] = pick;
		mined[pick] = 1;
	}
	return mined;
};
var UNKNOWN = 0;
var OPEN = 1;
var FLAG = 2;
var solvable = (mined, width, height, start) => {
	const size = width * height;
	const around = neighboursOf(width, height);
	const nums = new Uint8Array(size);
	let mines = 0;
	for (let i = 0; i < size; i++) {
		if (mined[i]) mines++;
		for (const n of around[i]) nums[i] += mined[n];
	}
	if (mined[start]) return false;
	const state = new Uint8Array(size);
	let opened = 0;
	let flagged = 0;
	const open = (first) => {
		const stack = [first];
		while (stack.length) {
			const i = stack.pop();
			if (state[i] !== UNKNOWN) continue;
			state[i] = OPEN;
			opened++;
			if (nums[i] === 0) {
				for (const n of around[i]) if (state[n] === UNKNOWN) stack.push(n);
			}
		}
	};
	const flag = (i) => {
		if (state[i] !== UNKNOWN) return;
		state[i] = FLAG;
		flagged++;
	};
	const frontier = (i) => {
		const unknown = [];
		let need = nums[i];
		for (const n of around[i]) if (state[n] === UNKNOWN) unknown.push(n);
		else if (state[n] === FLAG) need--;
		return {
			unknown,
			need
		};
	};
	open(start);
	while (opened < size - mines) {
		let progress = false;
		for (let i = 0; i < size; i++) {
			if (state[i] !== OPEN || !nums[i]) continue;
			const { unknown, need } = frontier(i);
			if (!unknown.length) continue;
			if (need === 0) unknown.forEach(open);
			else if (need === unknown.length) unknown.forEach(flag);
			else continue;
			progress = true;
		}
		if (!progress) for (let a = 0; a < size && !progress; a++) {
			if (state[a] !== OPEN || !nums[a]) continue;
			const A = frontier(a);
			if (!A.unknown.length) continue;
			const inA = new Set(A.unknown);
			const nearby = new Set(A.unknown.flatMap((u) => around[u]));
			for (const b of nearby) {
				if (b === a || state[b] !== OPEN || !nums[b]) continue;
				const B = frontier(b);
				if (B.unknown.length <= A.unknown.length) continue;
				if (!A.unknown.every((u) => B.unknown.includes(u))) continue;
				const rest = B.unknown.filter((u) => !inA.has(u));
				const extra = B.need - A.need;
				if (extra === 0) rest.forEach(open);
				else if (extra === rest.length) rest.forEach(flag);
				else continue;
				progress = true;
				break;
			}
		}
		if (!progress) {
			const left = mines - flagged;
			const unknown = [];
			for (let i = 0; i < size; i++) if (state[i] === UNKNOWN) unknown.push(i);
			if (left === 0) unknown.forEach(open);
			else if (left === unknown.length) unknown.forEach(flag);
			else return false;
		}
	}
	return true;
};
var placeMines = ({ width, height, mines, x, y, safe, noGuess, budget = 1500 }) => {
	const size = width * height;
	const start = y * width + x;
	const around = neighboursOf(width, height);
	let clear = /* @__PURE__ */ new Set();
	if (noGuess) clear = /* @__PURE__ */ new Set([start, ...around[start]]);
	else if (safe) clear = /* @__PURE__ */ new Set([start]);
	if (size - clear.size < mines) clear = new Set(safe || noGuess ? [start] : []);
	if (!noGuess) return {
		mined: scatter(size, mines, clear),
		solvable: false
	};
	const deadline = Date.now() + budget;
	let mined;
	do {
		mined = scatter(size, mines, clear);
		if (solvable(mined, width, height, start)) return {
			mined,
			solvable: true
		};
	} while (Date.now() < deadline);
	return {
		mined,
		solvable: false
	};
};
//#endregion
//#region src/hint.js
var count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
var where = (a, b, width, transposed) => {
	const across = b % width - a % width;
	const down = Math.floor(b / width) - Math.floor(a / width);
	const [dx, dy] = transposed ? [down, across] : [across, down];
	const v = dy < 0 ? "above" : dy > 0 ? "below" : "";
	const h = dx < 0 ? "left" : dx > 0 ? "right" : "";
	if (v && h) return `${v} and to the ${h} of it`;
	return v ? `${v} it` : `to the ${h} of it`;
};
var hint = (kind, cells, sources, text, role = {
	clear: "safe",
	mine: "mine",
	conflict: "wrong"
}[kind]) => {
	const marks = {};
	sources.forEach((i) => marks[i] = "source");
	cells.forEach((i) => marks[i] = role);
	return {
		kind,
		cells,
		sources,
		marks,
		text
	};
};
var noHint = (text) => hint("none", [], [], text);
var explainChord = ({ field, width, height }, x, y) => {
	const i = y * width + x;
	const { opened, num } = field[y][x];
	if (!opened || !num) return null;
	const hidden = [];
	const flagged = [];
	for (const n of neighboursOf(width, height)[i]) {
		const c = field[Math.floor(n / width)][n % width];
		if (c.flag) flagged.push(n);
		else if (!c.opened) hidden.push(n);
	}
	const rule = "Chording needs exactly as many flags around a number as it shows.";
	if (flagged.length > num) return hint("chord", flagged, [i], `${rule} This ${num} touches ${count(flagged.length, "flag")}, so at least one of the highlighted flags is wrong.`, "wrong");
	if (flagged.length < num && hidden.length) {
		const has = flagged.length ? `only ${count(flagged.length, "flag")}` : "none";
		return hint("chord", hidden, [i], `${rule} This ${num} has ${has}, so flag ${count(num - flagged.length, "more mine")} among the highlighted cells first.`, "unsure");
	}
	return null;
};
var findHint = ({ field, width, height, minesLeft, transposed = false }) => {
	const around = neighboursOf(width, height);
	const cells = field.flat();
	const numbered = [];
	for (let i = 0; i < width * height; i++) if (cells[i].opened && cells[i].num) numbered.push(i);
	const look = (i) => {
		const hidden = [];
		const flagged = [];
		for (const n of around[i]) if (cells[n].flag) flagged.push(n);
		else if (!cells[n].opened) hidden.push(n);
		return {
			hidden,
			flagged,
			need: cells[i].num - flagged.length
		};
	};
	const seen = new Map(numbered.map((i) => [i, look(i)]));
	for (const i of numbered) {
		const { flagged, need } = seen.get(i);
		if (need < 0) return hint("conflict", flagged, [i], `The highlighted ${cells[i].num} touches ${count(flagged.length, "flag")}, more than its number, so at least one of those flags is wrong.`);
	}
	for (const i of numbered) {
		const { hidden, flagged, need } = seen.get(i);
		if (!hidden.length) continue;
		const num = cells[i].num;
		if (need === 0) return hint("clear", hidden, [i], `The highlighted ${num} already has ${count(flagged.length, "flag")} around it, so its other hidden neighbours are safe.`);
		if (need === hidden.length) {
			const needs = flagged.length ? `touches ${count(flagged.length, "flag")} and needs ${count(need, "more mine")}` : `needs ${count(need, "mine")}`;
			const last = need === 1 ? "it is a mine" : "they are all mines";
			return hint("mine", hidden, [i], `The highlighted ${num} ${needs}, and has exactly ${count(need, "hidden neighbour")} left, so ${last}.`);
		}
	}
	for (const a of numbered) {
		const A = seen.get(a);
		if (!A.hidden.length) continue;
		const nearby = new Set(A.hidden.flatMap((u) => around[u]));
		for (const b of nearby) {
			const B = seen.get(b);
			if (b === a || !B || B.hidden.length <= A.hidden.length) continue;
			if (!A.hidden.every((u) => B.hidden.includes(u))) continue;
			const rest = B.hidden.filter((u) => !A.hidden.includes(u));
			const extra = B.need - A.need;
			if (extra !== 0 && extra !== rest.length) continue;
			const shared = `Every hidden cell next to the highlighted ${cells[a].num} is also next to the ${cells[b].num} ${where(a, b, width, transposed)}. Those shared cells hold exactly ${count(A.need, "mine")}`;
			if (extra === 0) return hint("clear", rest, [a, b], `${shared}, which is all the ${cells[b].num} needs, so its other hidden neighbours are safe.`);
			const last = rest.length === 1 ? "it is a mine" : "they are all mines";
			return hint("mine", rest, [a, b], `${shared}, so the ${cells[b].num} needs ${extra} more among its ${count(rest.length, "other hidden neighbour")}, and ${last}.`);
		}
	}
	const left = [];
	cells.forEach((c, i) => !c.opened && !c.flag && left.push(i));
	if (left.length && minesLeft === 0) return hint("clear", left, [], "The mine counter is at 0, so every hidden cell without a flag is safe.");
	if (left.length && minesLeft === left.length) return hint("mine", left, [], `The mine counter shows ${minesLeft} and exactly ${count(left.length, "hidden cell")} without a flag ${left.length === 1 ? "is" : "are"} left, so ${left.length === 1 ? "it is a mine" : "they are all mines"}.`);
	return noHint("Nothing on the board can be worked out for certain right now, so this needs a guess.");
};
//#endregion
//#region src/app.jsx
var levels = {
	beginner: {
		level: "beginner",
		width: 9,
		height: 9,
		mines: 10
	},
	intermediate: {
		level: "intermediate",
		width: 16,
		height: 16,
		mines: 40
	},
	expert: {
		level: "expert",
		width: 30,
		height: 16,
		mines: 99
	},
	extreme: {
		level: "extreme",
		width: 39,
		height: 21,
		mines: 169
	}
};
var levelNames = Object.keys(levels);
var themes = [
	"classic",
	"synthwave",
	"solarized",
	"solarized-phosphor",
	"matrix",
	"nord"
];
var createGame = ({ level, width, height, mines }) => {
	const field = new Array(height);
	for (let y = 0; y < height; y++) {
		field[y] = new Array(width);
		for (let x = 0; x < width; x++) field[y][x] = {
			opened: false,
			mined: false,
			flag: false,
			mark: false,
			num: 0
		};
	}
	return {
		level,
		width,
		height,
		mines,
		field,
		left: width * height - mines,
		pressed: false,
		pressedX: -1,
		pressedY: -1,
		group: false,
		flags: mines,
		start: -1,
		time: 0,
		raf: null,
		lose: false,
		win: false,
		touch: false,
		hinted: false,
		openedAt: {
			x: -1,
			y: -1,
			time: 0
		}
	};
};
var openable = (game, x, y) => {
	const cell = game.field[y][x];
	if (cell.opened) {
		let num = 0;
		for (let offsetX = -1; offsetX <= 1; offsetX++) for (let offsetY = -1; offsetY <= 1; offsetY++) {
			const dx = offsetX + x;
			const dy = offsetY + y;
			if (dx >= 0 && dy >= 0 && dx < game.width && dy < game.height) num += game.field[dy][dx].flag ? 1 : 0;
		}
		return num === cell.num;
	}
	return false;
};
var revealRange = (x, y, fn) => fn(x - 1, y - 1) + fn(x - 1, y + 1) + fn(x + 1, y - 1) + fn(x + 1, y + 1) + fn(x - 1, y) + fn(x + 1, y) + fn(x, y - 1) + fn(x, y + 1);
var customLevel = (data, defaults) => {
	const width = Math.max(9, Math.min(40, parseInt(data.width, 10) || defaults.width));
	const height = Math.max(9, Math.min(30, parseInt(data.height, 10) || defaults.height));
	const mines = parseInt(data.mines, 10) || defaults.mines;
	return {
		level: "custom",
		width,
		height,
		mines: Math.max(10, Math.min(Math.floor(width * height * .8), mines))
	};
};
var loadLevel = () => {
	const level = load("level");
	if (typeof level !== "string") return levels.beginner;
	if (levels[level]) return levels[level];
	const data = level.split(",");
	return customLevel({
		width: data[0],
		height: data[1],
		mines: data[2]
	}, levels.beginner);
};
var loadTheme = () => {
	const theme = load("theme");
	return themes.includes(theme) ? theme : "classic";
};
var timeKey = (level, hinted) => hinted ? `${level}Hints` : level;
var bestTimes = (hinted) => levelNames.map((level) => {
	const key = timeKey(level, hinted);
	return {
		level,
		name: load(`${key}Name`) || "Anonymous",
		time: Math.min(999, parseInt(load(key), 10) || 0) || 999
	};
});
var clearBestTimes = (hinted) => {
	levelNames.forEach((level) => {
		const key = timeKey(level, hinted);
		remove(key);
		remove(`${key}Name`);
	});
	return bestTimes(hinted);
};
var prevent = (event) => {
	event.preventDefault();
	return false;
};
var state = {
	menu: null,
	hint: null,
	game: createGame(loadLevel()),
	marks: Boolean(load("marks")),
	safeStart: load("safeStart") !== "off",
	noGuess: Boolean(load("noGuess")),
	theme: loadTheme(),
	winner: null,
	bestTime: null,
	about: false,
	customField: null,
	backgrounds: loadSettings(),
	backgroundSettings: null,
	zoom: {
		chosen: loadZoom(),
		scale: loadZoom(),
		seen: null
	},
	portrait: Boolean(window.matchMedia && matchMedia("(orientation: portrait)").matches)
};
var actions = {
	init: () => (state, actions) => {
		window.addEventListener("keydown", actions.press);
		if (window.matchMedia) matchMedia("(orientation: portrait)").addEventListener("change", (event) => actions.setPortrait(event.matches));
	},
	setPortrait: (portrait) => ({ portrait }),
	press: (event) => (state, actions) => {
		if ([
			"INPUT",
			"SELECT",
			"TEXTAREA"
		].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
		if (event.keyCode === 113 || event.keyCode === 78) actions.reset();
		else if (event.keyCode === 72) actions.hint();
	},
	reset: (payload) => ({ game }) => {
		cancelAnimationFrame(game.raf);
		const params = payload && levels[payload.level] || payload || game;
		save("level", params.level === "custom" ? [
			params.width,
			params.height,
			params.mines
		].join() : params.level);
		return {
			menu: null,
			hint: null,
			game: createGame(params)
		};
	},
	hint: () => (state) => {
		const { game } = state;
		if (game.win || game.lose) return { menu: null };
		if (game.start < 0) return {
			menu: null,
			hint: noHint("Open a cell first, then ask for a hint.")
		};
		const { field, width, height, flags } = game;
		return {
			menu: null,
			hint: findHint({
				field,
				width,
				height,
				minesLeft: flags,
				transposed: transposed(state)
			}),
			game: {
				...game,
				hinted: true
			}
		};
	},
	touch: ({ event, x, y }) => ({ game }, actions) => {
		if (game.win || game.lose) return null;
		const rect = event.currentTarget.getBoundingClientRect();
		const timer = setTimeout(actions.flag, 600);
		const move = ({ touches }) => {
			if (!touches || touches.length !== 1 || touches[0].clientX < rect.left || touches[0].clientX > rect.right || touches[0].clientY < rect.top || touches[0].clientY > rect.bottom) {
				clearTimeout(timer);
				actions.move({
					x: -1,
					y: -1
				});
			}
		};
		const stop = ({ changedTouches }) => {
			clearTimeout(timer);
			window.removeEventListener("scroll", move);
			window.removeEventListener("touchmove", move);
			window.removeEventListener("touchend", stop);
			window.removeEventListener("touchcancel", stop);
			move({ touches: changedTouches });
			actions.up();
		};
		window.addEventListener("scroll", move);
		window.addEventListener("touchmove", move);
		window.addEventListener("touchend", stop);
		window.addEventListener("touchcancel", stop);
		return { game: {
			...game,
			pressed: true,
			pressedX: x,
			pressedY: y,
			group: event.shiftKey || openable(game, x, y),
			touch: true
		} };
	},
	flag: () => ({ game, marks }) => {
		const { pressedX, pressedY, field, flags } = game;
		if (pressedX < 0 || pressedY < 0) return null;
		const cell = field[pressedY][pressedX];
		if (cell.opened) return null;
		const nextField = game.field.slice();
		nextField[pressedY] = nextField[pressedY].slice();
		const nextCell = {
			...cell,
			flag: marks ? !cell.mark && !cell.flag : !cell.flag,
			mark: marks && cell.flag
		};
		nextField[pressedY][pressedX] = nextCell;
		const mines = cell.flag === nextCell.flag ? flags : flags + (nextCell.flag ? -1 : 1);
		return {
			hint: null,
			game: {
				...game,
				field: nextField,
				flags: mines,
				pressedX: -1,
				pressedY: -1
			}
		};
	},
	down: ({ event, x, y }) => ({ game, marks }, actions) => {
		if (game.touch || event.button > 2 || game.win || game.lose) return null;
		window.addEventListener("mouseup", actions.up);
		let { field, flags } = game;
		const cell = field[y][x];
		if (!game.pressed && event.button === 2 && !field[y][x].opened) {
			field = field.slice();
			field[y] = field[y].slice();
			const nextCell = {
				...cell,
				flag: marks ? !cell.mark && !cell.flag : !cell.flag,
				mark: marks && cell.flag
			};
			field[y][x] = nextCell;
			flags = cell.flag === nextCell.flag ? flags : flags + (nextCell.flag ? -1 : 1);
		}
		return {
			...field !== game.field && { hint: null },
			game: {
				...game,
				field,
				pressed: event.button !== 2,
				pressedX: x,
				pressedY: y,
				group: event.shiftKey || event.buttons > 2,
				flags
			}
		};
	},
	chord: ({ x, y }) => ({ game }, actions) => {
		if (game.win || game.lose) return null;
		if (!openable(game, x, y)) {
			const { openedAt } = game;
			return openedAt.x === x && openedAt.y === y && performance.now() - openedAt.time < 500 ? null : { hint: explainChord(game, x, y) };
		}
		actions.aim({
			x,
			y
		});
		actions.up();
		return null;
	},
	aim: ({ x, y }) => ({ game }) => ({ game: {
		...game,
		pressed: false,
		pressedX: x,
		pressedY: y,
		group: true
	} }),
	move: ({ x, y }) => ({ game }) => {
		if (x === game.pressedX && y === game.pressedY) return null;
		return { game: {
			...game,
			pressedX: x,
			pressedY: y
		} };
	},
	up: () => ({ game, safeStart, noGuess }, actions) => {
		window.removeEventListener("mouseup", actions.up);
		const { width, height, pressedX, pressedY } = game;
		if (game.win || game.lose || pressedX < 0 || pressedY < 0) {
			if (!game.pressed && !game.group) return null;
			return { game: {
				...game,
				pressed: false,
				group: false
			} };
		}
		const field = game.field.map((row) => row.map((c) => ({ ...c })));
		const outBounds = (x, y) => x < 0 || y < 0 || x >= width || y >= height;
		const calcNear = (x, y, fn) => {
			let num = 0;
			for (let offsetX = -1; offsetX <= 1; offsetX++) for (let offsetY = -1; offsetY <= 1; offsetY++) if (!outBounds(offsetX + x, offsetY + y)) num += fn(field[offsetY + y][offsetX + x]) ? 1 : 0;
			return num;
		};
		let { left, lose } = game;
		const reveal = (x, y) => {
			if (outBounds(x, y)) return 0;
			const c = field[y][x];
			if (c.opened || c.flag) return 0;
			c.opened = true;
			c.num = calcNear(x, y, (i) => i.mined);
			if (c.mined) lose = true;
			if (c.num) return 1;
			return revealRange(x, y, reveal) + 1;
		};
		const begin = game.start < 0 && game.pressed && !game.group && !field[pressedY][pressedX].flag;
		if (begin) {
			const { mined } = placeMines({
				width,
				height,
				mines: game.mines,
				x: pressedX,
				y: pressedY,
				safe: safeStart,
				noGuess
			});
			field.forEach((row, y) => row.forEach((c, x) => c.mined = mined[y * width + x] === 1));
			game.raf = requestAnimationFrame(actions.tick);
		}
		const cell = field[pressedY][pressedX];
		const wasOpened = cell.opened;
		let chordHint = null;
		if (game.group) {
			if (cell.opened) {
				if (calcNear(pressedX, pressedY, (c) => c.flag) === cell.num) left -= revealRange(pressedX, pressedY, reveal);
				else chordHint = explainChord({
					field,
					width,
					height
				}, pressedX, pressedY);
			}
		} else if (game.pressed) {
			if (game.touch && wasOpened) chordHint = explainChord({
				field,
				width,
				height
			}, pressedX, pressedY);
			left -= reveal(pressedX, pressedY);
		}
		const win = left <= 0;
		if (win || lose) {
			cancelAnimationFrame(game.raf);
			if (!lose) actions.win();
		}
		const changed = left !== game.left || lose || begin;
		return {
			...(chordHint || changed) && { hint: chordHint },
			game: {
				...game,
				left,
				field,
				openedAt: !wasOpened && cell.opened ? {
					x: pressedX,
					y: pressedY,
					time: performance.now()
				} : game.openedAt,
				pressed: false,
				group: false,
				start: begin ? performance.now() : game.start,
				time: begin ? 1 : game.time,
				lose,
				win,
				touch: false
			}
		};
	},
	tick: (now) => ({ game }, actions) => {
		game.raf = requestAnimationFrame(actions.tick);
		const next = Math.floor((now - game.start) / 1e3) + 1;
		if (game.time === next) return null;
		return { game: {
			...game,
			time: next
		} };
	},
	win: () => ({ game }) => {
		if (game.level === "custom") return null;
		const time = parseInt(load(timeKey(game.level, game.hinted)), 10);
		if (time && time <= game.time) return null;
		return { winner: {
			name: "Anonymous",
			time: game.time,
			level: game.level,
			hinted: game.hinted
		} };
	},
	changeWinner: (payload) => ({ winner }) => ({ winner: {
		...winner,
		...payload
	} }),
	submitBestTime: (event) => ({ winner }, actions) => {
		event.preventDefault();
		const key = timeKey(winner.level, winner.hinted);
		save(key, winner.time);
		save(`${key}Name`, winner.name.trim());
		actions.toggleBestTime();
		actions.setBestTimeTab(winner.hinted ? "hinted" : "clean");
		return { winner: null };
	},
	toggleAbout: () => ({ about }) => ({
		menu: null,
		about: !about
	}),
	toggleBestTime: () => ({ bestTime }) => ({
		menu: null,
		bestTime: bestTime ? null : {
			tab: "clean",
			clean: bestTimes(false),
			hinted: bestTimes(true)
		}
	}),
	setBestTimeTab: (tab) => (state) => state.bestTime ? { bestTime: {
		...state.bestTime,
		tab
	} } : null,
	resetBestTime: () => ({ bestTime }) => ({ bestTime: {
		...bestTime,
		[bestTime.tab]: clearBestTimes(bestTime.tab === "hinted")
	} }),
	toggleCustomField: () => ({ game, customField }) => ({
		menu: null,
		customField: customField ? null : {
			width: String(game.width),
			height: String(game.height),
			mines: String(game.mines)
		}
	}),
	changeCustomField: (payload) => ({ customField }) => ({ customField: {
		...customField,
		...payload
	} }),
	submitCustomField: (event) => ({ game, customField }, actions) => {
		event.preventDefault();
		actions.reset(customLevel(customField, game));
		return { customField: null };
	},
	toggleSafeStart: () => (state) => {
		const safeStart = !state.safeStart;
		save("safeStart", safeStart ? "" : "off");
		return {
			menu: null,
			safeStart
		};
	},
	toggleNoGuess: () => (state) => {
		const noGuess = !state.noGuess;
		save("noGuess", noGuess ? "yes" : "");
		return {
			menu: null,
			noGuess
		};
	},
	toggleMarks: () => (state) => {
		const marks = !state.marks;
		save("marks", marks ? "yes" : "");
		return {
			menu: null,
			marks
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
var view = (state, actions) => /* @__PURE__ */ h("main", {
	oncontextmenu: prevent,
	ondragstart: prevent,
	oncreate: actions.init
}, state.game && /* @__PURE__ */ h(Game, {
	key: "a",
	state,
	actions
}), state.winner && /* @__PURE__ */ h(Winner, {
	key: "b",
	state: state.winner,
	actions
}), state.bestTime && /* @__PURE__ */ h(BestTime, {
	key: "c",
	state: state.bestTime,
	actions
}), state.customField && /* @__PURE__ */ h(CustomField, {
	key: "d",
	state: state.customField,
	actions
}), state.backgroundSettings && /* @__PURE__ */ h(BackgroundSettings, {
	key: "e",
	state: state.backgroundSettings,
	actions
}), state.about && /* @__PURE__ */ h(About, {
	key: "f",
	actions
}));
//#endregion
//#region src/index.js
app(state, actions, view, document.getElementById("app"));
startBackgrounds();
if ("serviceWorker" in navigator && true) navigator.serviceWorker.register("service-worker.js").catch(() => {});
//#endregion
