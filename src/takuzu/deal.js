import { makeGame, random } from './generate'

//big hard boards take up to a second, so they are dealt off the main thread
//without workers (tests, old browsers) the deal runs here instead

let worker = null
const waiting = new Map()
let count = 0

const start = () => {
  if (worker !== null) return worker
  try {
    worker = new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      waiting.get(data.id)?.(data)
      waiting.delete(data.id)
    }
  } catch {
    worker = false
  }
  return worker
}

export const deal = (n, level, seed) => {
  if (typeof Worker === 'undefined' || !start()) {
    return Promise.resolve(makeGame(n, level, random(seed)))
  }
  const id = ++count
  return new Promise((resolve) => {
    waiting.set(id, resolve)
    worker.postMessage({ id, n, level, seed })
  })
}
