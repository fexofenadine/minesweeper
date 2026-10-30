import { B as glyphImage, G as Dialog, H as remove, K as Button, R as BRIGHT, U as save, V as load, Y as h, _ as Overlay, m as BestTime_module_default, p as Tabs, z as GLYPH } from "./worker-Wr9OcuEt.js";
//#region src/shell/records.js
var records = (prefix, sizes, levelNames) => {
	const timeKey = (n, level, hinted) => `${prefix}.${n}.${level}${hinted ? ".hints" : ""}`;
	const eachSlot = (fn) => sizes.flatMap((n) => levelNames.map((_, level) => fn(n, level, `${n}.${level}`)));
	const bestTimes = (hinted) => Object.fromEntries(eachSlot((n, level, slot) => {
		const key = timeKey(n, level, hinted);
		return [slot, {
			time: parseInt(load(key), 10) || 999,
			name: load(`${key}.name`) || "Anonymous"
		}];
	}));
	const clearBestTimes = (hinted) => {
		eachSlot((n, level) => {
			const key = timeKey(n, level, hinted);
			remove(key);
			remove(`${key}.name`);
		});
		return bestTimes(hinted);
	};
	return {
		timeKey,
		eachSlot,
		actions: {
			win: ({ n, level, hinted, time }) => () => {
				const key = timeKey(n, level, hinted);
				const best = parseInt(load(key), 10);
				if (best && best <= time) return null;
				return { winner: {
					key,
					time,
					hinted,
					level: `${levelNames[level].toLowerCase()} ${n} × ${n}`,
					name: load(`${prefix}.name`) || ""
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
				save(`${prefix}.name`, name);
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
		}
	};
};
//#endregion
//#region src/shell/grid.js
var cellCache = {};
var cellsOf = (n) => cellCache[n] ??= Array.from({ length: 2 * n }, (_, line) => Array.from({ length: n }, (_, k) => line < n ? line * n + k : k * n + line - n));
var lineName = (line, n) => line < n ? `row ${line + 1}` : `column ${line - n + 1}`;
var capital = (text) => text[0].toUpperCase() + text.slice(1);
var BestTimes_module_default = {
	table: "BestTimes_table",
	level: "BestTimes_level",
	size: "BestTimes_size",
	slot: "BestTimes_slot",
	time: "BestTimes_time",
	name: "BestTimes_name"
};
//#endregion
//#region src/shell/BestTimes.jsx
var tabs = [{
	id: "clean",
	name: "No hints"
}, {
	id: "hinted",
	name: "Hints used"
}];
var BestTimes = ({ key, title, sizes, levelNames, allowed, state, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.toggleBestTime()
}, /* @__PURE__ */ h(Dialog, {
	title,
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
//#region src/shell/Prompt.jsx
var Prompt = ({ key, title, text, actions }) => /* @__PURE__ */ h(Overlay, {
	key,
	onKeyDown: (event) => event.keyCode === 27 && actions.answerPrompt(false)
}, /* @__PURE__ */ h(Dialog, {
	title,
	onClose: () => actions.answerPrompt(false)
}, /* @__PURE__ */ h("div", { class: Prompt_module_default.root }, /* @__PURE__ */ h("p", { class: Prompt_module_default.text }, text), /* @__PURE__ */ h("div", { class: Prompt_module_default.footer }, /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: () => actions.answerPrompt(true)
}, /* @__PURE__ */ h("span", { class: Prompt_module_default.button }, "Yes")), /* @__PURE__ */ h(Button, {
	type: "button",
	onClick: () => actions.answerPrompt(false),
	onCreate: (el) => el.focus()
}, /* @__PURE__ */ h("span", { class: Prompt_module_default.button }, "No"))))));
//#endregion
//#region src/shell/deal.js
var dealer = (start, here) => {
	let worker = null;
	const waiting = /* @__PURE__ */ new Map();
	let count = 0;
	const giveUp = () => {
		worker = false;
		waiting.forEach(({ ask, resolve }) => resolve(here(ask)));
		waiting.clear();
	};
	const open = () => {
		if (worker !== null) return worker;
		try {
			worker = start();
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
	return (ask) => {
		if (typeof Worker === "undefined" || !open()) return Promise.resolve(here(ask));
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
};
//#endregion
//#region src/shell/random.js
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
//#endregion
//#region src/shell/rain.js
var rain = ["ｼ", "ﾓ"];
var showRain = (on) => {
	const root = document.documentElement;
	if (!on) {
		delete root.dataset.rain;
		return;
	}
	if (!root.style.getPropertyValue("--rain-0")) {
		const dim = glyphImage(rain[0], 192, GLYPH);
		const bright = glyphImage(rain[1], 192, BRIGHT);
		if (!dim || !bright) return;
		root.style.setProperty("--rain-0", `url(${dim})`);
		root.style.setProperty("--rain-1", `url(${bright})`);
	}
	root.dataset.rain = "on";
};
//#endregion
export { Prompt as a, cellsOf as c, dealer as i, lineName as l, random as n, BestTimes as o, shuffled as r, capital as s, showRain as t, records as u };
