import { EMPTY, breaks, solved } from './rules'
import { nextSteps } from './techniques'

//asked when every cell is filled but the board is not solved
export const completeWithErrors =
  'The board is complete but there are errors. Do you want to use a hint?'

const marked = (entries) => Object.fromEntries(entries)

//the next thing to do: a broken rule first, then a cell that can't be right, then the easiest step
//returns { kind, text, marks, place? }, marks maps a cell to source, zero, one or wrong
export const findHint = ({ board, solution, n }) => {
  if (solved(board, n)) return { kind: 'solved', text: 'The puzzle is solved.', marks: {} }
  const broken = breaks(board, n)
  if (broken.length) {
    //a broken rule's cells are not all wrong, so the solution picks out the ones to change
    const { cells, text } = broken[0]
    const bad = cells.filter((i) => board[i] !== solution[i])
    const fix = bad.length ? bad : cells
    return {
      kind: 'break',
      text: `${text} ${fix.length > 1 ? 'The cells outlined in red are the ones' : 'The cell outlined in red is the one'} to change.`,
      marks: marked(cells.map((i) => [i, fix.includes(i) ? 'wrong' : 'source'])),
    }
  }
  //a cell can break no rule yet and still not fit the only solution
  const wrong = [...board.keys()].find((i) => board[i] !== EMPTY && board[i] !== solution[i])
  if (wrong !== undefined) {
    return {
      kind: 'wrong',
      text: `This ${board[wrong]} doesn't fit the puzzle's only solution. Clear it and the reasoning can carry on.`,
      marks: { [wrong]: 'wrong' },
    }
  }
  const { steps } = nextSteps(board, n)
  if (!steps.length) {
    //generated boards never get here, but a hint should never come back empty
    const i = board.indexOf(EMPTY)
    return {
      kind: 'reveal',
      text: 'No rule gives the next cell away, so this one comes from the solution.',
      place: [[i, solution[i]]],
      marks: { [i]: solution[i] ? 'one' : 'zero' },
    }
  }
  const { technique, text, place, sources } = steps[0]
  return {
    kind: technique,
    text,
    place,
    marks: marked([
      ...sources.map((i) => [i, 'source']),
      ...place.map(([i, v]) => [i, v ? 'one' : 'zero']),
    ]),
  }
}
