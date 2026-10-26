//#region src/Overlay.jsx?raw
var Overlay_default = "import { h } from 'hyperapp'\r\nimport s from './Overlay.module.css'\r\n\r\nconst Overlay = ({ key, onKeyDown }, children) => (\r\n  <section key={key} class={s.root} tabindex={-1} onkeydown={onKeyDown}>\r\n    <div class={s.table}>\r\n      <div class={s.cell}>{children}</div>\r\n    </div>\r\n  </section>\r\n)\r\n\r\nexport default Overlay\r\n";
//#endregion
export { Overlay_default as default };
