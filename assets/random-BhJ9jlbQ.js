//#region src/shell/random.js?raw
var random_default = "//seeded so a board can be dealt again from its number\nexport const random = (seed) => {\n  let a = seed >>> 0\n  return () => {\n    a = (a + 0x6d2b79f5) >>> 0\n    let t = a\n    t = Math.imul(t ^ (t >>> 15), t | 1)\n    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)\n    return ((t ^ (t >>> 14)) >>> 0) / 4294967296\n  }\n}\n\nexport const shuffled = (list, rng) => {\n  const copy = list.slice()\n  for (let i = copy.length - 1; i > 0; i--) {\n    const j = Math.floor(rng() * (i + 1))\n    ;[copy[i], copy[j]] = [copy[j], copy[i]]\n  }\n  return copy\n}\n";
//#endregion
export { random_default as default };
