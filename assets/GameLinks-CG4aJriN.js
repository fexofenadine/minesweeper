//#region src/shell/GameLinks.jsx?raw
var GameLinks_default = "import { h } from 'hyperapp'\nimport { SubMenuItem } from '../Menu'\n\nconst games = [\n  ['minesweeper', 'Minesweeper'],\n  ['takuzu', 'Takuzu'],\n  ['nonograms', 'Nonograms'],\n]\n\n//every game's page for the game menu, the open one checked\nexport const gameLinks = (current) =>\n  games.map(([id, name]) => (\n    <SubMenuItem\n      name={name}\n      checked={id === current}\n      onClick={() => id !== current && location.assign(`../${id}/`)}\n    />\n  ))\n";
//#endregion
export { GameLinks_default as default };
