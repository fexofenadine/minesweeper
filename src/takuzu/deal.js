import { makeGame, random } from './generate'

//big hard boards take up to a second, so they are dealt off the main thread
//without workers (tests, old browsers) or if the worker fails, the deal runs here instead

let worker = null
const waiting = new Map()
let count = 0

const here = ({ n, level, seed }) => makeGame(n, level, random(seed))

//a worker that can't load or crashes hands its deals back to the page
const giveUp = () => {
  worker = false
  waiting.forEach(({ ask, resolve }) => resolve(here(ask)))
  waiting.clear()
}

const start = () => {
  if (worker !== null) return worker
  try {
    worker = new Worker(new URL('./deal.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      waiting.get(data.id)?.resolve(data)
      waiting.delete(data.id)
    }
    worker.onerror = giveUp
  } catch {
    worker = false
  }
  return worker
}

export const deal = (n, level, seed) => {
  const ask = { n, level, seed }
  if (typeof Worker === 'undefined' || !start()) return Promise.resolve(here(ask))
  const id = ++count
  return new Promise((resolve) => {
    waiting.set(id, { ask, resolve })
    worker.postMessage({ id, ...ask })
  })
}
