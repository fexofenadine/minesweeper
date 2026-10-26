//#region src/Button.jsx?raw
var Button_default = "import { h } from 'hyperapp'\r\nimport s from './Button.module.css'\r\n\r\nconst Button = ({ key, type, tabIndex, title, disabled, onClick, onCreate }, children) => (\r\n  <button\r\n    key={key}\r\n    class={s.root}\r\n    type={type}\r\n    tabindex={tabIndex}\r\n    title={title}\r\n    disabled={disabled}\r\n    onclick={onClick}\r\n    oncreate={onCreate}\r\n  >\r\n    {children}\r\n  </button>\r\n)\r\n\r\nexport default Button\r\n";
//#endregion
export { Button_default as default };
