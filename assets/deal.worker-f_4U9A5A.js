(function() {
	//#region src/shell/random.js
	const random = (seed) => {
		let a = seed >>> 0;
		return () => {
			a = a + 1831565813 >>> 0;
			let t = a;
			t = Math.imul(t ^ t >>> 15, t | 1);
			t ^= t + Math.imul(t ^ t >>> 7, t | 61);
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	};
	//#endregion
	//#region src/shell/grid.js
	const cellCache = {};
	const cellsOf = (n) => cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) => Array.from({ length: n }, (_, k) => line < n ? line * n + k : k * n + line - n));
	const capital = (text) => text[0].toUpperCase() + text.slice(1);
	const emptyBoard = (n) => new Int8Array(n * n).fill(-1);
	const runsOf = (values) => {
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
	const sameRuns = (a, b) => a.length === b.length && a.every((run, k) => run === b[k]);
	const cluesOf = (solution, n) => cellsOf(n).map((cells) => runsOf(cells.map((i) => solution[i])));
	const placements = (values, clue) => {
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
	const settleLine = (values, clue) => {
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
	//#endregion
	//#region src/nonograms/solver.js
	const propagate = (board, n, clues, lines = null, trace = null, settle = settleLine) => {
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
	const linesThrough = (i, n) => [Math.floor(i / n), n + i % n];
	const contradiction = (board, n, clues, deadline = Infinity) => {
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
	const deduce = (board, n, clues, deep = true, deadline = Infinity) => {
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
	const levels = [
		"easy",
		"medium",
		"hard",
		"expert"
	];
	const ordinals = [
		"first",
		"second",
		"third",
		"fourth",
		"fifth",
		"sixth",
		"seventh",
		"eighth"
	];
	const sum = (clue) => clue.reduce((a, b) => a + b, 0);
	const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
	const empties = (values, ks) => ks.filter((k) => values[k] === -1);
	const known = (values) => [...values.keys()].filter((k) => values[k] !== -1);
	const clueText = (clue) => clue.length ? clue.join(" ") : "0";
	const span = (a, b) => a === b ? `cell ${a + 1}` : `cells ${a + 1} to ${b + 1}`;
	const runName = (clue, j) => {
		if (clue.filter((run) => run === clue[j]).length === 1) return `the ${clue[j]}`;
		const nth = clue.slice(0, j + 1).filter((run) => run === clue[j]).length - 1;
		return `the ${ordinals[nth] ?? `number ${nth + 1}`} ${clue[j]}`;
	};
	const result = (place) => {
		const one = place.length === 1;
		if (place.every(([, v]) => v === 1)) return one ? "that cell is filled" : "those cells are filled";
		if (place.every(([, v]) => v === 0)) return one ? "that cell is empty" : "those cells are empty";
		return "those cells are filled and emptied as shown";
	};
	const extremes = (fit, clue, n) => clue.map((run, j) => {
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
	const pushed = (values, view, clue, [cover, gap], lead) => {
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
				text: (name, [first, last]) => left === right ? capital(`${lead}${runName(clue, j)} in ${name} only fits in ${span(left, left + run - 1)}, so ${result(place)}.`) : capital(`${lead}${runName(clue, j)} in ${name} covers ${span(left, left + run - 1)} pushed as far ${first} as it goes and ${span(right, right + run - 1)} pushed as far ${last}. Wherever it sits it covers ${span(right, left + run - 1)}, so ${result(place)}.`)
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
	const easy = (values, clue) => {
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
		const view = values.map((v) => v === 1 ? -1 : v);
		return pushed(values, view, clue, ["overlap", "gap"], "");
	};
	const medium = (values, clue) => pushed(values, values, clue, ["forcing", "reach"], "with the cells already known, ");
	const hard = (values, clue) => {
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
	const finders = [
		easy,
		medium,
		hard
	];
	const settleUpTo = (level) => (values, clue) => {
		if (level >= 2) return settleLine(values, clue);
		const out = Int8Array.from(values);
		for (;;) {
			if (!placements(out, clue)) return null;
			const place = finders[level](out, clue).flatMap((s) => s.place);
			if (!place.length) return out;
			for (const [k, v] of place) out[k] = v;
		}
	};
	const solveAt = (board, n, clues, level, deadline = Infinity) => {
		if (!propagate(board, n, clues, null, null, settleUpTo(level))) return false;
		if (!board.includes(-1)) return true;
		return level >= 3 && deduce(board, n, clues, true, deadline) !== null;
	};
	const rate = (clues, n, top = levels.length - 1) => {
		const board = emptyBoard(n);
		for (let level = 0; level <= top; level++) if (solveAt(board, n, clues, level)) return level;
		return null;
	};
	//#endregion
	//#region src/nonograms/generate.js
	const makePicture = (n, rng, dense = 0) => {
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
	const makePuzzle = (n, rng, top = levels.length - 1, deadline = Infinity) => {
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
	const makeGame = (n, level, rng, budget = n >= 20 ? 3e3 : 1500) => {
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
	//#region src/nonograms/deal.worker.js
	self.onmessage = ({ data: { id, n, level, seed } }) => {
		const { solution, clues, level: got } = makeGame(n, level, random(seed));
		self.postMessage({
			id,
			solution,
			clues,
			level: got
		}, [solution.buffer]);
	};
	//#endregion
})();
