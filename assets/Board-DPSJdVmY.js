//#region src/shell/Board.jsx?raw
var Board_default = "import { h } from 'hyperapp'\nimport s from './Board.module.css'\nimport Button from '../Button'\nimport { hangBelow } from './zoom'\n\n//the play button over a paused board\nexport const PausedCover = ({ onResume }) => (\n  <div class={s.paused}>\n    <Button tabIndex={-1} title=\"Resume (P)\" onClick={() => onResume()}>\n      <svg width=\"40\" height=\"40\">\n        <path d=\"M14 9v22l17-11z\" />\n      </svg>\n    </Button>\n  </div>\n)\n\n//the explanation under the board, hanging below the window's place so the board never moves\nexport const HintPanel = ({ text }) => (\n  <p class={s.hint} role=\"status\" {...hangBelow}>\n    {text}\n  </p>\n)\n";
//#endregion
export { Board_default as default };
