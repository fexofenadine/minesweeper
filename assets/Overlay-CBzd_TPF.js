//#region src/Overlay.jsx?raw
var Overlay_default = "import { h } from 'hyperapp'\r\nimport s from './Overlay.module.css'\r\n\r\n//esc closes the dialog, so it never reaches the boss key\r\nconst keyDown = (onKeyDown) => (event) => {\r\n  if (event.keyCode === 27 && onKeyDown) event.stopPropagation()\r\n  if (onKeyDown) onKeyDown(event)\r\n}\r\n\r\nconst Overlay = ({ key, onKeyDown }, children) => (\r\n  <section key={key} class={s.root} tabindex={-1} onkeydown={keyDown(onKeyDown)}>\r\n    <div class={s.table}>\r\n      <div class={s.cell}>{children}</div>\r\n    </div>\r\n  </section>\r\n)\r\n\r\nexport default Overlay\r\n";
//#endregion
export { Overlay_default as default };
