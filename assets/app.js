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
	close: "Dialog_close"
};
var Button_module_default = { root: "Button_root" };
//#endregion
//#region src/Button.jsx
var Button = ({ key, type, tabIndex, onClick, onCreate }, children) => /* @__PURE__ */ h("button", {
	key,
	class: Button_module_default.root,
	type,
	tabindex: tabIndex,
	onclick: onClick,
	oncreate: onCreate
}, children);
//#endregion
//#region src/Dialog.jsx
var Dialog = ({ key, title, onClose }, children) => /* @__PURE__ */ h("div", { key }, /* @__PURE__ */ h("div", { class: Dialog_module_default.a }, /* @__PURE__ */ h("div", { class: Dialog_module_default.b }, /* @__PURE__ */ h("div", { class: Dialog_module_default.dialog }, /* @__PURE__ */ h("div", { class: Dialog_module_default.container }, title && /* @__PURE__ */ h("div", { class: Dialog_module_default.header }, /* @__PURE__ */ h("h1", { class: Dialog_module_default.title }, title), onClose && /* @__PURE__ */ h("div", { class: Dialog_module_default.button }, /* @__PURE__ */ h(Button, {
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
	name: "Solarized Dark",
	checked: state.theme === "solarized",
	onClick: () => actions.setTheme("solarized")
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Matrix",
	checked: state.theme === "matrix",
	onClick: () => actions.setTheme("matrix")
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
	hintWrong: "Cell_hintWrong"
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
	wrong: Cell_module_default.hintWrong
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
var Grip_module_default = {
	bar: "Grip_bar",
	grip: "Grip_grip"
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
//#region src/Grip.jsx
var root$5 = document.documentElement;
var clampScale = (scale) => Math.round(Math.min(4, Math.max(.5, scale)) * 20) / 20;
var setScale = (scale) => {
	root$5.style.setProperty("--scale", scale);
	save("scale", scale);
};
var resize = (event) => {
	event.preventDefault();
	const grip = event.currentTarget;
	const rect = grip.offsetParent.getBoundingClientRect();
	const scale = parseFloat(root$5.style.getPropertyValue("--scale")) || 1;
	const move = ({ clientX, clientY }) => {
		const wide = (rect.width + 2 * (clientX - event.clientX)) / rect.width;
		const tall = (rect.height + 2 * (clientY - event.clientY)) / rect.height;
		setScale(clampScale(scale * (Math.abs(wide - 1) > Math.abs(tall - 1) ? wide : tall)));
	};
	const stop = () => {
		grip.removeEventListener("pointermove", move);
		grip.removeEventListener("pointerup", stop);
		grip.removeEventListener("pointercancel", stop);
	};
	grip.setPointerCapture(event.pointerId);
	grip.addEventListener("pointermove", move);
	grip.addEventListener("pointerup", stop);
	grip.addEventListener("pointercancel", stop);
};
var Grip = () => /* @__PURE__ */ h("div", { class: Grip_module_default.bar }, /* @__PURE__ */ h("div", {
	class: Grip_module_default.grip,
	title: "Drag to resize, double click to reset",
	onpointerdown: resize,
	ondblclick: () => setScale(1)
}));
//#endregion
//#region src/Game.jsx
var Game = ({ key, state, actions }) => /* @__PURE__ */ h(Dialog, {
	key,
	title: "Minesweeper"
}, /* @__PURE__ */ h(Menu, {
	state,
	actions
}), /* @__PURE__ */ h("div", { class: Game_module_default.root }, /* @__PURE__ */ h("div", { class: Game_module_default.scoreboard }, /* @__PURE__ */ h(Digit, { value: state.game.flags }), /* @__PURE__ */ h(Play, {
	pressed: state.game.pressed,
	lose: state.game.lose,
	win: state.game.win,
	onReset: actions.reset
}), /* @__PURE__ */ h(Digit, { value: state.game.time })), /* @__PURE__ */ h("div", { class: state.game.lose ? Game_module_default.fieldLost : Game_module_default.field }, state.game.field.map((row, y) => /* @__PURE__ */ h("div", { class: state.game.win || state.game.lose ? Game_module_default.inactive : Game_module_default.active }, row.map((cell, x) => /* @__PURE__ */ h(Cell, {
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
}, state.hint.text)), /* @__PURE__ */ h(Grip, null));
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
var where = (a, b, width) => {
	const dx = b % width - a % width;
	const dy = Math.floor(b / width) - Math.floor(a / width);
	const v = dy < 0 ? "above" : dy > 0 ? "below" : "";
	const h = dx < 0 ? "left" : dx > 0 ? "right" : "";
	if (v && h) return `${v} and to the ${h} of it`;
	return v ? `${v} it` : `to the ${h} of it`;
};
var hint = (kind, cells, sources, text) => {
	const role = {
		clear: "safe",
		mine: "mine",
		conflict: "wrong"
	}[kind];
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
var findHint = ({ field, width, height, minesLeft }) => {
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
			const shared = `Every hidden cell next to the highlighted ${cells[a].num} is also next to the ${cells[b].num} ${where(a, b, width)}. Those shared cells hold exactly ${count(A.need, "mine")}`;
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
	}
};
var levelNames = Object.keys(levels);
var themes = [
	"classic",
	"synthwave",
	"solarized",
	"matrix"
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
		hinted: false
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
	customField: null
};
var actions = {
	init: () => (state, actions) => {
		window.addEventListener("keydown", actions.press);
	},
	press: (event) => (state, actions) => {
		if (event.target.tagName === "INPUT" || event.ctrlKey || event.metaKey || event.altKey) return;
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
	hint: () => ({ game }) => {
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
				minesLeft: flags
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
		return {
			hint: null,
			game: {
				...game,
				pressed: true,
				pressedX: x,
				pressedY: y,
				group: event.shiftKey || openable(game, x, y),
				touch: true
			}
		};
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
		return { game: {
			...game,
			field: nextField,
			flags: mines,
			pressedX: -1,
			pressedY: -1
		} };
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
			hint: null,
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
		if (game.win || game.lose || !openable(game, x, y)) return null;
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
		if (game.group) {
			if (cell.opened) {
				if (calcNear(pressedX, pressedY, (c) => c.flag) === cell.num) left -= revealRange(pressedX, pressedY, reveal);
			}
		} else if (game.pressed) left -= reveal(pressedX, pressedY);
		const win = left <= 0;
		if (win || lose) {
			cancelAnimationFrame(game.raf);
			if (!lose) actions.win();
		}
		return {
			hint: null,
			game: {
				...game,
				left,
				field,
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
}));
//#endregion
//#region src/rain.js
var GRID_SIZE = 70;
var GRID_DEPTH = 35;
var WAVE_SIZE = 22;
var SPLASH_RATIO = .7;
var STRIPS = 44;
var TICK = 30;
var glyphs = [..."ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789"];
var frand = (n) => Math.random() * n;
var bellrand = (n) => (frand(n) + frand(n) + frand(n)) / 3;
var randomGlyph = () => Math.floor(Math.random() * glyphs.length) + 1;
var ramp = Array.from({ length: WAVE_SIZE }, (_, i) => {
	return .2 + Math.sin((WAVE_SIZE - i) / 21 * Math.PI / 2) * .8;
});
var resetStrip = (s) => {
	s.x = frand(GRID_SIZE) - GRID_SIZE / 2;
	s.y = GRID_SIZE / 2 + bellrand(.5);
	s.z = GRID_DEPTH * .2 - frand(GRID_DEPTH * .7);
	s.dz = bellrand(.02);
	s.erasing = false;
	s.spinnerY = 0;
	s.spinnerSpeed = bellrand(.3);
	s.spinnerGlyph = -randomGlyph();
	s.spinSpeed = Math.floor(bellrand(2)) + 1;
	s.spinTick = 0;
	s.wavePosition = 0;
	s.waveSpeed = Math.floor(bellrand(3)) + 1;
	s.waveTick = 0;
	s.glyphs = Array.from({ length: GRID_SIZE }, () => {
		if (!Math.floor(Math.random() * 7)) return 0;
		const g = randomGlyph();
		return Math.floor(Math.random() * 20) ? g : -g;
	});
};
var tickStrip = (s) => {
	s.z += s.dz;
	if (s.z > GRID_DEPTH * SPLASH_RATIO) return resetStrip(s);
	s.spinnerY += s.spinnerSpeed;
	if (s.spinnerY >= GRID_SIZE) {
		if (s.erasing) return resetStrip(s);
		s.erasing = true;
		s.spinnerY = 0;
		s.spinnerSpeed /= 2;
	}
	if (++s.spinTick > s.spinSpeed) {
		s.spinTick = 0;
		s.spinnerGlyph = -randomGlyph();
		s.glyphs.forEach((g, i) => {
			if (g >= 0) return;
			s.glyphs[i] = Math.floor(Math.random() * 800) ? -randomGlyph() : randomGlyph();
		});
	}
	if (++s.waveTick > s.waveSpeed) {
		s.waveTick = 0;
		s.wavePosition = (s.wavePosition + 1) % WAVE_SIZE;
	}
};
var PAD = 1.6;
var buildAtlas = (cell) => {
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
var startRain = () => {
	const root = document.documentElement;
	const canvas = document.createElement("canvas");
	canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:none;filter:blur(0.6px)";
	document.body.prepend(canvas);
	const context = canvas.getContext("2d");
	const cell = 96;
	let atlas = null;
	const strips = Array.from({ length: STRIPS }, () => {
		const s = {};
		resetStrip(s);
		s.erasing = Math.random() < .5;
		s.spinnerY = frand(GRID_SIZE);
		return s;
	});
	let width = 0;
	let height = 0;
	const resize = () => {
		const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
		width = canvas.width = Math.round(innerWidth * ratio);
		height = canvas.height = Math.round(innerHeight * ratio);
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
			brightness *= .2 + (z / GRID_DEPTH + .5) * .8;
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
				glyph(g, s.x, s.y - i, s.z, ramp[Math.min(wave, 21)]);
			});
			if (!s.erasing) glyph(s.spinnerGlyph, s.x, s.y - s.spinnerY, s.z, 1);
		}
	};
	let frame = null;
	let last = 0;
	const loop = (now) => {
		frame = requestAnimationFrame(loop);
		if (now - last < TICK) return;
		const ticks = Math.min(3, Math.floor((now - last) / TICK));
		last = now;
		for (let n = 0; n < ticks; n++) strips.forEach(tickStrip);
		draw();
	};
	const update = () => {
		const on = root.dataset.theme === "matrix";
		canvas.style.display = on ? "block" : "none";
		if (on && !frame) {
			atlas ??= buildAtlas(cell);
			resize();
			last = performance.now();
			frame = requestAnimationFrame(loop);
		} else if (!on && frame) {
			cancelAnimationFrame(frame);
			frame = null;
		}
	};
	new MutationObserver(update).observe(root, {
		attributes: true,
		attributeFilter: ["data-theme"]
	});
	window.addEventListener("resize", () => frame && resize());
	update();
};
//#endregion
//#region src/index.js
app(state, actions, view, document.getElementById("app"));
startRain();
if ("serviceWorker" in navigator && true) navigator.serviceWorker.register("service-worker.js").catch(() => {});
//#endregion
