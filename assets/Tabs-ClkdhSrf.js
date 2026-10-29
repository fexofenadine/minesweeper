//#region src/shell/Tabs.jsx?raw
var Tabs_default = "import { h } from 'hyperapp'\nimport s from '../BestTime.module.css'\n\n//the tab row above a dialog's table\nconst Tabs = ({ tabs, active, onSelect }) => (\n  <div class={s.tabs} role=\"tablist\">\n    {tabs.map((tab) => (\n      <button\n        type=\"button\"\n        role=\"tab\"\n        tabindex={-1}\n        aria-selected={active === tab.id}\n        class={active === tab.id ? s.tabActive : s.tab}\n        onclick={() => onSelect(tab.id)}\n      >\n        {tab.name}\n      </button>\n    ))}\n  </div>\n)\n\nexport default Tabs\n";
//#endregion
export { Tabs_default as default };
