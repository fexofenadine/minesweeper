//#region src/takuzu/deal.js?raw
var deal_default = "import { dealer } from '../shell/deal'\nimport { makeGame, random } from './generate'\n\nconst dealOne = dealer(\n  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),\n  ({ n, level, seed }) => makeGame(n, level, random(seed)),\n)\n\nexport const deal = (n, level, seed) => dealOne({ n, level, seed })\n";
//#endregion
export { deal_default as default };
