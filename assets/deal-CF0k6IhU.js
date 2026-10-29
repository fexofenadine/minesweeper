//#region src/nonograms/deal.js?raw
var deal_default = "import { dealer } from '../shell/deal'\r\nimport { makeGame, random } from './generate'\r\n\r\nconst dealOne = dealer(\r\n  () => new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' }),\r\n  ({ n, level, seed }) => makeGame(n, level, random(seed)),\r\n)\r\n\r\nexport const deal = (n, level, seed) => dealOne({ n, level, seed })\r\n";
//#endregion
export { deal_default as default };
