//#region src/index.js?raw
var src_default = "import { app } from 'hyperapp'\nimport { state, actions, view } from './app'\nimport { startBackgrounds } from './backgrounds'\n\napp(state, actions, view, document.getElementById('app'))\nstartBackgrounds()\n\nif ('serviceWorker' in navigator && import.meta.env.PROD) {\n  //refused when storage is blocked, which is fine\n  navigator.serviceWorker.register('service-worker.js').catch(() => {})\n}\n";
//#endregion
export { src_default as default };
