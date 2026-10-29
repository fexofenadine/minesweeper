//pausing stops the clock and hides the board, only while running(game) holds
//onPause adds the game's own changes, like dropping a half done click
export const pauseAction =
  (running, onPause = () => ({})) =>
  (paused) =>
  ({ game }, actions) => {
    const next = paused === undefined ? !game.paused : paused
    if (!running(game) || next === game.paused) return null
    if (!next) {
      game.raf = requestAnimationFrame(actions.tick)
      return {
        game: { ...game, paused: false, start: game.start + performance.now() - game.pausedAt },
      }
    }
    cancelAnimationFrame(game.raf)
    return {
      menu: null,
      game: { ...game, ...onPause(game, actions), paused: true, pausedAt: performance.now() },
    }
  }
