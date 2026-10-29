//#region src/nonograms/deal.worker.js?raw
var deal_worker_default = "import { makeGame, random } from './generate'\r\n\r\nself.onmessage = ({ data: { id, n, level, seed } }) => {\r\n  const { solution, clues, level: got } = makeGame(n, level, random(seed))\r\n  self.postMessage({ id, solution, clues, level: got }, [solution.buffer])\r\n}\r\n";
//#endregion
export { deal_worker_default as default };
