//#region src/takuzu/deal.worker.js?raw
var deal_worker_default = "import { makeGame, random } from './generate'\n\nself.onmessage = ({ data: { id, n, level, seed } }) => {\n  const { givens, solution, level: got } = makeGame(n, level, random(seed))\n  self.postMessage({ id, givens, solution, level: got }, [givens.buffer, solution.buffer])\n}\n";
//#endregion
export { deal_worker_default as default };
