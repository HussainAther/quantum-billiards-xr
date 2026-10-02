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

export type IntroHudState = {
  title: string
  lesson?: string
  objective: string
  hint?: string
  energy: number
  par: number
  time: number
}

export type ChallengeHudState = {
  name: string
  targetText: string
  par: number
  timeRemaining: number
  cleared?: boolean
  grade?: string
  bonus?: number
}

export type QuantumBilliardsHud = {
  update: (state: HudState) => void

  updateQuantum: (
    state: QuantumHudState
  ) => void

  updateChallenge: (
    state: ChallengeHudState
  ) => void

  showIntro: (
    state: IntroHudState
  ) => boolean

  hideIntro: () => void

  onStart: (
    callback: () => void
  ) => void

  flashHit: () => void
}

const HUD_ID =
  'quantum-billiards-hud'

const INTRO_ID =
  'quantum-billiards-intro'


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
      updateChallenge() {},
      showIntro() { return false },
      hideIntro() {},
      onStart() {},
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

      <div class="qb-divider"></div>

      <div class="qb-challenge">
        <div
          class="qb-challenge-name"
          data-qb="challenge-name"
        >
          —
        </div>

        <div class="qb-row qb-challenge-row">
          <div class="qb-stat">
            <div class="qb-label">TARGET</div>
            <div
              class="qb-small-value"
              data-qb="challenge-target"
            >
              —
            </div>
          </div>

          <div class="qb-stat">
            <div class="qb-label">PAR</div>
            <div
              class="qb-small-value"
              data-qb="challenge-par"
            >
              —
            </div>
          </div>

          <div class="qb-stat">
            <div class="qb-label">TIME</div>
            <div
              class="qb-small-value"
              data-qb="challenge-time"
            >
              —
            </div>
          </div>
        </div>

        <div
          class="qb-clear"
          data-qb="challenge-clear"
        ></div>
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

      #${HUD_ID} .qb-challenge {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      #${HUD_ID} .qb-challenge-name {
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      #${HUD_ID} .qb-challenge-row {
        grid-template-columns: repeat(3, auto);
      }

      #${HUD_ID} .qb-small-value {
        color: #00e5ff;
        font-size: 13px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

      #${HUD_ID} .qb-clear {
        min-height: 12px;
        color: #00e5ff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
      }
    `


    document.head.appendChild(
      style
    )

    document.body.appendChild(
      root
    )
  }


  //
  // Full-screen onboarding overlay. It is separate from the HUD so
  // it can accept pointer input while the HUD remains click-through.
  //
  let intro =
    document.getElementById(
      INTRO_ID
    ) as HTMLDivElement | null

  if (!intro) {
    intro =
      document.createElement(
        'div'
      )

    intro.id =
      INTRO_ID

    Object.assign(
      intro.style,
      {
        position: 'fixed',
        inset: '0',
        zIndex: '100000',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
        background: 'radial-gradient(circle at 50% 35%, rgba(0, 229, 255, 0.10), rgba(3, 8, 14, 0.94) 55%, rgba(3, 8, 14, 0.985) 100%)',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }
    )

    intro.innerHTML = `
      <div class="qb-intro-card">
        <div class="qb-intro-kicker">QUANTUM BILLIARDS</div>
        <div class="qb-intro-title" data-qb-intro="title">FIRST OBSERVATION</div>
        <div class="qb-intro-lesson" data-qb-intro="lesson"></div>

        <div class="qb-intro-rule"></div>

        <div class="qb-intro-copy">
          <div class="qb-intro-step">
            <span class="qb-intro-number">1</span>
            <div><strong>Aim.</strong> Drag to shape the cyan predicted trajectory.</div>
          </div>

          <div class="qb-intro-step">
            <span class="qb-intro-number">2</span>
            <div><strong>Read Measurement.</strong> Guide the trajectory near the receiver until the measurement is strong enough.</div>
          </div>

          <div class="qb-intro-step">
            <span class="qb-intro-number">3</span>
            <div><strong>Release.</strong> The shot resolves by quantum measurement, not by physically sinking the ball.</div>
          </div>
        </div>

        <div class="qb-intro-objective">
          <div class="qb-intro-label">OBJECTIVE</div>
          <div data-qb-intro="objective"></div>
        </div>

        <div class="qb-intro-hint" data-qb-intro="hint"></div>

        <div class="qb-intro-stats">
          <div><span>ENERGY</span><strong data-qb-intro="energy">—</strong></div>
          <div><span>PAR</span><strong data-qb-intro="par">—</strong></div>
          <div><span>TIME</span><strong data-qb-intro="time">—</strong></div>
        </div>

        <button class="qb-intro-start" type="button">START CHALLENGE</button>
      </div>
    `

    const introStyle =
      document.createElement(
        'style'
      )

    introStyle.textContent = `
      #${INTRO_ID} .qb-intro-card {
        width: min(520px, 100%);
        max-height: 100%;
        overflow: auto;
        box-sizing: border-box;
        padding: 24px;
        border: 1px solid rgba(0, 229, 255, 0.38);
        border-radius: 18px;
        background: rgba(5, 12, 20, 0.90);
        box-shadow: 0 18px 70px rgba(0, 0, 0, 0.48);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      #${INTRO_ID} .qb-intro-kicker {
        color: #00e5ff;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.18em;
      }

      #${INTRO_ID} .qb-intro-title {
        margin-top: 7px;
        color: #ffffff;
        font-size: clamp(24px, 7vw, 38px);
        line-height: 1;
        font-weight: 900;
        letter-spacing: -0.03em;
      }

      #${INTRO_ID} .qb-intro-lesson {
        margin-top: 8px;
        color: rgba(255, 255, 255, 0.58);
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.12em;
      }

      #${INTRO_ID} .qb-intro-rule {
        height: 1px;
        margin: 18px 0;
        background: rgba(0, 229, 255, 0.18);
      }

      #${INTRO_ID} .qb-intro-copy {
        display: grid;
        gap: 12px;
      }

      #${INTRO_ID} .qb-intro-step {
        display: grid;
        grid-template-columns: 28px 1fr;
        gap: 10px;
        align-items: start;
        color: rgba(255, 255, 255, 0.82);
        font-size: 14px;
        line-height: 1.4;
      }

      #${INTRO_ID} .qb-intro-step strong {
        color: #ffffff;
      }

      #${INTRO_ID} .qb-intro-number {
        display: grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border: 1px solid rgba(0, 229, 255, 0.45);
        border-radius: 999px;
        color: #00e5ff;
        font-size: 11px;
        font-weight: 900;
      }

      #${INTRO_ID} .qb-intro-objective {
        margin-top: 18px;
        padding: 12px 14px;
        border-left: 2px solid #00e5ff;
        background: rgba(0, 229, 255, 0.06);
        color: rgba(255, 255, 255, 0.86);
        font-size: 13px;
        line-height: 1.4;
      }

      #${INTRO_ID} .qb-intro-label {
        margin-bottom: 4px;
        color: #00e5ff;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 0.13em;
      }

      #${INTRO_ID} .qb-intro-hint {
        margin-top: 10px;
        color: rgba(255, 255, 255, 0.52);
        font-size: 11px;
        line-height: 1.4;
      }

      #${INTRO_ID} .qb-intro-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-top: 18px;
      }

      #${INTRO_ID} .qb-intro-stats > div {
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
      }

      #${INTRO_ID} .qb-intro-stats span {
        display: block;
        color: rgba(255, 255, 255, 0.45);
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.10em;
      }

      #${INTRO_ID} .qb-intro-stats strong {
        display: block;
        margin-top: 4px;
        color: #00e5ff;
        font-size: 18px;
      }

      #${INTRO_ID} .qb-intro-start {
        width: 100%;
        margin-top: 18px;
        padding: 14px 16px;
        border: 1px solid rgba(0, 229, 255, 0.65);
        border-radius: 12px;
        background: #00e5ff;
        color: #041016;
        font: inherit;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 0.08em;
        cursor: pointer;
        touch-action: manipulation;
      }

      #${INTRO_ID} .qb-intro-start:active {
        transform: scale(0.985);
      }
    `

    document.head.appendChild(
      introStyle
    )

    document.body.appendChild(
      intro
    )
  }

  let startCallback:
    (() => void) | undefined

  const introWrite = (
    key: string,
    value: string
  ) => {
    const element =
      intro!.querySelector(
        `[data-qb-intro="${key}"]`
      )

    if (element) {
      element.textContent =
        value
    }
  }

  const hideIntro = () => {
    intro!.style.display =
      'none'
  }

  const onStart = (
    callback: () => void
  ) => {
    startCallback =
      callback
  }

  const startButton =
    intro.querySelector(
      '.qb-intro-start'
    ) as HTMLButtonElement | null

  if (startButton) {
    startButton.onclick = () => {
      hideIntro()
      startCallback?.()
    }
  }

  const showIntro = (
    state: IntroHudState
  ) => {
    introWrite(
      'title',
      state.title.toUpperCase()
    )

    introWrite(
      'lesson',
      state.lesson ?? ''
    )

    introWrite(
      'objective',
      state.objective
    )

    introWrite(
      'hint',
      state.hint ?? ''
    )

    introWrite(
      'energy',
      String(state.energy)
    )

    introWrite(
      'par',
      String(state.par)
    )

    introWrite(
      'time',
      `${Math.ceil(state.time)}s`
    )

    intro!.style.display =
      'flex'

    return true
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


  const updateChallenge = (
    state: ChallengeHudState
  ) => {
    write(
      'challenge-name',
      state.name.toUpperCase()
    )

    write(
      'challenge-target',
      state.targetText
    )

    write(
      'challenge-par',
      String(state.par)
    )

    write(
      'challenge-time',
      `${Math.max(
        0,
        Math.ceil(
          state.timeRemaining
        )
      )}s`
    )

    if (
      state.cleared
    ) {
      const grade =
        state.grade
          ? ` · ${state.grade}`
          : ''

      const bonus =
        state.bonus !== undefined
          ? ` · +${state.bonus}`
          : ''

      write(
        'challenge-clear',
        `CHALLENGE CLEAR${grade}${bonus}`
      )
    } else {
      write(
        'challenge-clear',
        ''
      )
    }
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
    updateChallenge,
    showIntro,
    hideIntro,
    onStart,
    flashHit,
  }
}
