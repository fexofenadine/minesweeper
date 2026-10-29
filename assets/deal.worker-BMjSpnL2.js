(function() {
	const lineCache = {};
	const cellCache = {};
	const linesOf = (n) => lineCache[n] ??= Array.from({ length: 1 << n }, (_, mask) => mask).filter((mask) => {
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
	const cellsOf = (n) => cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) => Array.from({ length: n }, (_, k) => line < n ? line * n + k : k * n + line - n));
	const readLine = (board, cells) => {
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
	const emptyBoard = (n) => new Int8Array(n * n).fill(-1);
	const full = (board) => !board.includes(-1);
	const lineName = (line, n) => line < n ? `row ${line + 1}` : `column ${line - n + 1}`;
	const capital = (text) => text[0].toUpperCase() + text.slice(1);
	const breaks = (board, n) => {
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
	const violations = (board, n) => new Set(breaks(board, n).flatMap((b) => b.cells));
	//#endregion
	//#region src/takuzu/solver.js
	const startCandidates = (n) => Array.from({ length: 2 * n }, () => linesOf(n));
	const propagate = (board, n, candidates) => {
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
	const search = (board, n, candidates, limit, order, found, budget) => {
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
	const asIs = (list) => list;
	const countSolutions = (board, n, limit = 2) => search(board.slice(), n, startCandidates(n), limit, asIs, [], { left: Infinity });
	const solve = (board, n, shuffle = asIs, tries = Infinity) => {
		const found = [];
		search(board.slice(), n, startCandidates(n), 1, shuffle, found, { left: tries });
		return found[0] ?? null;
	};
	//#endregion
	//#region src/takuzu/techniques.js
	const levels = [
		"easy",
		"medium",
		"tricky",
		"hard",
		"expert"
	];
	const words = [
		"no",
		"one",
		"two",
		"three",
		"four",
		"five",
		"six",
		"seven"
	];
	const many = (count, v) => `${words[count]} ${v}${count === 1 ? "" : "s"}`;
	const result = (place) => {
		if (place.length === 1) return `this cell must be a ${place[0][1]}`;
		const v = place[0][1];
		if (place.every((p) => p[1] === v)) return `these cells must all be ${v}s`;
		return "these cells must be filled as highlighted";
	};
	const step = (technique, level, place, sources, text) => ({
		technique,
		level,
		place,
		sources,
		text
	});
	const pairs = (board, n) => {
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
	const gaps = (board, n) => {
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
	const counts = (board, n) => {
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
	const oneLeft = (board, n) => {
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
	const twins = (board, n) => {
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
	const fitsOf = (board, cells, n, repeats) => {
		const { known, value } = readLine(board, cells);
		return linesOf(n).filter((mask) => (mask & known) === value && !repeats?.has(mask));
	};
	const forced = (board, cells, n, fits) => {
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
	const fullLines = (board, n) => {
		const done = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
		const all = (1 << n) - 1;
		cellsOf(n).forEach((cells, line) => {
			const { known, value } = readLine(board, cells);
			if (known === all) done[line < n ? 0 : 1].set(value, line);
		});
		return done;
	};
	const balance = (board, n) => {
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
	const repeats = (board, n) => {
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
	const whatIf = (board, n) => {
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
	const techniques = [
		[pairs, gaps],
		[counts],
		[oneLeft, twins],
		[balance, repeats],
		[whatIf]
	];
	const nextSteps = (board, n, top = levels.length - 1) => {
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
	const apply = (board, n, steps) => {
		for (const { place } of steps) for (const [i, v] of place) {
			if (board[i] !== -1 && board[i] !== v) return false;
			board[i] = v;
		}
		return violations(board, n).size === 0;
	};
	const rate = (givens, n, top = levels.length - 1) => {
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
	//#region src/takuzu/generate.js
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
	const shuffled = (list, rng) => {
		const copy = list.slice();
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	};
	const makeSolution = (n, rng) => {
		for (;;) {
			const board = solve(emptyBoard(n), n, (list) => shuffled(list, rng), 4 * n);
			if (board) return board;
		}
	};
	const makePuzzle = (n, rng, keep = (board) => countSolutions(board, n, 2) === 1) => {
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
	const makeGame = (n, level, rng, budget = 1500) => {
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
	//#region src/takuzu/deal.worker.js
	self.onmessage = ({ data: { id, n, level, seed } }) => {
		const { givens, solution, level: got } = makeGame(n, level, random(seed));
		self.postMessage({
			id,
			givens,
			solution,
			level: got
		}, [givens.buffer, solution.buffer]);
	};
	//#endregion
})();
