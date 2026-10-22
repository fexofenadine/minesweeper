const neighbourCache = new Map()

//index lists of the up to 8 cells around each cell, built once per board size
export const neighboursOf = (width, height) => {
  const key = `${width}x${height}`
  if (!neighbourCache.has(key)) {
    const list = []
    for (let i = 0; i < width * height; i++) {
      const x = i % width
      const y = (i - x) / width
      const around = []
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if ((dx || dy) && nx >= 0 && ny >= 0 && nx < width && ny < height) {
            around.push(ny * width + nx)
          }
        }
      }
      list.push(around)
    }
    neighbourCache.set(key, list)
  }
  return neighbourCache.get(key)
}

//picks mine cells at random, never inside the kept clear cells
const scatter = (size, mines, clear) => {
  const free = []
  for (let i = 0; i < size; i++) if (!clear.has(i)) free.push(i)
  const mined = new Uint8Array(size)
  for (let n = 0; n < mines; n++) {
    const j = n + Math.floor(Math.random() * (free.length - n))
    const pick = free[j]
    free[j] = free[n]
    free[n] = pick
    mined[pick] = 1
  }
  return mined
}

const UNKNOWN = 0
const OPEN = 1
const FLAG = 2

//true if the board can be cleared from start using only certain deductions
export const solvable = (mined, width, height, start) => {
  const size = width * height
  const around = neighboursOf(width, height)
  const nums = new Uint8Array(size)
  let mines = 0
  for (let i = 0; i < size; i++) {
    if (mined[i]) mines++
    for (const n of around[i]) nums[i] += mined[n]
  }
  if (mined[start]) return false

  const state = new Uint8Array(size)
  let opened = 0
  let flagged = 0
  const open = (first) => {
    const stack = [first]
    while (stack.length) {
      const i = stack.pop()
      if (state[i] !== UNKNOWN) continue
      state[i] = OPEN
      opened++
      if (nums[i] === 0) for (const n of around[i]) if (state[n] === UNKNOWN) stack.push(n)
    }
  }
  const flag = (i) => {
    if (state[i] !== UNKNOWN) return
    state[i] = FLAG
    flagged++
  }
  //unknown neighbours of an open number and how many mines among them
  const frontier = (i) => {
    const unknown = []
    let need = nums[i]
    for (const n of around[i]) {
      if (state[n] === UNKNOWN) unknown.push(n)
      else if (state[n] === FLAG) need--
    }
    return { unknown, need }
  }

  open(start)
  while (opened < size - mines) {
    let progress = false

    //a number whose mines are all flagged, or whose unknowns must all be mines
    for (let i = 0; i < size; i++) {
      if (state[i] !== OPEN || !nums[i]) continue
      const { unknown, need } = frontier(i)
      if (!unknown.length) continue
      if (need === 0) unknown.forEach(open)
      else if (need === unknown.length) unknown.forEach(flag)
      else continue
      progress = true
    }

    //two numbers where one's unknowns sit inside the other's
    if (!progress) {
      for (let a = 0; a < size && !progress; a++) {
        if (state[a] !== OPEN || !nums[a]) continue
        const A = frontier(a)
        if (!A.unknown.length) continue
        const inA = new Set(A.unknown)
        const nearby = new Set(A.unknown.flatMap((u) => around[u]))
        for (const b of nearby) {
          if (b === a || state[b] !== OPEN || !nums[b]) continue
          const B = frontier(b)
          if (B.unknown.length <= A.unknown.length) continue
          if (!A.unknown.every((u) => B.unknown.includes(u))) continue
          const rest = B.unknown.filter((u) => !inA.has(u))
          const extra = B.need - A.need
          if (extra === 0) rest.forEach(open)
          else if (extra === rest.length) rest.forEach(flag)
          else continue
          progress = true
          break
        }
      }
    }

    //every remaining unknown is safe, or every one is a mine
    if (!progress) {
      const left = mines - flagged
      const unknown = []
      for (let i = 0; i < size; i++) if (state[i] === UNKNOWN) unknown.push(i)
      if (left === 0) unknown.forEach(open)
      else if (left === unknown.length) unknown.forEach(flag)
      else return false
    }
  }
  return true
}

//mine layout for a board whose first click is at x, y
//safe keeps that cell clear, noGuess also clears around it and retries until solvable
export const placeMines = ({ width, height, mines, x, y, safe, noGuess, budget = 1500 }) => {
  const size = width * height
  const start = y * width + x
  const around = neighboursOf(width, height)
  let clear = new Set()
  if (noGuess) clear = new Set([start, ...around[start]])
  else if (safe) clear = new Set([start])
  //very dense custom boards may not leave room for the whole clear area
  if (size - clear.size < mines) clear = new Set(safe || noGuess ? [start] : [])

  if (!noGuess) return { mined: scatter(size, mines, clear), solvable: false }
  const deadline = Date.now() + budget
  let mined
  do {
    mined = scatter(size, mines, clear)
    if (solvable(mined, width, height, start)) return { mined, solvable: true }
  } while (Date.now() < deadline)
  return { mined, solvable: false }
}
