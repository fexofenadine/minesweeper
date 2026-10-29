//#region src/shell/worker.js?raw
var worker_default = "//the shared worker sits beside the game folders, each game is its own scope\nexport const registerWorker = () => {\n  if ('serviceWorker' in navigator && import.meta.env.PROD) {\n    //refused when storage is blocked, which is fine\n    navigator.serviceWorker.register('../service-worker.js', { scope: './' }).catch(() => {})\n  }\n}\n";
//#endregion
export { worker_default as default };
