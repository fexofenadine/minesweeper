import { h } from 'hyperapp'
import Button from '../Button'

//title bar pause and zoom buttons in place of a resize grip
const WindowControls = ({ scale, onZoom, paused, canPause, onPause }) => [
  <Button
    tabIndex={-1}
    title={paused ? 'Resume (P)' : 'Pause (P)'}
    disabled={!canPause}
    onClick={() => onPause()}
  >
    <svg width="13" height="11">
      <path d={paused ? 'M4 1.5v8l6-4z' : 'M4 2h2v7H4zM8 2h2v7H8z'} />
    </svg>
  </Button>,
  <Button tabIndex={-1} title="Zoom out" disabled={scale <= 0.5} onClick={() => onZoom(-1)}>
    <svg width="13" height="11">
      <path d="M3 5h8v2H3z" />
    </svg>
  </Button>,
  <Button tabIndex={-1} title="Zoom in" disabled={scale >= 4} onClick={() => onZoom(1)}>
    <svg width="13" height="11">
      <path d="M6 2h2v3h3v2H8v3H6V7H3V5h3z" />
    </svg>
  </Button>,
]

export default WindowControls
