export const ARENAS = {
  circle: {
    id: 'circle',
    label: 'Circle',
    className: 'Integrable',
    radius: 0.84,

    source: {
      x: -0.48,
      y: 0.34,
    },

    targets: [
      { x: 0.46, y: -0.28 },
      { x: 0.08, y: 0.61 },
      { x: -0.09, y: -0.54 },
      { x: 0.61, y: 0.27 },
    ],
  },
}

export function getArena(id) {
  const arena = ARENAS[id]

  if (!arena) {
    throw new Error(`Unknown arena: ${id}`)
  }

  return arena
}

export function boundaryPoints(arena, segments = 96) {
  if (arena.id === 'circle') {
    return Array.from({ length: segments }, (_, i) => {
      const angle = (i / segments) * Math.PI * 2

      return {
        x: Math.cos(angle) * arena.radius,
        y: Math.sin(angle) * arena.radius,
      }
    })
  }

  throw new Error(`Boundary generation not implemented for ${arena.id}`)
}
