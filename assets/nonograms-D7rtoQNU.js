//#region src/nonograms/index.js?raw
var nonograms_default = "import { app } from 'hyperapp'\nimport { state, actions, view } from './app'\nimport { startBackgrounds } from '../shell/backgrounds'\nimport { registerWorker } from '../shell/worker'\n\napp(state, actions, view, document.getElementById('app'))\nstartBackgrounds()\n\nregisterWorker()\n";
//#endregion
export { nonograms_default as default };
