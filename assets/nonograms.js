import { A as Digit, C as WindowControls, D as SideButton, E as HintIcon, F as gameLinks, G as Dialog, I as ThemeMenu, J as app, L as startBackgrounds, M as MenuItem, N as Separator, O as UndoIcon, P as SubMenuItem, S as watchWindow, T as FillIcon, U as save, V as load, W as Menu_module_default, Y as h, a as shortcut, b as HintPanel, c as BossButton, d as Link, f as BackgroundSettings, h as Winner, i as shellState, k as Play, l as HowToPlay, n as listen, o as typing, q as Game_module_default$1, r as shellActions, s as Boss, t as registerWorker, u as About, v as clockDigits, w as CrossIcon, x as PausedCover, y as pauseAction } from "./worker-CNrW4LdT.js";
import { a as Prompt, c as cellsOf, i as dealer, l as lineName, n as random, o as BestTimes, s as capital, t as showRain, u as records } from "./rain-L03NNP1o.js";
var Game_module_default = {
	board: "Game_board",
	columns: "Game_columns",
	rows: "Game_rows",
	clue: "Game_clue",
	wide: "Game_wide",
	done: "Game_done",
	error: "Game_error",
	hinted: "Game_hinted",
	field: "Game_field",
	active: "Game_active Game_field",
	inactive: "Game_inactive Game_field"
};
var sizes = [
	5,
	10,
	15,
	20,
	25
];
var emptyBoard = (n) => new Int8Array(n * n).fill(-1);
var runsOf = (values) => {
	const runs = [];
	let run = 0;
	for (const v of values) if (v === 1) run++;
	else if (run) {
		runs.push(run);
		run = 0;
	}
	if (run) runs.push(run);
	return runs;
};
var sameRuns = (a, b) => a.length === b.length && a.every((run, k) => run === b[k]);
var cluesOf = (solution, n) => cellsOf(n).map((cells) => runsOf(cells.map((i) => solution[i])));
var lineDone = (board, cells, clue) => sameRuns(runsOf(cells.map((i) => board[i])), clue);
var solved = (board, n, clues) => cellsOf(n).every((cells, line) => lineDone(board, cells, clues[line]));
var placements = (values, clue) => {
	const n = values.length;
	const k = clue.length;
	const filled = new Int32Array(n + 1);
	const crossed = new Int32Array(n + 1);
	for (let i = 0; i < n; i++) {
		filled[i + 1] = filled[i] + (values[i] === 1);
		crossed[i + 1] = crossed[i] + (values[i] === 0);
	}
	const clear = (a, b) => filled[b] === filled[a];
	const solid = (a, b) => crossed[b] === crossed[a];
	const gap = (i) => values[i] !== 1;
	const before = Array.from({ length: k + 1 }, () => new Uint8Array(n + 1));
	for (let i = 0; i <= n; i++) before[0][i] = clear(0, i);
	for (let j = 1; j <= k; j++) {
		const run = clue[j - 1];
		for (let i = 1; i <= n; i++) {
			const s = i - run;
			before[j][i] = gap(i - 1) && before[j][i - 1] || s >= 0 && solid(s, i) && (j === 1 ? before[0][s] : s >= 1 && gap(s - 1) && before[j - 1][s - 1]);
		}
	}
	if (!before[k][n]) return null;
	const after = Array.from({ length: k + 1 }, () => new Uint8Array(n + 1));
	for (let i = 0; i <= n; i++) after[k][i] = clear(i, n);
	for (let j = k - 1; j >= 0; j--) {
		const run = clue[j];
		for (let i = n - 1; i >= 0; i--) {
			const e = i + run;
			after[j][i] = gap(i) && after[j][i + 1] || e <= n && solid(i, e) && (j === k - 1 ? after[k][e] : e < n && gap(e) && after[j + 1][e + 1]);
		}
	}
	const canStart = (j, s) => {
		const e = s + clue[j];
		if (s < 0 || e > n || !solid(s, e)) return false;
		const start = j === 0 ? before[0][s] : s >= 1 && gap(s - 1) && before[j][s - 1];
		const end = j === k - 1 ? after[k][e] : e < n && gap(e) && after[j + 1][e + 1];
		return Boolean(start && end);
	};
	const canCross = (c) => {
		if (!gap(c)) return false;
		for (let j = 0; j <= k; j++) if (before[j][c] && after[j][c + 1]) return true;
		return false;
	};
	return {
		canStart,
		canCross
	};
};
var settleLine = (values, clue) => {
	const fit = placements(values, clue);
	if (!fit) return null;
	const n = values.length;
	const cover = new Int32Array(n + 1);
	clue.forEach((run, j) => {
		for (let s = 0; s + run <= n; s++) {
			if (!fit.canStart(j, s)) continue;
			cover[s]++;
			cover[s + run]--;
		}
	});
	const out = Int8Array.from(values);
	let over = 0;
	for (let c = 0; c < n; c++) {
		over += cover[c];
		if (out[c] !== -1) continue;
		if (!fit.canCross(c)) out[c] = 1;
		else if (!over) out[c] = 0;
	}
	return out;
};
var breaks = (board, n, clues) => {
	const found = [];
	cellsOf(n).forEach((cells, line) => {
		if (settleLine(cells.map((i) => board[i]), clues[line])) return;
		const clue = clues[line].length ? clues[line].join(" ") : "0";
		found.push({
			line,
			cells,
			text: `${capital(lineName(line, n))} can't match its clue ${clue} any more.`
		});
	});
	return found;
};
var fillsLeft = (board, n, clues) => clues.slice(0, n).flat().reduce((a, b) => a + b, 0) - board.filter((v) => v === 1).length;
//#endregion
//#region src/nonograms/Menu.jsx
var levelNames = [
	"Easy",
	"Medium",
	"Hard",
	"Expert"
];
var allowed = (n, level) => !(n === 5 && level === 3);
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
}), /* @__PURE__ */ h(Separator, null), levelNames.map((name, level) => /* @__PURE__ */ h(SubMenuItem, {
	name,
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
}), /* @__PURE__ */ h(Separator, null), gameLinks("nonograms")), /* @__PURE__ */ h(MenuItem, {
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
	name: "How to Play...",
	onClick: actions.toggleHowTo
}), /* @__PURE__ */ h(Separator, null), /* @__PURE__ */ h(SubMenuItem, {
	name: "About Nonograms Plus...",
	onClick: actions.toggleAbout
})));
var Cell_module_default = {
	root: "Cell_root",
	empty: "Cell_empty Cell_root",
	fill: "Cell_fill Cell_root",
	cross: "Cell_cross Cell_root",
	blank: "Cell_blank",
	ghostFill: "Cell_ghostFill Cell_empty Cell_root",
	ghostCross: "Cell_ghostCross Cell_cross Cell_root Cell_empty Cell_root",
	hintSource: "Cell_hintSource Board_outline",
	hintPlace: "Cell_hintPlace Board_outline",
	hintWrong: "Cell_hintWrong Board_outline"
};
//#endregion
//#region src/nonograms/Cell.jsx
var hintClass = {
	source: Cell_module_default.hintSource,
	fill: Cell_module_default.hintPlace,
	cross: Cell_module_default.hintPlace,
	wrong: Cell_module_default.hintWrong
};
var classOf = (value, win, mark) => {
	if (value === 1) return Cell_module_default.fill;
	if (value !== -1 || win) return Cell_module_default.cross;
	if (mark === "fill") return Cell_module_default.ghostFill;
	if (mark === "cross") return Cell_module_default.ghostCross;
	return Cell_module_default.empty;
};
var Cell = ({ i, value, win, mark, style, onPress }) => /* @__PURE__ */ h("button", {
	type: "button",
	tabindex: -1,
	"data-cell": i,
	class: [
		classOf(value, win, mark),
		win && value !== 1 && Cell_module_default.blank,
		mark && hintClass[mark]
	].filter(Boolean).join(" "),
	style,
	onpointerdown: (event) => onPress({
		event,
		i
	})
});
//#endregion
//#region src/nonograms/Game.jsx
var running = ({ start, win, dealing }) => start >= 0 && !win && !dealing;
var tracks = (n) => Array.from({ length: n }, (_, k) => k && k % 5 === 0 ? "2px var(--size)" : "var(--size)").join(" ");
var place = (k) => k + Math.floor(k / 5) + 1;
var Clue = ({ clue, done, error, hinted, hidden, style }) => /* @__PURE__ */ h("div", {
	class: [
		Game_module_default.clue,
		done && Game_module_default.done,
		error && Game_module_default.error,
		hinted && Game_module_default.hinted
	].filter(Boolean).join(" "),
	style
}, !hidden && (clue.length ? clue : [0]).map((run) => /* @__PURE__ */ h("span", { class: run > 9 && Game_module_default.wide }, run)));
var Game = ({ key, state, actions }) => {
	const { game, hint } = state;
	const { n, board, clues, paused } = game;
	const marks = !paused && hint && hint.marks || {};
	const lines = cellsOf(n);
	const hidden = paused || game.dealing;
	const broken = state.errors && !hidden ? new Set(breaks(board, n, clues).map((b) => b.line)) : null;
	const done = lines.map((cells, line) => !hidden && lineDone(board, cells, clues[line]));
	const left = fillsLeft(board, n, clues);
	const clue = (line) => /* @__PURE__ */ h(Clue, {
		clue: clues[line],
		done: done[line],
		error: broken && broken.has(line),
		hinted: !paused && hint && hint.line === line,
		hidden,
		style: line < n ? { gridRow: place(line) } : { gridColumn: place(line - n) }
	});
	return /* @__PURE__ */ h(Dialog, {
		key,
		title: state.theme === "classic" ? "Nonograms" : "Nonograms Plus",
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
	}, /* @__PURE__ */ h(HintIcon, null)), state.touch && /* @__PURE__ */ h(SideButton, {
		title: state.mode === 1 ? "Taps fill cells" : "Taps cross cells out",
		disabled: game.win || paused,
		onClick: () => actions.setMode(state.mode === 1 ? 0 : 1)
	}, state.mode === 1 ? /* @__PURE__ */ h(FillIcon, null) : /* @__PURE__ */ h(CrossIcon, null))), /* @__PURE__ */ h(Digit, {
		value: game.time,
		digits: clockDigits(state.theme, game.time)
	})), /* @__PURE__ */ h("div", {
		class: Game_module_default.board,
		style: { "--tracks": tracks(n) }
	}, /* @__PURE__ */ h("div", { class: Game_module_default.columns }, lines.slice(n).map((_, x) => clue(n + x))), /* @__PURE__ */ h("div", { class: Game_module_default.rows }, lines.slice(0, n).map((_, y) => clue(y))), /* @__PURE__ */ h("div", { class: running(game) && !paused ? Game_module_default.active : Game_module_default.inactive }, [...board].map((value, i) => /* @__PURE__ */ h(Cell, {
		i,
		value: paused ? -1 : value,
		win: game.win,
		mark: marks[i],
		style: {
			gridColumn: place(i % n),
			gridRow: place(Math.floor(i / n))
		},
		onPress: actions.down
	})), paused && /* @__PURE__ */ h(PausedCover, { onResume: () => actions.pause(false) }))), hint && !paused && /* @__PURE__ */ h(HintPanel, { text: hint.text })));
};
//#endregion
//#region src/nonograms/solver.js
var propagate = (board, n, clues, lines = null, trace = null, settle = settleLine) => {
	const all = cellsOf(n);
	const waiting = new Uint8Array(2 * n);
	const queue = lines ?? all.map((_, line) => line);
	queue.forEach((line) => waiting[line] = 1);
	while (queue.length) {
		const line = queue.pop();
		waiting[line] = 0;
		const cells = all[line];
		const values = cells.map((i) => board[i]);
		const settled = settle(values, clues[line]);
		if (!settled) {
			if (trace) trace.line = line;
			return false;
		}
		for (let k = 0; k < n; k++) {
			if (values[k] !== -1 || settled[k] === -1) continue;
			board[cells[k]] = settled[k];
			const across = line < n ? n + k : k;
			if (!waiting[across]) {
				waiting[across] = 1;
				queue.push(across);
			}
		}
	}
	return true;
};
var linesThrough = (i, n) => [Math.floor(i / n), n + i % n];
var contradiction = (board, n, clues, deadline = Infinity) => {
	for (let i = 0; i < board.length; i++) {
		if (board[i] !== -1) continue;
		if (performance.now() > deadline) return null;
		for (const v of [1, 0]) {
			const trial = board.slice();
			trial[i] = v;
			const trace = {};
			if (!propagate(trial, n, clues, linesThrough(i, n), trace)) return {
				cell: i,
				value: 1 - v,
				line: trace.line
			};
		}
	}
	return null;
};
var deduce = (board, n, clues, deep = true, deadline = Infinity) => {
	if (!propagate(board, n, clues)) return null;
	let level = 0;
	while (board.includes(-1)) {
		const found = deep && contradiction(board, n, clues, deadline);
		if (!found) return null;
		level = 1;
		board[found.cell] = found.value;
		if (!propagate(board, n, clues, linesThrough(found.cell, n))) return null;
	}
	return level;
};
//#endregion
//#region src/nonograms/techniques.js
var levels = [
	"easy",
	"medium",
	"hard",
	"expert"
];
var ordinals = [
	"first",
	"second",
	"third",
	"fourth",
	"fifth",
	"sixth",
	"seventh",
	"eighth"
];
var sum = (clue) => clue.reduce((a, b) => a + b, 0);
var range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
var empties = (values, ks) => ks.filter((k) => values[k] === -1);
var known = (values) => [...values.keys()].filter((k) => values[k] !== -1);
var clueText = (clue) => clue.length ? clue.join(" ") : "0";
var span$1 = (a, b) => a === b ? `cell ${a + 1}` : `cells ${a + 1} to ${b + 1}`;
var runName = (clue, j) => {
	if (clue.filter((run) => run === clue[j]).length === 1) return `the ${clue[j]}`;
	const nth = clue.slice(0, j + 1).filter((run) => run === clue[j]).length - 1;
	return `the ${ordinals[nth] ?? `number ${nth + 1}`} ${clue[j]}`;
};
var result = (place) => {
	const one = place.length === 1;
	if (place.every(([, v]) => v === 1)) return one ? "that cell is filled" : "those cells are filled";
	if (place.every(([, v]) => v === 0)) return one ? "that cell is empty" : "those cells are empty";
	return "those cells are filled and emptied as shown";
};
var extremes = (fit, clue, n) => clue.map((run, j) => {
	let left = 0;
	while (!fit.canStart(j, left)) left++;
	let right = n - run;
	while (!fit.canStart(j, right)) right--;
	return {
		run,
		left,
		right
	};
});
var pushed = (values, view, clue, [cover, gap], lead) => {
	const n = values.length;
	const fit = placements(view, clue);
	if (!fit) return [];
	const steps = [];
	const reach = new Uint8Array(n);
	extremes(fit, clue, n).forEach(({ run, left, right }, j) => {
		for (let k = left; k < right + run; k++) reach[k] = 1;
		const place = empties(values, range(right, left + run)).map((k) => [k, 1]);
		if (!place.length) return;
		steps.push({
			technique: cover,
			place,
			sources: known(view),
			text: (name, [first, last]) => left === right ? capital(`${lead}${runName(clue, j)} in ${name} only fits in ${span$1(left, left + run - 1)}, so ${result(place)}.`) : capital(`${lead}${runName(clue, j)} in ${name} covers ${span$1(left, left + run - 1)} pushed as far ${first} as it goes and ${span$1(right, right + run - 1)} pushed as far ${last}. Wherever it sits it covers ${span$1(right, left + run - 1)}, so ${result(place)}.`)
		});
	});
	const place = empties(values, range(0, n)).filter((k) => !reach[k]).map((k) => [k, 0]);
	if (place.length) steps.push({
		technique: gap,
		place,
		sources: known(view),
		text: (name) => capital(`${lead}no run of ${name}'s clue ${clueText(clue)} can reach ${place.length === 1 ? "this cell" : "these cells"}, so ${result(place)}.`)
	});
	return steps;
};
var easy = (values, clue) => {
	const n = values.length;
	const all = range(0, n);
	const whole = (place, sources, text) => [{
		technique: "complete",
		place,
		sources,
		text
	}];
	if (!clue.length) return whole(empties(values, all).map((k) => [k, 0]), [], (name) => `${capital(name)}'s clue is 0, so every cell in it is empty.`);
	if (sum(clue) + clue.length - 1 === n) {
		const exact = clue.flatMap((run, j) => [...j ? [0] : [], ...Array(run).fill(1)]);
		return whole(empties(values, all).map((k) => [k, exact[k]]), [], (name) => `${capital(name)}'s clue ${clueText(clue)} needs all ${n} cells, its runs with one empty cell between each, so it fills the line exactly.`);
	}
	if (sameRuns(runsOf(values), clue)) return whole(empties(values, all).map((k) => [k, 0]), all.filter((k) => values[k] === 1), (name) => `${capital(name)} already has all its runs (${clueText(clue)}), so its other cells are empty.`);
	return pushed(values, values.map((v) => v === 1 ? -1 : v), clue, ["overlap", "gap"], "");
};
var medium = (values, clue) => pushed(values, values, clue, ["forcing", "reach"], "with the cells already known, ");
var hard = (values, clue) => {
	const settled = settleLine(values, clue);
	if (!settled) return [];
	const place = empties(values, range(0, values.length)).filter((k) => settled[k] !== -1).map((k) => [k, settled[k]]);
	if (!place.length) return [];
	return [{
		technique: "line",
		place,
		sources: known(values),
		text: (name) => `Trying every way ${name}'s clue ${clueText(clue)} fits around its known cells, ${place.length === 1 ? "this cell comes" : "these cells come"} out the same in all of them, so ${result(place)}.`
	}];
};
var finders = [
	easy,
	medium,
	hard
];
var settleUpTo = (level) => (values, clue) => {
	if (level >= 2) return settleLine(values, clue);
	const out = Int8Array.from(values);
	for (;;) {
		if (!placements(out, clue)) return null;
		const place = finders[level](out, clue).flatMap((s) => s.place);
		if (!place.length) return out;
		for (const [k, v] of place) out[k] = v;
	}
};
var solveAt = (board, n, clues, level, deadline = Infinity) => {
	if (!propagate(board, n, clues, null, null, settleUpTo(level))) return false;
	if (!board.includes(-1)) return true;
	return level >= 3 && deduce(board, n, clues, true, deadline) !== null;
};
var rate = (clues, n, top = levels.length - 1) => {
	const board = emptyBoard(n);
	for (let level = 0; level <= top; level++) if (solveAt(board, n, clues, level)) return level;
	return null;
};
var nextSteps = (board, n, clues, top = levels.length - 1) => {
	const lines = cellsOf(n);
	for (let level = 0; level <= Math.min(top, 2); level++) {
		const steps = [];
		lines.forEach((cells, line) => {
			const values = cells.map((i) => board[i]);
			if (!values.includes(-1)) return;
			const name = lineName(line, n);
			const ends = line < n ? ["left", "right"] : ["up", "down"];
			for (const found of finders[level](values, clues[line])) steps.push({
				technique: found.technique,
				level,
				line,
				place: found.place.map(([k, v]) => [cells[k], v]),
				sources: found.sources.map((k) => cells[k]),
				text: found.text(name, ends)
			});
		});
		if (steps.length) return {
			steps,
			level
		};
	}
	if (top >= 3) {
		const found = contradiction(board, n, clues);
		if (found) {
			const { cell, value, line } = found;
			return {
				level: 3,
				steps: [{
					technique: "what-if",
					level: 3,
					line,
					place: [[cell, value]],
					sources: [],
					text: `If this cell were ${value === 1 ? "empty" : "filled"}, following the lines from it would leave ${lineName(line, n)} unable to match its clue, so it must be ${value === 1 ? "filled" : "empty"}.`
				}]
			};
		}
	}
	return {
		steps: [],
		level: null
	};
};
//#endregion
//#region src/nonograms/generate.js
var makePicture = (n, rng, dense = 0) => {
	const density = .48 + dense + .08 * rng();
	let cells = Int8Array.from({ length: n * n }, () => rng() < density ? 1 : 0);
	for (let pass = 0; pass < (n < 10 ? 0 : 2); pass++) {
		const next = cells.slice();
		for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
			let count = 0;
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				const yy = y + dy;
				const xx = x + dx;
				if (yy >= 0 && yy < n && xx >= 0 && xx < n) count += cells[yy * n + xx];
			}
			if (count >= 6) next[y * n + x] = 1;
			else if (count <= 3) next[y * n + x] = 0;
		}
		cells = next;
	}
	if (rng() < .5) for (let y = 0; y < n; y++) for (let x = Math.ceil(n / 2); x < n; x++) cells[y * n + x] = cells[y * n + n - 1 - x];
	return cells;
};
var makePuzzle = (n, rng, top = levels.length - 1, deadline = Infinity) => {
	while (performance.now() < deadline) {
		const solution = makePicture(n, rng, top ? 0 : .12);
		for (let flips = 0; flips < 4 * n && performance.now() < deadline; flips++) {
			const clues = cluesOf(solution, n);
			const board = emptyBoard(n);
			if (solveAt(board, n, clues, Math.min(top, 2))) return {
				solution,
				clues,
				level: rate(clues, n, Math.min(top, 2))
			};
			const open = board.filter((v) => v === -1).length;
			if (top >= 3 && open * 4 <= n * n && deduce(board, n, clues, true, deadline) !== null) return {
				solution,
				clues,
				level: 3
			};
			const unsettled = [...board.keys()].filter((i) => board[i] === -1);
			solution[unsettled[Math.floor(rng() * unsettled.length)]] ^= 1;
		}
	}
	return null;
};
var makeGame = (n, level, rng, budget = n >= 20 ? 3e3 : 1500) => {
	const deadline = performance.now() + budget;
	let best = null;
	for (;;) {
		const puzzle = makePuzzle(n, rng, level, deadline);
		if (!puzzle) break;
		if (puzzle.level === level) return puzzle;
		if (!best || puzzle.level > best.level) best = puzzle;
	}
	return best ?? makePuzzle(n, rng, 1);
};
//#endregion
//#region src/nonograms/deal.js
var dealOne = dealer(() => new Worker(new URL(
	/* @vite-ignore */
	new URL("deal.worker-f_4U9A5A.js", import.meta.url).href,
	"" + import.meta.url
), { type: "module" }), ({ n, level, seed }) => makeGame(n, level, random(seed)));
var deal = (n, level, seed) => dealOne({
	n,
	level,
	seed
});
var marked = (entries) => Object.fromEntries(entries);
var misfit = (board, solution, i) => board[i] === 1 && !solution[i] || board[i] === 0 && solution[i] === 1;
var findHint = ({ board, solution, clues, n }) => {
	if (solved(board, n, clues)) return {
		kind: "solved",
		text: "The puzzle is solved.",
		marks: {}
	};
	const broken = breaks(board, n, clues);
	if (broken.length) {
		const { line, cells, text } = broken[0];
		const bad = cells.filter((i) => misfit(board, solution, i));
		const known = cells.filter((i) => board[i] !== -1);
		return {
			kind: "break",
			line,
			text: bad.length ? `${text} ${bad.length > 1 ? "The cells outlined in red are the ones" : "The cell outlined in red is the one"} to change.` : text,
			marks: marked(known.map((i) => [i, bad.includes(i) ? "wrong" : "source"]))
		};
	}
	const wrong = [...board.keys()].find((i) => misfit(board, solution, i));
	if (wrong !== void 0) return {
		kind: "wrong",
		text: `This ${board[wrong] === 1 ? "filled" : "crossed out"} cell doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
		marks: { [wrong]: "wrong" }
	};
	const { steps } = nextSteps(board, n, clues);
	if (!steps.length) {
		const i = board.indexOf(-1);
		const value = solution[i] ? 1 : 0;
		return {
			kind: "reveal",
			text: "No rule gives the next cell away, so this one comes from the solution.",
			place: [[i, value]],
			marks: { [i]: value === 1 ? "fill" : "cross" }
		};
	}
	const { technique, line, text, place, sources } = steps[0];
	return {
		kind: technique,
		line,
		text,
		place,
		marks: marked([...sources.map((i) => [i, "source"]), ...place.map(([i, v]) => [i, v === 1 ? "fill" : "cross"])])
	};
};
//#endregion
//#region src/nonograms/About.jsx
var NonogramsAbout = ({ key, actions }) => /* @__PURE__ */ h(About, {
	key,
	name: "Nonograms Plus",
	actions
}, /* @__PURE__ */ h("p", null, "Picture logic puzzles: the numbers beside each row and above each column give the lengths of its runs of filled cells, in order, with at least one empty cell between runs. Fill the cells that match every clue."), /* @__PURE__ */ h("p", null, "Every board has exactly one solution and can be solved by logic alone. Nonograms were devised in 1987 by Non Ishida and, independently, Tetsuya Nishio."), /* @__PURE__ */ h("p", null, "Part of Puzzles by fexofenadine, sharing its window, themes and backgrounds with Minesweeper Plus, which is based on ", /* @__PURE__ */ h(Link, { href: "https://github.com/frenzzy/minesweeper" }, "Minesweeper"), " ", "by Vladimir Kutepov."));
//#endregion
//#region src/nonograms/HowToPlay.jsx
var NonogramsHowToPlay = ({ key, actions }) => /* @__PURE__ */ h(HowToPlay, {
	key,
	name: "Nonograms",
	actions
}, /* @__PURE__ */ h("p", null, "The numbers beside each row and above each column are the lengths of its runs of filled cells, in order, with at least one empty cell between runs. Fill cells until every row and column matches its clue; a clue dims once its line matches."), /* @__PURE__ */ h("p", null, "Click a cell to fill it, again to cross it out and again to clear it, right click to step back. Crosses are notes for yourself and the win never needs them. Drag to paint along a row or column. On a touch screen, the button beside the face picks whether taps fill or cross."), /* @__PURE__ */ h("p", null, "The left counter shows the cells still to fill and Ctrl+Z undoes a whole drag. Show Errors turns a clue red once its line can't match any more, and Hint explains the next step logic gives. Every board has one solution that needs no guessing."));
//#endregion
//#region src/nonograms/app.jsx
var loadChoice = () => {
	const saved = parseInt(load("nonograms.size"), 10);
	const n = sizes.includes(saved) ? saved : 10;
	const level = parseInt(load("nonograms.level"), 10);
	if (!(level >= 0 && level < levelNames.length)) return {
		n,
		level: 0
	};
	return {
		n,
		level: fallback(n, level)
	};
};
var createGame = ({ n, level }) => ({
	n,
	level,
	clues: Array.from({ length: 2 * n }, () => []),
	solution: null,
	board: emptyBoard(n),
	history: [],
	change: 0,
	stroke: null,
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
var { actions: recordActions } = records("nonograms", sizes, levelNames);
var cycle = [
	-1,
	1,
	0
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
		...game,
		board,
		history,
		change: ++changes
	};
	next.win = solved(board, next.n, next.clues);
	if (next.win) {
		cancelAnimationFrame(next.raf);
		actions.win(next);
	}
	const stuck = !next.win && fillsLeft(board, next.n, next.clues) === 0;
	if (stuck && !settled) setTimeout(() => actions.ask(next.change), ASK_AFTER);
	return {
		hint: null,
		prompt: stuck && settled,
		game: next
	};
};
var span = ({ start, axis }, i, n) => {
	const [sx, sy] = [start % n, Math.floor(start / n)];
	const [x, y] = [i % n, Math.floor(i / n)];
	const cells = [];
	if (axis === "row") for (let k = Math.min(sx, x); k <= Math.max(sx, x); k++) cells.push(sy * n + k);
	else if (axis === "column") for (let k = Math.min(sy, y); k <= Math.max(sy, y); k++) cells.push(k * n + sx);
	else cells.push(start);
	return cells;
};
var paint = (stroke, i, n) => {
	const board = stroke.before.slice();
	for (const c of span(stroke, i, n)) if (board[c] === stroke.from) board[c] = stroke.to;
	return board;
};
var axisOf = (stroke, i, n) => {
	if (stroke.axis || i === stroke.start) return stroke.axis;
	return Math.abs(i % n - stroke.start % n) >= Math.abs(Math.floor(i / n) - Math.floor(stroke.start / n)) ? "row" : "column";
};
var cellAt = (event) => {
	const target = document.elementFromPoint?.(event.clientX, event.clientY);
	const cell = target && target.closest("[data-cell]");
	return cell ? Number(cell.dataset.cell) : -1;
};
var state = {
	...shellState(),
	hint: null,
	prompt: false,
	errors: Boolean(load("nonograms.errors")),
	rain: Boolean(load("nonograms.rain")),
	touch: Boolean(window.matchMedia && matchMedia("(pointer: coarse)").matches),
	mode: 1,
	about: false,
	game: createGame(loadChoice()),
	winner: null,
	bestTime: null
};
var actions = {
	...shellActions,
	init: () => (state, actions) => {
		window.addEventListener("keydown", actions.press);
		window.addEventListener("pointermove", (event) => {
			const i = cellAt(event);
			if (i >= 0) actions.drag(i);
		});
		window.addEventListener("pointerup", () => actions.up());
		window.addEventListener("pointercancel", () => actions.up());
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
		save("nonograms.size", n);
		save("nonograms.level", level);
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
	dealt: ({ id, clues, solution }) => ({ game }) => {
		if (game.deal !== id) return null;
		return { game: {
			...game,
			clues,
			solution,
			dealing: false
		} };
	},
	down: ({ event, i }) => ({ game, mode }, actions) => {
		if (event.button !== 0 && event.button !== 2) return null;
		if (game.dealing || game.paused || game.win || game.stroke) return null;
		const touch = event.pointerType === "touch";
		const from = game.board[i];
		let to = cycle[(cycle.indexOf(from) + (event.button === 2 ? 2 : 1)) % 3];
		if (touch) to = from === mode ? -1 : mode;
		const stroke = {
			start: i,
			from,
			to,
			axis: null,
			before: game.board,
			touch
		};
		return {
			...touch && { touch },
			game: {
				...begin(game, actions),
				stroke,
				board: paint(stroke, i, game.n)
			}
		};
	},
	drag: (i) => ({ game }) => {
		const { stroke, n } = game;
		if (!stroke) return null;
		const next = {
			...stroke,
			axis: axisOf(stroke, i, n)
		};
		const board = paint(next, i, n);
		if (board.every((v, c) => v === game.board[c])) return null;
		return { game: {
			...game,
			stroke: next,
			board
		} };
	},
	up: () => ({ game }, actions) => {
		const { stroke, board } = game;
		if (!stroke) return null;
		const step = [...board.keys()].filter((c) => board[c] !== stroke.before[c]).map((c) => [c, stroke.before[c]]);
		const history = step.length ? [...game.history, step] : game.history;
		const passing = step.length === 1 && stroke.from === -1 && stroke.to === 1 && !stroke.touch;
		return changed({
			...game,
			stroke: null
		}, board, history, actions, !passing);
	},
	undo: () => ({ game }, actions) => {
		if (!game.history.length || game.win || game.paused || game.dealing || game.stroke) return { menu: null };
		const board = game.board.slice();
		for (const [c, from] of game.history[game.history.length - 1]) board[c] = from;
		return {
			menu: null,
			...changed(game, board, game.history.slice(0, -1), actions)
		};
	},
	ask: (change) => ({ game }) => {
		if (game.change !== change || game.win || game.paused || game.stroke) return null;
		return { prompt: fillsLeft(game.board, game.n, game.clues) === 0 };
	},
	hint: () => ({ game }, actions) => {
		if (game.dealing || game.win || game.paused || game.stroke) return { menu: null };
		const { board, solution, clues, n } = game;
		return {
			menu: null,
			prompt: false,
			hint: findHint({
				board,
				solution,
				clues,
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
	setMode: (mode) => ({ mode }),
	toggleErrors: () => (state) => {
		save("nonograms.errors", state.errors ? "" : "yes");
		return {
			menu: null,
			errors: !state.errors
		};
	},
	toggleRain: () => (state) => {
		save("nonograms.rain", state.rain ? "" : "yes");
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
	...recordActions
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
	title: "Fastest Nonogram Solvers",
	sizes,
	levelNames,
	allowed,
	state: state.bestTime,
	actions
}), state.prompt && /* @__PURE__ */ h(Prompt, {
	key: "d",
	title: "Nonograms",
	text: "All the filled cells are placed but there are errors. Do you want to use a hint?",
	actions
}), state.backgroundSettings && /* @__PURE__ */ h(BackgroundSettings, {
	key: "e",
	state: state.backgroundSettings,
	actions
}), state.about && /* @__PURE__ */ h(NonogramsAbout, {
	key: "f",
	actions
}), state.howTo && /* @__PURE__ */ h(NonogramsHowToPlay, {
	key: "i",
	actions
}), state.boss && /* @__PURE__ */ h(Boss, {
	key: "g",
	state: state.boss,
	actions
}));
//#endregion
//#region src/nonograms/index.js
app(state, actions, view, document.getElementById("app"));
startBackgrounds();
registerWorker();
//#endregion
