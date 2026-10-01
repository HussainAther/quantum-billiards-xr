type HudState = {
  score: number
  shots: number
  hits: number
}

export type QuantumHudState = {
  energy: number
  coherence: number
  epsilon: number
  focus: string
  measurement?: number
}

export type QuantumBilliardsHud = {
  update: (state: HudState) => void

  updateQuantum: (
    state: QuantumHudState
  ) => void

  flashHit: () => void
}

const HUD_ID =
  'quantum-billiards-hud'


export function createQuantumBilliardsHud():
QuantumBilliardsHud {
  //
  // Build-time / Node test guard.
  //
  if (
    typeof document ===
    'undefined'
  ) {
    return {
      update() {},
      updateQuantum() {},
      flashHit() {},
    }
  }


  //
  // Reuse during HMR.
  //
  let root =
    document.getElementById(
      HUD_ID
    )


  if (!root) {
    root =
      document.createElement(
        'div'
      )

    root.id =
      HUD_ID


    Object.assign(
      root.style,
      {
        position:
          'fixed',

        top:
          'max(14px, env(safe-area-inset-top))',

        left:
          'max(14px, env(safe-area-inset-left))',

        zIndex:
          '99999',

        display:
          'flex',

        flexDirection:
          'column',

        gap:
          '8px',

        padding:
          '10px 12px',

        border:
          '1px solid rgba(0, 229, 255, 0.35)',

        borderRadius:
          '12px',

        background:
          'rgba(5, 12, 20, 0.72)',

        boxShadow:
          '0 4px 24px rgba(0, 0, 0, 0.28)',

        backdropFilter:
          'blur(8px)',

        WebkitBackdropFilter:
          'blur(8px)',

        color:
          '#ffffff',

        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',

        fontSize:
          '12px',

        lineHeight:
          '1.1',

        pointerEvents:
          'none',

        userSelect:
          'none',

        transformOrigin:
          'top left',

        transition:
          'transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
      }
    )


    root.innerHTML = `
      <div class="qb-title">
        QUANTUM BILLIARDS
      </div>

      <div class="qb-row qb-score-row">
        <div class="qb-stat">
          <div class="qb-label">SCORE</div>
          <div class="qb-value" data-qb="score">0</div>
        </div>

        <div class="qb-stat">
          <div class="qb-label">SHOTS</div>
          <div class="qb-value" data-qb="shots">0</div>
        </div>

        <div class="qb-stat">
          <div class="qb-label">HITS</div>
          <div class="qb-value" data-qb="hits">0</div>
        </div>

        <div class="qb-stat">
          <div class="qb-label">HIT %</div>
          <div class="qb-value" data-qb="rate">—</div>
        </div>
      </div>

      <div class="qb-divider"></div>

      <div class="qb-row qb-quantum-row">
        <div class="qb-stat">
          <div class="qb-label">ENERGY</div>
          <div class="qb-value qb-quantum-value" data-qb="energy">—</div>
        </div>

        <div class="qb-stat">
          <div class="qb-label">COHERENCE</div>
          <div class="qb-value qb-quantum-value" data-qb="coherence">—</div>
        </div>

        <div class="qb-stat">
          <div class="qb-label">ε</div>
          <div class="qb-value qb-quantum-value" data-qb="epsilon">—</div>
        </div>
      </div>

      <div class="qb-focus">
        <span class="qb-label">
          FOCUS
        </span>

        <span
          class="qb-focus-value"
          data-qb="focus"
        >
          —
        </span>
      </div>

      <div class="qb-focus">
        <span class="qb-label">
          MEASUREMENT
        </span>

        <span
          class="qb-focus-value"
          data-qb="measurement"
        >
          —
        </span>
      </div>
    `


    const style =
      document.createElement(
        'style'
      )


    style.textContent = `
      #${HUD_ID} .qb-title {
        color: rgba(255, 255, 255, 0.72);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.14em;
      }

      #${HUD_ID} .qb-row {
        display: grid;
        gap: 10px;
      }

      #${HUD_ID} .qb-score-row {
        grid-template-columns: repeat(4, auto);
      }

      #${HUD_ID} .qb-quantum-row {
        grid-template-columns: repeat(3, auto);
      }

      #${HUD_ID} .qb-stat {
        min-width: 44px;
      }

      #${HUD_ID} .qb-label {
        margin-bottom: 3px;
        color: rgba(255, 255, 255, 0.55);
        font-size: 8px;
        font-weight: 700;
        letter-spacing: 0.09em;
      }

      #${HUD_ID} .qb-value {
        color: #00e5ff;
        font-size: 16px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      #${HUD_ID} .qb-quantum-value {
        font-size: 14px;
      }

      #${HUD_ID} .qb-divider {
        height: 1px;
        background: rgba(0, 229, 255, 0.18);
      }

      #${HUD_ID} .qb-focus {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #${HUD_ID} .qb-focus .qb-label {
        margin: 0;
      }

      #${HUD_ID} .qb-focus-value {
        color: #00e5ff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
    `


    document.head.appendChild(
      style
    )

    document.body.appendChild(
      root
    )
  }


  const write = (
    key: string,
    value: string
  ) => {
    const element =
      root!.querySelector(
        `[data-qb="${key}"]`
      )

    if (element) {
      element.textContent =
        value
    }
  }


  const update = (
    state: HudState
  ) => {
    write(
      'score',
      String(
        state.score
      )
    )

    write(
      'shots',
      String(
        state.shots
      )
    )

    write(
      'hits',
      String(
        state.hits
      )
    )


    const hitRate =
      state.shots > 0
        ? Math.round(
            (
              state.hits /
              state.shots
            ) *
              100
          )
        : undefined


    write(
      'rate',

      hitRate ===
        undefined
        ? '—'
        : `${hitRate}%`
    )
  }


  const updateQuantum = (
    state: QuantumHudState
  ) => {
    write(
      'energy',
      String(
        state.energy
      )
    )


    write(
      'coherence',
      `${
        Math.round(
          state.coherence *
            100
        )
      }%`
    )


    write(
      'epsilon',
      state.epsilon
        .toFixed(3)
    )


    write(
      'focus',
      state.focus
    )
    
    write(
      'measurement',
      state.measurement === undefined
        ? '—'
        : `${Math.round(state.measurement * 100)}%`
    )

  }


  const flashHit = () => {
    root!.style.transform =
      'scale(1.06)'

    root!.style.borderColor =
      'rgba(0, 229, 255, 0.95)'

    root!.style.boxShadow =
      '0 4px 30px rgba(0, 229, 255, 0.32)'


    window.setTimeout(
      () => {
        if (!root) {
          return
        }

        root.style.transform =
          'scale(1)'

        root.style.borderColor =
          'rgba(0, 229, 255, 0.35)'

        root.style.boxShadow =
          '0 4px 24px rgba(0, 0, 0, 0.28)'
      },

      180
    )
  }


  return {
    update,
    updateQuantum,
    flashHit,
  }
}
