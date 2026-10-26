//#region src/index.js?raw
var src_default = "import { app } from 'hyperapp'\nimport { state, actions, view } from './app'\nimport { startBackgrounds } from './backgrounds'\n\napp(state, actions, view, document.getElementById('app'))\nstartBackgrounds()\n\nif ('serviceWorker' in navigator && import.meta.env.PROD) {\n  //browsers that block site storage refuse to register, the game works without it\n  navigator.serviceWorker.register('service-worker.js').catch(() => {})\n}\n";
//#endregion
export { src_default as default };
