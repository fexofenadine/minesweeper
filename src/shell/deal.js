//big hard boards take a while, so they are dealt off the main thread
//without workers (tests, old browsers) or if the worker fails, the deal runs here instead
//start makes the game's worker, here deals one ask on the page

export const dealer = (start, here) => {
  let worker = null
  const waiting = new Map()
  let count = 0

  //a worker that can't load or crashes hands its deals back to the page
  const giveUp = () => {
    worker = false
    waiting.forEach(({ ask, resolve }) => resolve(here(ask)))
    waiting.clear()
  }

  const open = () => {
    if (worker !== null) return worker
    try {
      worker = start()
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

  return (ask) => {
    if (typeof Worker === 'undefined' || !open()) return Promise.resolve(here(ask))
    const id = ++count
    return new Promise((resolve) => {
      waiting.set(id, { ask, resolve })
      worker.postMessage({ id, ...ask })
    })
  }
}
