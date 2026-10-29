import { A as SubMenuItem, B as Dialog, C as SideButton, E as Digit, F as glyphImage, H as Game_module_default$1, I as load, L as remove, M as startBackgrounds, N as BRIGHT, O as MenuItem, P as GLYPH, R as save, S as HintIcon, T as Play, U as app, V as Button, W as h, _ as Overlay, a as shellState, b as watchWindow, c as Boss, d as Link, f as BackgroundSettings, h as Winner, i as shellActions, j as ThemeMenu, k as Separator, l as BossButton, m as BestTime_module_default, n as pauseAction, o as shortcut, p as Tabs, r as listen, s as typing, t as registerWorker, u as About, v as HintPanel, w as UndoIcon, x as WindowControls, y as PausedCover, z as Menu_module_default } from "./worker-D-X_Ba-8.js";
var Game_module_default = {
	field: "Game_field",
	active: "Game_active Game_field",
	inactive: "Game_inactive Game_field"
};
var sizes = [
	6,
	8,
	10,
	12,
	14
];
var lineCache = {};
var cellCache = {};
var linesOf = (n) => lineCache[n] ??= Array.from({ length: 1 << n }, (_, mask) => mask).filter((mask) => {
	let ones = 0;
	for (let k = 0; k < n; k++) {
		ones += mask >> k & 1;
		if (k >= 2) {
			const run = mask >> k - 2 & 7;
			if (run === 0 || run === 7) return false;
		}
	}
	return ones * 2 === n;
});
var cellsOf = (n) => cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) => Array.from({ length: n }, (_, k) => line < n ? line * n + k : k * n + line - n));
var readLine = (board, cells) => {
	let known = 0;
	let value = 0;
	for (let k = 0; k < cells.length; k++) {
		const v = board[cells[k]];
		if (v !== -1) {
			known |= 1 << k;
			if (v) value |= 1 << k;
		}
	}
	return {
		known,
		value
	};
};
var emptyBoard = (n) => new Int8Array(n * n).fill(-1);
var full = (board) => !board.includes(-1);
var lineName = (line, n) => line < n ? `row ${line + 1}` : `column ${line - n + 1}`;
var capital = (text) => text[0].toUpperCase() + text.slice(1);
var breaks = (board, n) => {
	const found = [];
	const lines = cellsOf(n);
	const done = /* @__PURE__ */ new Map();
	lines.forEach((cells, line) => {
		const name = lineName(line, n);
		for (let k = 2; k < n; k++) {
			const v = board[cells[k]];
			if (v !== -1 && v === board[cells[k - 1]] && v === board[cells[k - 2]]) found.push({
				cells: [
					cells[k - 2],
					cells[k - 1],
					cells[k]
				],
				text: `${capital(name)} has three ${v}s in a row.`
			});
		}
		for (const v of [0, 1]) {
			const same = cells.filter((i) => board[i] === v);
			if (same.length * 2 > n) found.push({
				cells: same,
				text: `${capital(name)} has ${same.length} ${v}s, but only ${n / 2} fit in a line of ${n}.`
			});
		}
		const { known, value } = readLine(board, cells);
		if (known !== (1 << n) - 1) return;
		const key = `${line < n ? "r" : "c"}${value}`;
		if (done.has(key)) {
			const twin = done.get(key);
			found.push({
				cells: [...lines[twin], ...cells],
				text: `${capital(lineName(twin, n))} and ${name} are the same, and no two ${line < n ? "rows" : "columns"} may match.`
			});
		} else done.set(key, line);
	});
	return found;
};
var violations = (board, n) => new Set(breaks(board, n).flatMap((b) => b.cells));
var solved = (board, n) => full(board) && violations(board, n).size === 0;
//#endregion
//#region src/takuzu/solver.js
var startCandidates = (n) => Array.from({ length: 2 * n }, () => linesOf(n));
var propagate = (board, n, candidates) => {
	const lines = cellsOf(n);
	const all = (1 << n) - 1;
	const next = candidates.slice();
	let changed = true;
	while (changed) {
		changed = false;
		const done = [/* @__PURE__ */ new Set(), /* @__PURE__ */ new Set()];
		for (let line = 0; line < 2 * n; line++) {
			const { known, value } = readLine(board, lines[line]);
			if (known !== all) continue;
			const seen = done[line < n ? 0 : 1];
			if (seen.has(value)) return null;
			seen.add(value);
		}
		for (let line = 0; line < 2 * n; line++) {
			const cells = lines[line];
			const { known, value } = readLine(board, cells);
			if (known === all) {
				if (!next[line].includes(value)) return null;
				next[line] = [value];
				continue;
			}
			const seen = done[line < n ? 0 : 1];
			const fits = next[line].filter((mask) => (mask & known) === value && !seen.has(mask));
			if (!fits.length) return null;
			next[line] = fits;
			let ones = all;
			let any = 0;
			for (const mask of fits) {
				ones &= mask;
				any |= mask;
			}
			const fill = (ones | ~any) & all & ~known;
			if (!fill) continue;
			for (let k = 0; k < n; k++) if (fill >> k & 1) board[cells[k]] = ones >> k & 1;
			changed = true;
		}
	}
	return next;
};
var search = (board, n, candidates, limit, order, found, budget) => {
	if (--budget.left < 0) return 0;
	const narrowed = propagate(board, n, candidates);
	if (!narrowed) return 0;
	let pick = -1;
	for (let line = 0; line < 2 * n; line++) {
		const count = narrowed[line].length;
		if (count > 1 && (pick < 0 || count < narrowed[pick].length)) pick = line;
	}
	if (pick < 0) {
		found.push(board);
		return 1;
	}
	const cells = cellsOf(n)[pick];
	let total = 0;
	for (const mask of order(narrowed[pick])) {
		const copy = board.slice();
		cells.forEach((i, k) => copy[i] = mask >> k & 1);
		const branch = narrowed.slice();
		branch[pick] = [mask];
		total += search(copy, n, branch, limit - total, order, found, budget);
		if (total >= limit) break;
	}
	return total;
};
var asIs = (list) => list;
var countSolutions = (board, n, limit = 2) => search(board.slice(), n, startCandidates(n), limit, asIs, [], { left: Infinity });
var solve = (board, n, shuffle = asIs, tries = Infinity) => {
	const found = [];
	search(board.slice(), n, startCandidates(n), 1, shuffle, found, { left: tries });
	return found[0] ?? null;
};
//#endregion
//#region src/takuzu/techniques.js
var levels = [
	"easy",
	"medium",
	"tricky",
	"hard",
	"expert"
];
var words = [
	"no",
	"one",
	"two",
	"three",
	"four",
	"five",
	"six",
	"seven"
];
var many = (count, v) => `${words[count]} ${v}${count === 1 ? "" : "s"}`;
var result = (place) => {
	if (place.length === 1) return `this cell must be a ${place[0][1]}`;
	const v = place[0][1];
	if (place.every((p) => p[1] === v)) return `these cells must all be ${v}s`;
	return "these cells must be filled as highlighted";
};
var step = (technique, level, place, sources, text) => ({
	technique,
	level,
	place,
	sources,
	text
});
var pairs = (board, n) => {
	const steps = [];
	cellsOf(n).forEach((cells, line) => {
		for (let k = 0; k + 1 < n; k++) {
			const v = board[cells[k]];
			if (v === -1 || v !== board[cells[k + 1]]) continue;
			for (const j of [k - 1, k + 2]) {
				if (j < 0 || j >= n || board[cells[j]] !== -1) continue;
				steps.push(step("pair", 0, [[cells[j], 1 - v]], [cells[k], cells[k + 1]], `Two ${v}s side by side in ${lineName(line, n)} can't have a third ${v} next to them, so this cell is a ${1 - v}.`));
			}
		}
	});
	return steps;
};
var gaps = (board, n) => {
	const steps = [];
	cellsOf(n).forEach((cells, line) => {
		for (let k = 0; k + 2 < n; k++) {
			const v = board[cells[k]];
			if (v === -1 || v !== board[cells[k + 2]] || board[cells[k + 1]] !== -1) continue;
			steps.push(step("gap", 0, [[cells[k + 1], 1 - v]], [cells[k], cells[k + 2]], `The gap between two ${v}s in ${lineName(line, n)} would make three in a row as a ${v}, so it is a ${1 - v}.`));
		}
	});
	return steps;
};
var counts = (board, n) => {
	const steps = [];
	cellsOf(n).forEach((cells, line) => {
		const empty = cells.filter((i) => board[i] === -1);
		if (!empty.length) return;
		for (const v of [0, 1]) {
			const same = cells.filter((i) => board[i] === v);
			if (same.length * 2 !== n) continue;
			const place = empty.map((i) => [i, 1 - v]);
			steps.push(step("count", 1, place, same, `${capital(lineName(line, n))} already has all ${n / 2} of its ${v}s, so ${result(place)}.`));
		}
	});
	return steps;
};
var oneLeft = (board, n) => {
	const steps = [];
	cellsOf(n).forEach((cells, line) => {
		const empty = cells.filter((i) => board[i] === -1);
		if (empty.length < 2) return;
		for (const v of [0, 1]) {
			if (n / 2 - cells.filter((i) => board[i] === v).length !== 1) continue;
			const blocked = empty.filter((spot) => {
				const trial = cells.map((i) => i === spot ? v : board[i] === -1 ? 1 - v : board[i]);
				return trial.some((x, k) => k >= 2 && x === trial[k - 1] && x === trial[k - 2]);
			});
			if (!blocked.length) continue;
			if (blocked.length === empty.length) {
				steps.push({ contradiction: true });
				return;
			}
			const place = blocked.map((i) => [i, 1 - v]);
			steps.push(step("one-left", 2, place, cells.filter((i) => board[i] !== -1), `${capital(lineName(line, n))} needs just one more ${v}, and in ${place.length > 1 ? "any of these cells" : "this cell"} it would leave three alike in a row, so ${result(place)}.`));
		}
	});
	return steps;
};
var twins = (board, n) => {
	const steps = [];
	const lines = cellsOf(n);
	const all = (1 << n) - 1;
	lines.forEach((cells, line) => {
		const empty = cells.filter((i) => board[i] === -1);
		if (empty.length !== 2) return;
		const { known, value } = readLine(board, cells);
		const twin = lines.findIndex((other, l) => {
			if (l === line || l < n !== line < n) return false;
			const done = readLine(board, other);
			return done.known === all && (done.value & known) === value;
		});
		if (twin < 0) return;
		const place = empty.map((i) => [i, 1 - board[lines[twin][cells.indexOf(i)]]]);
		if (place[0][1] === place[1][1]) return;
		steps.push(step("twins", 2, place, [...cells, ...lines[twin]].filter((i) => board[i] !== -1), `${capital(lineName(line, n))} matches ${lineName(twin, n)} except for these two cells, and no two ${line < n ? "rows" : "columns"} may match, so they go the other way round.`));
	});
	return steps;
};
var fitsOf = (board, cells, n, repeats) => {
	const { known, value } = readLine(board, cells);
	return linesOf(n).filter((mask) => (mask & known) === value && !repeats?.has(mask));
};
var forced = (board, cells, n, fits) => {
	const { known } = readLine(board, cells);
	const all = (1 << n) - 1;
	let ones = all;
	let any = 0;
	for (const mask of fits) {
		ones &= mask;
		any |= mask;
	}
	const fill = (ones | ~any) & all & ~known;
	return cells.flatMap((i, k) => fill >> k & 1 ? [[i, ones >> k & 1]] : []);
};
var fullLines = (board, n) => {
	const done = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
	const all = (1 << n) - 1;
	cellsOf(n).forEach((cells, line) => {
		const { known, value } = readLine(board, cells);
		if (known === all) done[line < n ? 0 : 1].set(value, line);
	});
	return done;
};
var balance = (board, n) => {
	const steps = [];
	cellsOf(n).forEach((cells, line) => {
		if (!cells.filter((i) => board[i] === -1).length) return;
		const fits = fitsOf(board, cells, n);
		if (!fits.length) {
			steps.push({ contradiction: true });
			return;
		}
		const place = forced(board, cells, n, fits);
		if (!place.length) return;
		const zeros = n / 2 - cells.filter((i) => board[i] === 0).length;
		const ones = n / 2 - cells.filter((i) => board[i] === 1).length;
		steps.push(step("balance", 3, place, cells.filter((i) => board[i] !== -1), `${capital(lineName(line, n))} still needs ${many(zeros, 0)} and ${many(ones, 1)}. Every way to fit them in without three alike in a row agrees here, so ${result(place)}.`));
	});
	return steps;
};
var repeats = (board, n) => {
	const steps = [];
	const done = fullLines(board, n);
	cellsOf(n).forEach((cells, line) => {
		if (!cells.some((i) => board[i] === -1)) return;
		const others = done[line < n ? 0 : 1];
		const fits = fitsOf(board, cells, n);
		const blocked = fits.filter((mask) => others.has(mask));
		if (!blocked.length) return;
		const left = fits.filter((mask) => !others.has(mask));
		if (!left.length) {
			steps.push({ contradiction: true });
			return;
		}
		const place = forced(board, cells, n, left);
		if (!place.length) return;
		const twins = blocked.map((mask) => others.get(mask));
		const lines = cellsOf(n);
		steps.push(step("repeat", 3, place, [cells, ...twins.map((l) => lines[l])].flat().filter((i) => board[i] !== -1), `${capital(lineName(line, n))} could otherwise end up the same as ${twins.map((l) => lineName(l, n)).join(" or ")}, and no two ${line < n ? "rows" : "columns"} may match, so ${result(place)}.`));
	});
	return steps;
};
var whatIf = (board, n) => {
	const base = propagate(board.slice(), n, startCandidates(n));
	if (!base) return [{ contradiction: true }];
	const empty = [...board.keys()].filter((i) => board[i] === -1);
	for (const i of empty) for (const v of [0, 1]) {
		const trial = board.slice();
		trial[i] = v;
		if (propagate(trial, n, base)) continue;
		return [step("what-if", 4, [[i, 1 - v]], [i], `If this cell were a ${v}, the simpler rules would soon break a rule somewhere, so it must be a ${1 - v}.`)];
	}
	return [];
};
var techniques = [
	[pairs, gaps],
	[counts],
	[oneLeft, twins],
	[balance, repeats],
	[whatIf]
];
var nextSteps = (board, n, top = levels.length - 1) => {
	for (let level = 0; level <= top; level++) for (const technique of techniques[level]) {
		const steps = technique(board, n);
		if (steps.some((s) => s.contradiction)) return {
			contradiction: true,
			steps: []
		};
		if (steps.length) return {
			level,
			steps
		};
	}
	return { steps: [] };
};
var apply = (board, n, steps) => {
	for (const { place } of steps) for (const [i, v] of place) {
		if (board[i] !== -1 && board[i] !== v) return false;
		board[i] = v;
	}
	return violations(board, n).size === 0;
};
var rate = (givens, n, top = levels.length - 1) => {
	const board = givens.slice();
	let hardest = 0;
	while (!full(board)) {
		const { contradiction, level, steps } = nextSteps(board, n, top);
		if (contradiction || !steps.length) return null;
		hardest = Math.max(hardest, level);
		if (!apply(board, n, steps)) return null;
	}
	return {
		level: hardest,
		solution: board
	};
};
//#endregion
//#region src/takuzu/Menu.jsx
var levelNames = [
	"Easy",
	"Medium",
	"Tricky",
	"Hard",
	"Expert"
];
var allowed = (n, level) => !(n === 6 && level === levelNames.length - 1);
var fallback = (n, level) => allowed(n, level) ? level : fallback(n, level - 1);
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
	name: "Undo",
	hotKey: "Ctrl+Z",
	onClick: () => actions.undo()
}), /* @__PURE__ */ h(SubMenuItem, {
	name: "Hint",
	hotKey: "H",
	onClick: () => actions.hint()
}), /* @__PURE__ */ h(Separator, null), levels.map((_, level) => /* @__PURE__ */ h(SubMenuItem, {
	name: levelNames[level],
	checked: state.game.level === level,
	disabled: !allowed(state.game.n, level),
	onClick: () => actions.reset({ level })
})), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Show Errors",
	checked: state.errors,
	onClick: actions.toggleErrors
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Best Times...",
	onClick: actions.toggleBestTime
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "Minesweeper",
	onClick: () => location.assign("../minesweeper/")
})), /* @__PURE__ */ h(MenuItem, {
	name: "Size",
	type: "size",
	active: state.menu,
	onChange: actions.toggleMenu
}, sizes.map((n) => /* @__PURE__ */ h(SubMenuItem, {
	name: `${n} × ${n}`,
	checked: state.game.n === n,
	onClick: () => actions.reset({ n })
}))), /* @__PURE__ */ h(ThemeMenu, {
	state,
	actions
}, state.theme === "matrix" && /* @__PURE__ */ h(Separator, null), state.theme === "matrix" && /* @__PURE__ */ h(SubMenuItem, {
	name: "Rain Glyphs",
	checked: state.rain,
	onClick: actions.toggleRain
})), /* @__PURE__ */ h(MenuItem, {
	name: "Help",
	type: "help",
	active: state.menu,
	onChange: actions.toggleMenu
}, /* @__PURE__ */ h(SubMenuItem, {
	name: "About Takuzu Plus...",
	onClick: actions.toggleAbout
})));
var Cell_module_default = {
	root: "Cell_root",
	empty: "Cell_empty Cell_root",
	zero: "Cell_zero Cell_root",
	one: "Cell_one Cell_root",
	given: "Cell_given",
	error: "Cell_error",
	ghost: "Cell_ghost",
	hintSource: "Cell_hintSource Board_outline",
	hintPlace: "Cell_hintPlace Board_outline",
	hintWrong: "Cell_hintWrong Board_outline"
};
//#endregion
//#region src/takuzu/Cell.jsx
var hintClass = {
	source: Cell_module_default.hintSource,
	zero: Cell_module_default.hintPlace,
	one: Cell_module_default.hintPlace,
	wrong: Cell_module_default.hintWrong
};
var glyphOf = (value, mark) => {
	if (value !== -1) return String(value);
	if (mark === "zero") return "0";
	if (mark === "one") return "1";
	return "";
};
var Cell = ({ i, value, given, error, mark, onPress }) => /* @__PURE__ */ h("button", {
	type: "button",
	tabindex: -1,
	class: [
		value === -1 ? Cell_module_default.empty : value ? Cell_module_default.one : Cell_module_default.zero,
		given && Cell_module_default.given,
		error && Cell_module_default.error,
		value === -1 && mark && Cell_module_default.ghost,
		mark && hintClass[mark]
	].filter(Boolean).join(" "),
	onpointerdown: (event) => onPress({
		event,
		i
	})
}, glyphOf(value, mark));
//#endregion
//#region src/takuzu/Game.jsx
var running = ({ start, win, dealing }) => start >= 0 && !win && !dealing;
var Game = ({ key, state, actions }) => {
	const { game, hint } = state;
	const { n, board, givens, paused } = game;
	const errors = state.errors && !paused ? violations(board, n) : null;
	const marks = !paused && hint && hint.marks || {};
	const left = board.filter((v) => v === -1).length;
	return /* @__PURE__ */ h(Dialog, {
		key,
		title: state.theme === "classic" ? "Takuzu" : "Takuzu Plus",
		titleHint: "Double-click for 100% zoom",
		onTitleDoubleClick: () => actions.zoom(0),
		controls: /* @__PURE__ */ h(WindowControls, {
			scale: state.zoom.scale,
			onZoom: actions.zoom,
			paused,
			canPause: running(game),
			onPause: actions.pause
		}),
		onCreate: (dialog) => {
			watchWindow(dialog, actions.fit);
			actions.fit();
		}
	}, /* @__PURE__ */ h(Menu, {
		state,
		actions
	}), /* @__PURE__ */ h("div", { class: Game_module_default$1.root }, /* @__PURE__ */ h("div", { class: Game_module_default$1.scoreboard }, /* @__PURE__ */ h(Digit, { value: game.dealing ? 0 : left }), /* @__PURE__ */ h("div", { class: Game_module_default$1.buttons }, /* @__PURE__ */ h(SideButton, {
		title: "Undo (Ctrl+Z)",
		disabled: !game.history.length || game.win || paused,
		onClick: actions.undo
	}, /* @__PURE__ */ h(UndoIcon, null)), /* @__PURE__ */ h(Play, {
		pressed: false,
		lose: false,
		win: game.win,
		onReset: actions.reset
	}), /* @__PURE__ */ h(SideButton, {
		title: "Hint (H)",
		disabled: game.dealing || game.win || paused,
		onClick: actions.hint
	}, /* @__PURE__ */ h(HintIcon, null))), /* @__PURE__ */ h(Digit, { value: game.time })), /* @__PURE__ */ h("div", {
		class: running(game) && !paused ? Game_module_default.active : Game_module_default.inactive,
		style: { "--n": n }
	}, [...board].map((value, i) => /* @__PURE__ */ h(Cell, {
		i,
		value: paused ? -1 : value,
		given: !paused && givens[i] !== -1,
		error: errors && errors.has(i),
		mark: marks[i],
		onPress: actions.play
	})), paused && /* @__PURE__ */ h(PausedCover, { onResume: () => actions.pause(false) })), hint && !paused && /* @__PURE__ */ h(HintPanel, { text: hint.text })));
};
var BestTimes_module_default = {
	table: "BestTimes_table",
	level: "BestTimes_level",
	size: "BestTimes_size",
	slot: "BestTimes_slot",
	time: "BestTimes_time",
	name: "BestTimes_name"
};
//#endregion
//#region src/takuzu/BestTimes.jsx
var tabs = [{
	id: "clean",
	name: "No hints"
}, {
	id: "hinted",
	name: "Hints used"
}];
var BestTimes = ({ key, state, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleBestTime()
}, /* @__PURE__ */ h(Dialog, {
	title: "Fastest Takuzu Solvers",
	onClose: actions.toggleBestTime
}, /* @__PURE__ */ h("div", { class: BestTime_module_default.root }, /* @__PURE__ */ h(Tabs, {
	tabs,
	active: state.tab,
	onSelect: actions.setBestTimeTab
}), /* @__PURE__ */ h("table", { class: BestTimes_module_default.table }, /* @__PURE__ */ h("thead", null, /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("th", null), levelNames.map((name) => /* @__PURE__ */ h("th", { class: BestTimes_module_default.level }, name)))), /* @__PURE__ */ h("tbody", null, sizes.map((n) => /* @__PURE__ */ h("tr", null, /* @__PURE__ */ h("th", { class: BestTimes_module_default.size }, n, " × ", n), levelNames.map((_, level) => {
	const best = allowed(n, level) && state[state.tab][`${n}.${level}`];
	return /* @__PURE__ */ h("td", { class: BestTimes_module_default.slot }, !allowed(n, level) && "–", best && /* @__PURE__ */ h("span", { class: BestTimes_module_default.time }, best.time, " s"), best && /* @__PURE__ */ h("span", { class: BestTimes_module_default.name }, best.name));
}))))), /* @__PURE__ */ h("div", { class: BestTime_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.resetBestTime
}, /* @__PURE__ */ h("span", { class: BestTime_module_default.button }, "Reset Scores")), /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: actions.toggleBestTime,
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: BestTime_module_default.button }, "OK"))))));
var Prompt_module_default = {
	root: "Prompt_root",
	text: "Prompt_text",
	footer: "Prompt_footer",
	button: "Prompt_button"
};
//#endregion
//#region src/takuzu/hint.js
var completeWithErrors = "The board is complete but there are errors. Do you want to use a hint?";
var marked = (entries) => Object.fromEntries(entries);
var findHint = ({ board, solution, n }) => {
	if (solved(board, n)) return {
		kind: "solved",
		text: "The puzzle is solved.",
		marks: {}
	};
	const broken = breaks(board, n);
	if (broken.length) {
		const { cells, text } = broken[0];
		return {
			kind: "break",
			text: `${text} Change one of the highlighted cells.`,
			marks: marked(cells.map((i) => [i, "wrong"]))
		};
	}
	const wrong = [...board.keys()].find((i) => board[i] !== -1 && board[i] !== solution[i]);
	if (wrong !== void 0) return {
		kind: "wrong",
		text: `This ${board[wrong]} doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
		marks: { [wrong]: "wrong" }
	};
	const { steps } = nextSteps(board, n);
	if (!steps.length) {
		const i = board.indexOf(-1);
		return {
			kind: "reveal",
			text: "No rule gives the next cell away, so this one comes from the solution.",
			place: [[i, solution[i]]],
			marks: { [i]: solution[i] ? "one" : "zero" }
		};
	}
	const { technique, text, place, sources } = steps[0];
	return {
		kind: technique,
		text,
		place,
		marks: marked([...sources.map((i) => [i, "source"]), ...place.map(([i, v]) => [i, v ? "one" : "zero"])])
	};
};
//#endregion
//#region src/takuzu/Prompt.jsx
var Prompt = ({ key, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.answerPrompt(false)
}, /* @__PURE__ */ h(Dialog, {
	title: "Takuzu",
	onClose: () => actions.answerPrompt(false)
}, /* @__PURE__ */ h("div", { class: Prompt_module_default.root }, /* @__PURE__ */ h("p", { class: Prompt_module_default.text }, completeWithErrors), /* @__PURE__ */ h("div", { class: Prompt_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: () => actions.answerPrompt(true)
}, /* @__PURE__ */ h("span", { class: Prompt_module_default.button }, "Yes")), /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: () => actions.answerPrompt(false),
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: Prompt_module_default.button }, "No"))))));
//#endregion
//#region src/takuzu/generate.js
var random = (seed) => {
	let a = seed >>> 0;
	return () => {
		a = a + 1831565813 >>> 0;
		let t = a;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
};
var shuffled = (list, rng) => {
	const copy = list.slice();
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};
var makeSolution = (n, rng) => {
	for (;;) {
		const board = solve(emptyBoard(n), n, (list) => shuffled(list, rng), 4 * n);
		if (board) return board;
	}
};
var makePuzzle = (n, rng, keep = (board) => countSolutions(board, n, 2) === 1) => {
	const solution = makeSolution(n, rng);
	const givens = solution.slice();
	for (const i of shuffled([...givens.keys()], rng)) {
		givens[i] = -1;
		if (!keep(givens)) givens[i] = solution[i];
	}
	return {
		givens,
		solution
	};
};
var makeGame = (n, level, rng, budget = 1500) => {
	const start = performance.now();
	const keep = (board) => rate(board, n, level) !== null;
	let best = null;
	do {
		const puzzle = makePuzzle(n, rng, keep);
		const rated = rate(puzzle.givens, n, level).level;
		if (rated === level) return {
			...puzzle,
			level
		};
		if (!best || rated > best.level) best = {
			...puzzle,
			level: rated
		};
	} while (performance.now() - start < budget);
	return best;
};
//#endregion
//#region src/takuzu/deal.js
var worker = null;
var waiting = /* @__PURE__ */ new Map();
var count = 0;
var here = ({ n, level, seed }) => makeGame(n, level, random(seed));
var giveUp = () => {
	worker = false;
	waiting.forEach(({ ask, resolve }) => resolve(here(ask)));
	waiting.clear();
};
var start = () => {
	if (worker !== null) return worker;
	try {
		worker = new Worker(new URL(
			/* @vite-ignore */
			new URL("deal.worker-BMjSpnL2.js", import.meta.url).href,
			"" + import.meta.url
		), { type: "module" });
		worker.onmessage = ({ data }) => {
			waiting.get(data.id)?.resolve(data);
			waiting.delete(data.id);
		};
		worker.onerror = giveUp;
	} catch {
		worker = false;
	}
	return worker;
};
var deal = (n, level, seed) => {
	const ask = {
		n,
		level,
		seed
	};
	if (typeof Worker === "undefined" || !start()) return Promise.resolve(here(ask));
	const id = ++count;
	return new Promise((resolve) => {
		waiting.set(id, {
			ask,
			resolve
		});
		worker.postMessage({
			id,
			...ask
		});
	});
};
//#endregion
//#region src/takuzu/rain.js
var rain = ["ｼ", "ﾓ"];
var showRain = (on) => {
	const root = document.documentElement;
	if (!on) {
		delete root.dataset.rain;
		return;
	}
	if (!root.style.getPropertyValue("--tz-rain-0")) {
		const zero = glyphImage(rain[0], 192, GLYPH);
		const one = glyphImage(rain[1], 192, BRIGHT);
		if (!zero || !one) return;
		root.style.setProperty("--tz-rain-0", `url(${zero})`);
		root.style.setProperty("--tz-rain-1", `url(${one})`);
	}
	root.dataset.rain = "on";
};
//#endregion
//#region src/takuzu/About.jsx
var TakuzuAbout = ({ key, actions }) => /* @__PURE__ */ h(About, {
	key,
	name: "Takuzu Plus",
	actions
}, /* @__PURE__ */ h("p", null, "Binary puzzles: fill the grid with 0s and 1s so that no row or column has three alike in a row, every row and column holds as many 0s as 1s, and no two rows or two columns are the same."), /* @__PURE__ */ h("p", null, "Every board has exactly one solution and can be solved by logic alone, from easy to expert, and hints explain their reasoning. Takuzu, also known as Binairo, was devised by Frank Coussement and Peter De Schepper."), /* @__PURE__ */ h("p", null, "Part of Puzzles by fexofenadine, sharing its window, themes and backgrounds with Minesweeper Plus, which is based on ", /* @__PURE__ */ h(Link, { href: "https://github.com/frenzzy/minesweeper" }, "Minesweeper"), " ", "by Vladimir Kutepov."));
//#endregion
//#region src/takuzu/app.jsx
var loadChoice = () => {
	const saved = parseInt(load("takuzu.size"), 10);
	const n = sizes.includes(saved) ? saved : 8;
	const level = parseInt(load("takuzu.level"), 10);
	if (!(level >= 0 && level < levelNames.length)) return {
		n,
		level: 1
	};
	return {
		n,
		level: fallback(n, level)
	};
};
var createGame = ({ n, level }) => ({
	n,
	level,
	givens: emptyBoard(n),
	solution: null,
	board: emptyBoard(n),
	history: [],
	change: 0,
	dealing: true,
	deal: 0,
	start: -1,
	time: 0,
	raf: null,
	paused: false,
	pausedAt: 0,
	win: false,
	hinted: false
});
var timeKey = (n, level, hinted) => `takuzu.${n}.${level}${hinted ? ".hints" : ""}`;
var eachSlot = (fn) => sizes.flatMap((n) => levelNames.map((_, level) => fn(n, level, `${n}.${level}`)));
var bestTimes = (hinted) => Object.fromEntries(eachSlot((n, level, slot) => {
	const key = timeKey(n, level, hinted);
	return [slot, {
		time: parseInt(load(key), 10) || 999,
		name: load(`${key}.name`) || "Anonymous"
	}];
}));
var clearBestTimes = (hinted) => {
	eachSlot((n, level) => {
		const key = timeKey(n, level, hinted);
		remove(key);
		remove(`${key}.name`);
	});
	return bestTimes(hinted);
};
var cycle = [
	-1,
	0,
	1
];
var ASK_AFTER = 2500;
var deals = 0;
var changes = 0;
var prevent = (event) => {
	event.preventDefault();
	return false;
};
var begin = (game, actions) => {
	if (game.start >= 0) return game;
	game.raf = requestAnimationFrame(actions.tick);
	return {
		...game,
		start: performance.now(),
		time: 1
	};
};
var changed = (game, board, history, actions, settled = false) => {
	const next = {
		...begin(game, actions),
		board,
		history,
		change: ++changes
	};
	next.win = solved(board, next.n);
	if (next.win) {
		cancelAnimationFrame(next.raf);
		actions.win(next);
	}
	const stuck = !next.win && full(board);
	if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER);
	return {
		hint: null,
		prompt: stuck && settled,
		game: next
	};
};
var upgradeLadder = () => {
	if (load("takuzu.ladder") === "5") return;
	eachSlot((n, level) => {
		for (const key of [timeKey(n, level, false), timeKey(n, level, true)]) {
			remove(key);
			remove(`${key}.name`);
		}
	});
	const level = parseInt(load("takuzu.level"), 10);
	if (level >= 2) save("takuzu.level", level + 1);
	save("takuzu.ladder", "5");
};
upgradeLadder();
var state = {
	...shellState(),
	hint: null,
	prompt: false,
	errors: Boolean(load("takuzu.errors")),
	rain: Boolean(load("takuzu.rain")),
	about: false,
	game: createGame(loadChoice()),
	winner: null,
	bestTime: null
};
var actions = {
	...shellActions,
	init: () => (state, actions) => {
		window.addEventListener("keydown", actions.press);
		listen(actions);
		showRain(state.rain);
		actions.reset();
	},
	press: (event) => (state, actions) => {
		if ((event.ctrlKey || event.metaKey) && !event.altKey && event.keyCode === 90) {
			if (typing(event) || state.boss) return;
			event.preventDefault();
			actions.undo();
			return;
		}
		const key = shortcut(event, state, actions);
		if (key === 113 || key === 78) actions.reset();
		else if (key === 72) actions.hint();
		else if (key === 80) actions.pause();
	},
	reset: (payload) => ({ game }, actions) => {
		cancelAnimationFrame(game.raf);
		const n = payload && payload.n || game.n;
		const level = fallback(n, payload && payload.level !== void 0 ? payload.level : game.level);
		save("takuzu.size", n);
		save("takuzu.level", level);
		const id = ++deals;
		deal(n, level, Math.floor(Math.random() * 2 ** 32)).then((dealt) => actions.dealt({
			id,
			...dealt
		}));
		return {
			menu: null,
			hint: null,
			prompt: false,
			game: {
				...createGame({
					n,
					level
				}),
				deal: id
			}
		};
	},
	dealt: ({ id, givens, solution }) => ({ game }) => {
		if (game.deal !== id) return null;
		return { game: {
			...game,
			givens,
			solution,
			board: givens.slice(),
			dealing: false
		} };
	},
	play: ({ event, i }) => ({ game }, actions) => {
		if (event.button !== 0 && event.button !== 2) return null;
		if (game.dealing || game.paused || game.win || game.givens[i] !== -1) return null;
		const back = event.button === 2;
		const from = game.board[i];
		const board = game.board.slice();
		board[i] = cycle[(cycle.indexOf(from) + (back ? 2 : 1)) % 3];
		const settled = board[i] === (back ? 0 : 1);
		return changed(game, board, [...game.history, [i, from]], actions, settled);
	},
	ask: (change) => ({ game }) => {
		if (game.change !== change || game.win || game.paused || !full(game.board)) return null;
		return { prompt: true };
	},
	undo: () => ({ game }, actions) => {
		if (!game.history.length || game.win || game.paused || game.dealing) return { menu: null };
		const [i, from] = game.history[game.history.length - 1];
		const board = game.board.slice();
		board[i] = from;
		return {
			menu: null,
			...changed(game, board, game.history.slice(0, -1), actions)
		};
	},
	hint: () => ({ game }, actions) => {
		if (game.dealing || game.win || game.paused) return { menu: null };
		const { board, solution, n } = game;
		return {
			menu: null,
			prompt: false,
			hint: findHint({
				board,
				solution,
				n
			}),
			game: {
				...begin(game, actions),
				hinted: true
			}
		};
	},
	answerPrompt: (yes) => (state, actions) => {
		if (yes) actions.hint();
		return { prompt: false };
	},
	toggleErrors: () => (state) => {
		save("takuzu.errors", state.errors ? "" : "yes");
		return {
			menu: null,
			errors: !state.errors
		};
	},
	toggleRain: () => (state) => {
		save("takuzu.rain", state.rain ? "" : "yes");
		showRain(!state.rain);
		return {
			menu: null,
			rain: !state.rain
		};
	},
	toggleAbout: () => ({ about }) => ({
		menu: null,
		about: !about
	}),
	pause: pauseAction(running),
	tick: (now) => ({ game }, actions) => {
		game.raf = requestAnimationFrame(actions.tick);
		const next = Math.floor((now - game.start) / 1e3) + 1;
		if (game.time === next) return null;
		return { game: {
			...game,
			time: next
		} };
	},
	win: ({ n, level, hinted, time }) => () => {
		const key = timeKey(n, level, hinted);
		const best = parseInt(load(key), 10);
		if (best && best <= time) return null;
		return { winner: {
			key,
			time,
			hinted,
			level: `${levelNames[level].toLowerCase()} ${n} × ${n}`,
			name: load("takuzu.name") || ""
		} };
	},
	changeWinner: (payload) => ({ winner }) => ({ winner: {
		...winner,
		...payload
	} }),
	submitBestTime: (event) => ({ winner }, actions) => {
		event.preventDefault();
		const name = winner.name.trim();
		save(winner.key, winner.time);
		save(`${winner.key}.name`, name);
		save("takuzu.name", name);
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
	} })
};
var view = (state, actions) => /* @__PURE__ */ h("main", {
	oncontextmenu: prevent,
	ondragstart: prevent,
	oncreate: actions.init
}, /* @__PURE__ */ h(Game, {
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
}), state.bestTime && /* @__PURE__ */ h(BestTimes, {
	key: "c",
	state: state.bestTime,
	actions
}), state.prompt && /* @__PURE__ */ h(Prompt, {
	key: "d",
	actions
}), state.backgroundSettings && /* @__PURE__ */ h(BackgroundSettings, {
	key: "e",
	state: state.backgroundSettings,
	actions
}), state.about && /* @__PURE__ */ h(TakuzuAbout, {
	key: "f",
	actions
}), state.boss && /* @__PURE__ */ h(Boss, {
	key: "g",
	state: state.boss,
	actions
}));
//#endregion
//#region src/takuzu/index.js
app(state, actions, view, document.getElementById("app"));
startBackgrounds();
registerWorker();
//#endregion
