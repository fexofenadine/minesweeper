import { h } from 'hyperapp'
import s from './Cell.module.css'

const inRange = (x, y, u, v) =>
  u >= 0 && v >= 0 && (x - u - 1) * (x - u + 1) <= 0 && (y - v - 1) * (y - v + 1) <= 0

const Num1 = () => <path class={s.n1} d="M4 12v-2h2V6H4V5l3-3h2v8h2v2H4z" />

const Num2 = () => (
  <path class={s.n2} d="M2 12h10v-2H6v-.5L11 7l1-1V3l-1-1H3L2 3v2h3V4h4v1L8 6 2 9v3z" />
)

const Num3 = () => <path class={s.n3} d="M2 10h7V8H5V6h4V4H2V2h9l1 1v3l-1 1 1 1v3l-1 1H2v-2z" />

const Num4 = () => <path class={s.n4} d="M8 12h3V8h1V6h-1V2H8v4H5l2-4H4L2 6v2h6v4z" />

const Num5 = () => <path class={s.n5} d="M2 2h10v2H5v2h6l1 1v4l-1 1H2v-2h7V8H2V2z" />

const Num6 = () => <path class={s.n6} d="M11 6H5V4h6V2H3L2 3v8l1 1h8l1-1V7zm-2 4H5V8h4z" />

const Num7 = () => <path class={s.n7} d="M2 2h10v4l-3 6H6l3-6V4H2V2z" />

const Num8 = () => (
  <path
    class={s.n8}
    d="M12 3l-1-1H3L2 3v3l1 1-1 1v3l1 1h8l1-1V8l-1-1 1-1zm-3 7H5V8h4zm0-4H5V4h4z"
  />
)

const Flag = () => (
  <g class={s.flag}>
    <path d="M9 10.5V3H8v7l-4 2v1h8v-1z" />
    <path class={s.flagCloth} d="M9 3v5H8L4 5.5 8 3z" />
  </g>
)

const Mark = () => (
  <text x="50%" y="50%" dx=".5" dy=".4em" text-anchor="middle">
    ?
  </text>
)

const Fail = () => (
  <path
    class={s.wrong}
    d="M13.854 1.854l-.708-.708L7.5 6.793 1.854 1.146l-.708.708L6.793 7.5l-5.647 5.646.708.708L7.5 8.207l5.646 5.647.708-.708L8.207 7.5l5.647-5.646z"
  />
)

const Mine = () => (
  <g class={s.mine}>
    <path d="M13.5 7h-1.55A4.445 4.445 0 0 0 11 4.705l.741-.741a.5.5 0 1 0-.707-.707l-.74.743A4.446 4.446 0 0 0 8 3.05V1.5a.5.5 0 0 0-1 0v1.55A4.452 4.452 0 0 0 4.705 4l-.741-.741a.5.5 0 0 0-.707.707L4 4.705A4.452 4.452 0 0 0 3.05 7H1.5a.5.5 0 0 0 0 1h1.55A4.446 4.446 0 0 0 4 10.294l-.741.741a.5.5 0 0 0 .354.854.5.5 0 0 0 .353-.147L4.705 11A4.445 4.445 0 0 0 7 11.95v1.55a.5.5 0 0 0 1 0v-1.55a4.452 4.452 0 0 0 2.3-.95l.74.74a.5.5 0 0 0 .707-.707L11 10.3a4.452 4.452 0 0 0 .95-2.3h1.55a.5.5 0 0 0 0-1z" />
    <circle class={s.shine} cx="6" cy="6" r="1" />
  </g>
)

const Symbol = ({ opened, mined, flag, mark, num, lose }) => {
  if (opened) {
    if (mined) return <Mine />
    switch (num) {
      case 1:
        return <Num1 />
      case 2:
        return <Num2 />
      case 3:
        return <Num3 />
      case 4:
        return <Num4 />
      case 5:
        return <Num5 />
      case 6:
        return <Num6 />
      case 7:
        return <Num7 />
      case 8:
        return <Num8 />
      default:
        return null
    }
  }
  if (flag) {
    if (lose && !mined)
      return (
        <g>
          <Mine />
          <Fail />
        </g>
      )
    return <Flag />
  }
  if (lose && mined) return <Mine />
  if (mark) return <Mark />
  return null
}

const hintClass = {
  source: s.hintSource,
  safe: s.hintSafe,
  mine: s.hintMine,
  wrong: s.hintWrong,
  unsure: s.hintUnsure,
}

const isPressed = ({ x, y, pressed, pressedX, pressedY, group, opened, mined, flag, lose }) =>
  opened ||
  (pressed && !flag && pressedX === x && pressedY === y) ||
  (group && !flag && inRange(x, y, pressedX, pressedY)) ||
  (lose && ((!flag && mined) || (flag && !mined)))

const Cell = ({
  x,
  y,
  pressed,
  pressedX,
  pressedY,
  group,
  opened,
  mined,
  flag,
  mark,
  num,
  lose,
  hint,
  onDown,
  onMove,
  onTouch,
  onChord,
}) => (
  <button
    type="button"
    class={[
      isPressed({ x, y, pressed, pressedX, pressedY, group, opened, mined, flag, lose })
        ? s.pressed
        : s.root,
      hint && hintClass[hint],
    ]
      .filter(Boolean)
      .join(' ')}
    tabindex={-1}
    onmousedown={(event) => {
      onDown({ event, x, y })
    }}
    onmouseenter={() => {
      onMove({ x, y })
    }}
    onmouseleave={() => {
      onMove({ x: -1, y: -1 })
    }}
    ontouchstart={(event) => {
      onTouch({ event, x, y })
    }}
    ondblclick={() => {
      onChord({ x, y })
    }}
  >
    <svg class={opened && mined ? s.hurt : s.image} width="15" height="15">
      <Symbol opened={opened} mined={mined} flag={flag} mark={mark} num={num} lose={lose} />
    </svg>
  </button>
)

export default Cell
