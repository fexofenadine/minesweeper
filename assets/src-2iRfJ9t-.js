//#region src/index.js?raw
var src_default = "import { app } from 'hyperapp'\r\nimport { state, actions, view } from './app'\r\nimport { startBackgrounds } from './shell/backgrounds'\r\nimport { registerWorker } from './shell/worker'\r\n\r\napp(state, actions, view, document.getElementById('app'))\r\nstartBackgrounds()\r\n\r\nregisterWorker()\r\n";
//#endregion
export { src_default as default };
