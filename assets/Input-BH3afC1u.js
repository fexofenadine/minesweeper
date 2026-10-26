//#region src/Input.jsx?raw
var Input_default = "import { h } from 'hyperapp'\r\nimport s from './Input.module.css'\r\n\r\nconst Input = ({ key, id, type, name, value, maxLength, inputMode, onInput, onCreate }) => (\r\n  <span class={s.root}>\r\n    <input\r\n      key={key}\r\n      id={id}\r\n      class={s.input}\r\n      type={type || 'text'}\r\n      name={name}\r\n      value={value}\r\n      maxlength={maxLength}\r\n      inputmode={inputMode}\r\n      oninput={onInput}\r\n      oncreate={onCreate}\r\n    />\r\n  </span>\r\n)\r\n\r\nexport default Input\r\n";
//#endregion
export { Input_default as default };
