import { CROSS, EMPTY, FILL, breaks, solved } from './rules'
import { nextSteps } from './techniques'

export const completeWithErrors =
  'All the filled cells are placed but there are errors. Do you want to use a hint?'

const marked = (entries) => Object.fromEntries(entries)

//a cell that can't be right: filled where the picture is empty, or crossed out where it is filled
const misfit = (board, solution, i) =>
  (board[i] === FILL && !solution[i]) || (board[i] === CROSS && solution[i] === 1)

//the next thing to do: a clue that can't be matched first, then a cell that can't be right,
//then the easiest step
//returns { kind, text, marks, line?, place? }, marks maps a cell to source, fill, cross or wrong
//and line is the clue to outline
export const findHint = ({ board, solution, clues, n }) => {
  if (solved(board, n, clues)) return { kind: 'solved', text: 'The puzzle is solved.', marks: {} }
  const broken = breaks(board, n, clues)
  if (broken.length) {
    //a broken line's cells are not all wrong, so the solution picks out the ones to change
    const { line, cells, text } = broken[0]
    const bad = cells.filter((i) => misfit(board, solution, i))
    const known = cells.filter((i) => board[i] !== EMPTY)
    return {
      kind: 'break',
      line,
      text: bad.length
        ? `${text} ${bad.length > 1 ? 'The cells outlined in red are the ones' : 'The cell outlined in red is the one'} to change.`
        : text,
      marks: marked(known.map((i) => [i, bad.includes(i) ? 'wrong' : 'source'])),
    }
  }
  //a cell can break no clue yet and still not fit the only solution
  const wrong = [...board.keys()].find((i) => misfit(board, solution, i))
  if (wrong !== undefined) {
    return {
      kind: 'wrong',
      text: `This ${board[wrong] === FILL ? 'filled' : 'crossed out'} cell doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
      marks: { [wrong]: 'wrong' },
    }
  }
  const { steps } = nextSteps(board, n, clues)
  if (!steps.length) {
    //generated boards never get here, but a hint should never come back empty
    const i = board.indexOf(EMPTY)
    const value = solution[i] ? FILL : CROSS
    return {
      kind: 'reveal',
      text: 'No rule gives the next cell away, so this one comes from the solution.',
      place: [[i, value]],
      marks: { [i]: value === FILL ? 'fill' : 'cross' },
    }
  }
  const { technique, line, text, place, sources } = steps[0]
  return {
    kind: technique,
    line,
    text,
    place,
    marks: marked([
      ...sources.map((i) => [i, 'source']),
      ...place.map(([i, v]) => [i, v === FILL ? 'fill' : 'cross']),
    ]),
  }
}
