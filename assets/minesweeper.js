import { B as Dialog, C as SideButton, D as Menu, E as Digit, H as Game_module_default, I as load, L as remove, M as startBackgrounds, R as save, S as HintIcon, T as Play, U as app, V as Button, W as h, _ as Overlay, a as shellState, b as watchWindow, c as Boss, d as Link, f as BackgroundSettings, g as Input, h as Winner, i as shellActions, l as BossButton, m as BestTime_module_default, n as pauseAction, o as shortcut, p as Tabs, r as listen, t as registerWorker, u as About, v as HintPanel, x as WindowControls, y as PausedCover } from "./worker-BWwFziXg.js";
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
	hintSource: "Cell_hintSource Board_outline",
	hintSafe: "Cell_hintSafe Board_outline",
	hintMine: "Cell_hintMine Board_outline",
	hintWrong: "Cell_hintWrong Board_outline",
	hintUnsure: "Cell_hintUnsure Board_outline"
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
//#region src/Game.jsx
var running = ({ start, win, lose }) => start >= 0 && !win && !lose;
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
var Face = ({ state, actions }) => /* @__PURE__ */ h(Play, {
	pressed: state.game.pressed,
	lose: state.game.lose,
	win: state.game.win,
	onReset: actions.reset
});
var Game = ({ key, state, actions }) => /* @__PURE__ */ h(Dialog, {
	key,
	title: state.theme === "classic" ? "Minesweeper" : "Minesweeper Plus",
	titleHint: "Double-click for 100% zoom",
	onTitleDoubleClick: () => actions.zoom(0),
	controls: /* @__PURE__ */ h(WindowControls, {
		scale: state.zoom.scale,
		onZoom: actions.zoom,
		paused: state.game.paused,
		canPause: running(state.game),
		onPause: actions.pause
	}),
	onCreate: (dialog) => {
		watchWindow(dialog, actions.fit);
		actions.fit();
	}
}, /* @__PURE__ */ h(Menu, {
	state,
	actions
}), /* @__PURE__ */ h("div", { class: Game_module_default.root }, /* @__PURE__ */ h("div", { class: Game_module_default.scoreboard }, /* @__PURE__ */ h(Digit, { value: state.game.flags }), state.theme === "classic" ? /* @__PURE__ */ h(Face, {
	state,
	actions
}) : /* @__PURE__ */ h("div", { class: Game_module_default.buttons }, /* @__PURE__ */ h(Face, {
	state,
	actions
}), /* @__PURE__ */ h(SideButton, {
	title: "Hint (H)",
	disabled: state.game.win || state.game.lose || state.game.paused,
	onClick: actions.hint
}, /* @__PURE__ */ h(HintIcon, null))), /* @__PURE__ */ h(Digit, { value: state.game.time })), /* @__PURE__ */ h("div", { class: state.game.lose ? Game_module_default.fieldLost : Game_module_default.field }, rowsOf(state).map((row) => /* @__PURE__ */ h("div", { class: running(state.game) && !state.game.paused ? Game_module_default.active : Game_module_default.inactive }, row.map(({ cell, x, y }) => /* @__PURE__ */ h(Cell, {
	x,
	y,
	pressed: state.game.pressed,
	pressedX: state.game.pressedX,
	pressedY: state.game.pressedY,
	group: state.game.group,
	opened: cell.opened && !state.game.paused,
	mined: cell.mined,
	flag: cell.flag && !state.game.paused,
	mark: cell.mark && !state.game.paused,
	num: cell.num,
	hint: !state.game.paused && state.hint && state.hint.marks[y * state.game.width + x],
	lose: state.game.lose,
	onDown: actions.down,
	onMove: actions.move,
	onTouch: actions.touch,
	onChord: actions.chord
})))), state.game.paused && /* @__PURE__ */ h(PausedCover, { onResume: () => actions.pause(false) })), state.hint && !state.game.paused && /* @__PURE__ */ h(HintPanel, { text: state.hint.text })));
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
}, /* @__PURE__ */ h("div", { class: BestTime_module_default.root }, /* @__PURE__ */ h(Tabs, {
	tabs,
	active: state.tab,
	onSelect: actions.setBestTimeTab
}), /* @__PURE__ */ h("table", { class: BestTime_module_default.table }, /* @__PURE__ */ h("tbody", null, state[state.tab].map((row) => /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.level, ":"), /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.time, " seconds"), /* @__PURE__ */ h("td", { class: BestTime_module_default.cell }, row.name))))), /* @__PURE__ */ h("div", { class: BestTime_module_default.footer }, /* @__PURE__ */ h(Button, {
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
//#region src/About.jsx
var MinesweeperAbout = ({ key, actions }) => /* @__PURE__ */ h(About, {
	key,
	name: "Minesweeper Plus",
	actions
}, /* @__PURE__ */ h("p", null, "A Windows style minesweeper with boards that never need a guess, hints that explain their reasoning, zoom, and animated themes ported from xscreensaver."), /* @__PURE__ */ h("p", null, "Based on ", /* @__PURE__ */ h(Link, { href: "https://github.com/frenzzy/minesweeper" }, "Minesweeper"), " by Vladimir Kutepov, extended by fexofenadine."));
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
var allMines = (n) => n === 1 ? "it is a mine" : "they are all mines";
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
			return hint("mine", hidden, [i], `The highlighted ${num} ${needs}, and has exactly ${count(need, "hidden neighbour")} left, so ${allMines(need)}.`);
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
			return hint("mine", rest, [a, b], `${shared}, so the ${cells[b].num} needs ${extra} more among its ${count(rest.length, "other hidden neighbour")}, and ${allMines(rest.length)}.`);
		}
	}
	const left = [];
	cells.forEach((c, i) => !c.opened && !c.flag && left.push(i));
	if (left.length && minesLeft === 0) return hint("clear", left, [], "The mine counter is at 0, so every hidden cell without a flag is safe.");
	if (left.length && minesLeft === left.length) return hint("mine", left, [], `The mine counter shows ${minesLeft} and exactly ${count(left.length, "hidden cell")} without a flag ${left.length === 1 ? "is" : "are"} left, so ${allMines(left.length)}.`);
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
		paused: false,
		pausedAt: 0,
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
var toggleFlag = (game, x, y, marks) => {
	const cell = game.field[y][x];
	const field = game.field.slice();
	field[y] = field[y].slice();
	field[y][x] = {
		...cell,
		flag: marks ? !cell.mark && !cell.flag : !cell.flag,
		mark: marks && cell.flag
	};
	const change = cell.flag === field[y][x].flag ? 0 : field[y][x].flag ? -1 : 1;
	return {
		field,
		flags: game.flags + change
	};
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
	...shellState(),
	hint: null,
	game: createGame(loadLevel()),
	marks: Boolean(load("marks")),
	safeStart: load("safeStart") !== "off",
	noGuess: Boolean(load("noGuess")),
	winner: null,
	bestTime: null,
	about: false,
	customField: null
};
var actions = {
	...shellActions,
	init: () => (state, actions) => {
		window.addEventListener("keydown", actions.press);
		listen(actions);
	},
	press: (event) => (state, actions) => {
		const key = shortcut(event, state, actions);
		if (key === 113 || key === 78) actions.reset();
		else if (key === 72) actions.hint();
		else if (key === 80) actions.pause();
	},
	pause: pauseAction(running, (game, actions) => {
		window.removeEventListener("mouseup", actions.up);
		return {
			pressed: false,
			group: false,
			pressedX: -1,
			pressedY: -1
		};
	}),
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
		if (game.win || game.lose || game.paused) return { menu: null };
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
		if (game.win || game.lose || game.paused) return null;
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
		const { pressedX, pressedY } = game;
		if (game.paused || pressedX < 0 || pressedY < 0 || game.field[pressedY][pressedX].opened) return null;
		return {
			hint: null,
			game: {
				...game,
				...toggleFlag(game, pressedX, pressedY, marks),
				pressedX: -1,
				pressedY: -1
			}
		};
	},
	down: ({ event, x, y }) => ({ game, marks }, actions) => {
		if (game.touch || event.button > 2 || game.win || game.lose || game.paused) return null;
		window.addEventListener("mouseup", actions.up);
		const { field, flags } = !game.pressed && event.button === 2 && !game.field[y][x].opened ? toggleFlag(game, x, y, marks) : game;
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
		if (game.win || game.lose || game.paused) return null;
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
		if (game.win || game.lose || game.paused || pressedX < 0 || pressedY < 0) {
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
}), /* @__PURE__ */ h(BossButton, {
	key: "h",
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
}), state.about && /* @__PURE__ */ h(MinesweeperAbout, {
	key: "f",
	actions
}), state.boss && /* @__PURE__ */ h(Boss, {
	key: "g",
	state: state.boss,
	actions
}));
//#endregion
//#region src/index.js
app(state, actions, view, document.getElementById("app"));
startBackgrounds();
registerWorker();
//#endregion
