export type GameState = {
  score: number
  shots: number
  hits: number
}

export function createGameState(): GameState {
  return {
    score: 0,
    shots: 0,
    hits: 0,
  }
}
