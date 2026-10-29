import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('deals on the page when the worker fails', async () => {
  //a worker that never answers and then reports an error
  let failing
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        failing = this
      }
      postMessage() {
        setTimeout(() => this.onerror(new Event('error')), 0)
      }
    },
  )
  const { deal } = await import('./deal')
  const dealt = await deal(6, 1, 1)
  expect(failing).toBeTruthy()
  expect(dealt.givens).toHaveLength(36)
  expect(dealt.level).toBe(1)
  //later deals skip the worker
  expect((await deal(6, 0, 2)).level).toBe(0)
})
