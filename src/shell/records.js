import { load, remove, save } from './storage'

//best times by size and level for a game saved under its own prefix, kept apart for games with
//and without hints, with the winner and best times dialog actions that go with them
export const records = (prefix, sizes, levelNames) => {
  const timeKey = (n, level, hinted) => `${prefix}.${n}.${level}${hinted ? '.hints' : ''}`

  const eachSlot = (fn) =>
    sizes.flatMap((n) => levelNames.map((_, level) => fn(n, level, `${n}.${level}`)))

  const bestTimes = (hinted) =>
    Object.fromEntries(
      eachSlot((n, level, slot) => {
        const key = timeKey(n, level, hinted)
        const time = parseInt(load(key), 10) || 999
        return [slot, { time, name: load(`${key}.name`) || 'Anonymous' }]
      }),
    )

  const clearBestTimes = (hinted) => {
    eachSlot((n, level) => {
      const key = timeKey(n, level, hinted)
      remove(key)
      remove(`${key}.name`)
    })
    return bestTimes(hinted)
  }

  const actions = {
    win:
      ({ n, level, hinted, time }) =>
      () => {
        const key = timeKey(n, level, hinted)
        const best = parseInt(load(key), 10)
        if (best && best <= time) return null
        return {
          winner: {
            key,
            time,
            hinted,
            level: `${levelNames[level].toLowerCase()} ${n} × ${n}`,
            name: load(`${prefix}.name`) || '',
          },
        }
      },
    changeWinner:
      (payload) =>
      ({ winner }) => ({
        winner: { ...winner, ...payload },
      }),
    submitBestTime:
      (event) =>
      ({ winner }, actions) => {
        event.preventDefault()
        const name = winner.name.trim()
        save(winner.key, winner.time)
        save(`${winner.key}.name`, name)
        save(`${prefix}.name`, name)
        actions.toggleBestTime()
        actions.setBestTimeTab(winner.hinted ? 'hinted' : 'clean')
        return { winner: null }
      },
    toggleBestTime:
      () =>
      ({ bestTime }) => ({
        menu: null,
        bestTime: bestTime
          ? null
          : { tab: 'clean', clean: bestTimes(false), hinted: bestTimes(true) },
      }),
    setBestTimeTab: (tab) => (state) =>
      state.bestTime ? { bestTime: { ...state.bestTime, tab } } : null,
    resetBestTime:
      () =>
      ({ bestTime }) => ({
        bestTime: { ...bestTime, [bestTime.tab]: clearBestTimes(bestTime.tab === 'hinted') },
      }),
  }

  return { timeKey, eachSlot, actions }
}
