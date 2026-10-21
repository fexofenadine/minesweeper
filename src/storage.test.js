import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

it('starts with default settings when the browser blocks site storage', async () => {
  const blocked = () => {
    throw new DOMException('blocked', 'SecurityError')
  }
  vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked, removeItem: blocked })
  vi.resetModules()
  const { state } = await import('./app')
  expect(state.theme).toBe('classic')
  expect(state.game.level).toBe('beginner')
  expect(state.safeStart).toBe(true)
})
