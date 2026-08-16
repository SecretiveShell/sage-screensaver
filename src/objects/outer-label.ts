import * as THREE from 'three'

const GLYPH_UPDATE_INTERVAL = 0.14
const MAX_RANDOM_GLYPH_CHANGES = 32
const MAX_PHASE_TRANSITIONS = 10
const MIN_PHASE_TRANSITIONS = 5

interface MessageState {
  locked: boolean[]
  phase: 'in' | 'out' | 'steady'
  retired: boolean[]
  retiring: boolean[]
  target: string[]
  transitionsRemaining: number
}

export class OuterLabel {
  public readonly mesh: THREE.Sprite

  private readonly context: CanvasRenderingContext2D
  private readonly glyphs = [...randomGlyphs(116)]
  private readonly texture: THREE.CanvasTexture
  private glyphElapsed = 0
  private messageState?: MessageState

  constructor(radius = 2.5) {
    const labelTexture = createLabelTexture(this.glyphs)
    this.context = labelTexture.context
    this.texture = labelTexture.texture
    this.mesh = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.texture,
        color: 0xc6ddeb,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    )
    this.mesh.scale.setScalar(radius * 2)
  }

  update(delta: number) {
    this.mesh.material.rotation -= delta * 0.05

    this.glyphElapsed += delta

    if (this.glyphElapsed >= GLYPH_UPDATE_INTERVAL) {
      this.updateGlyphs()

      redrawLabel(this.context, this.glyphs)
      this.texture.needsUpdate = true
      this.glyphElapsed = 0
    }
  }

  showMessage(message: string) {
    const target = createMessageGlyphs(message, this.glyphs.length)
    const previousTarget = this.messageState?.target
    this.messageState = {
      locked: Array<boolean>(this.glyphs.length).fill(false),
      phase: 'in',
      retired: Array<boolean>(this.glyphs.length).fill(false),
      retiring: target.map((character, index) => Boolean(previousTarget?.[index]) && !character),
      target,
      transitionsRemaining: randomTransitionCount(),
    }
  }

  clearMessage() {
    if (!this.messageState) {
      return
    }

    this.messageState.retiring = this.messageState.target.map(Boolean)
    this.messageState.retired = Array<boolean>(this.glyphs.length).fill(false)
    this.messageState.phase = 'out'
    this.messageState.transitionsRemaining = randomTransitionCount()
  }

  private updateGlyphs() {
    if (this.messageState) {
      const state = this.messageState
      this.advanceMessagePhase(state)

      if (state.phase === 'out' && !this.messageState) {
        this.glyphs.splice(0, this.glyphs.length, ...randomGlyphs(this.glyphs.length))
        return
      }

      for (const [index, target] of state.target.entries()) {
        this.glyphs[index] = state.phase === 'out'
          ? (state.retiring[index] && !state.retired[index] ? target : randomGlyph())
          : target
          ? (state.locked[index] ? target : randomGlyph())
          : (state.retiring[index] && !state.retired[index] ? randomGlyph() : ' ')
      }

      return
    }

    const changes = 1 + Math.floor(Math.random() * MAX_RANDOM_GLYPH_CHANGES)
    for (let index = 0; index < changes; index += 1) {
      this.glyphs[Math.floor(Math.random() * this.glyphs.length)] = randomGlyph()
    }
  }

  private advanceMessagePhase(state: MessageState) {
    if (state.phase === 'steady') {
      return
    }

    const candidates = state.target.flatMap((target, index) => {
      if (state.phase === 'out') {
        return state.retiring[index] && !state.retired[index] ? [{ index, type: 'retire' }] : []
      }

      if (target && !state.locked[index]) {
        return [{ index, type: 'lock' }]
      }

      return state.retiring[index] && !state.retired[index] ? [{ index, type: 'retire' }] : []
    })
    const changes = Math.max(1, Math.ceil(candidates.length / state.transitionsRemaining))

    for (let index = 0; index < changes && candidates.length > 0; index += 1) {
      const candidateIndex = Math.floor(Math.random() * candidates.length)
      const candidate = candidates.splice(candidateIndex, 1)[0]
      if (candidate.type === 'lock') {
        state.locked[candidate.index] = true
      } else {
        state.retired[candidate.index] = true
      }
    }

    state.transitionsRemaining -= 1
    if (state.transitionsRemaining <= 0 || candidates.length === 0) {
      if (state.phase === 'out') {
        this.messageState = undefined
      } else {
        state.phase = 'steady'
      }
    }
  }
}

function createLabelTexture(glyphs: string[]) {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  redrawLabel(context, glyphs)

  return { context, texture }
}

function redrawLabel(context: CanvasRenderingContext2D, glyphs: string[]) {
  const size = context.canvas.width
  const center = size / 2

  context.clearRect(0, 0, size, size)
  context.strokeStyle = 'rgba(220, 240, 255, 0.32)'
  context.lineWidth = 1.5
  context.beginPath()
  context.arc(center, center, 494, 0, Math.PI * 2)
  context.stroke()
  context.beginPath()
  context.arc(center, center, 420, 0, Math.PI * 2)
  context.stroke()

  context.strokeStyle = 'rgba(220, 240, 255, 0.08)'
  context.lineWidth = 46
  context.beginPath()
  context.arc(center, center, 458, 0, Math.PI * 2)
  context.stroke()

  context.fillStyle = 'rgba(232, 246, 255, 0.95)'
  context.font = '600 26px ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  drawCalibrationMarks(context, center)
  drawGlyphRing(context, center, glyphs, 458, 1)
}

function drawCalibrationMarks(context: CanvasRenderingContext2D, center: number) {
  context.strokeStyle = 'rgba(220, 240, 255, 0.62)'
  context.lineWidth = 2

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)

    context.beginPath()
    context.moveTo(center + cosine * 422, center + sine * 422)
    context.lineTo(center + cosine * 434, center + sine * 434)
    context.moveTo(center + cosine * 482, center + sine * 482)
    context.lineTo(center + cosine * 496, center + sine * 496)
    context.stroke()
  }
}

function drawGlyphRing(
  context: CanvasRenderingContext2D,
  center: number,
  glyphs: string[],
  radius: number,
  direction: number,
) {
  for (const [index, glyph] of [...glyphs].entries()) {
    const angle = direction * (index / glyphs.length) * Math.PI * 2 - Math.PI / 2

    context.save()
    context.translate(center, center)
    context.rotate(angle + Math.PI / 2)
    context.fillText(glyph, 0, -radius)
    context.restore()
  }
}

function randomGlyphs(length: number) {
  return Array.from({ length }, randomGlyph).join('')
}

function randomGlyph() {
  const glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789'

  return glyphs[Math.floor(Math.random() * glyphs.length)]
}

function createMessageGlyphs(message: string, length: number) {
  const glyphs = Array<string>(length).fill('')
  const characters = [...message.toUpperCase()]
  const start = -Math.floor(characters.length / 2)

  for (const [index, character] of characters.entries()) {
    glyphs[(start + index + length) % length] = character
  }

  return glyphs
}

function randomTransitionCount() {
  return MIN_PHASE_TRANSITIONS + Math.floor(
    Math.random() * (MAX_PHASE_TRANSITIONS - MIN_PHASE_TRANSITIONS + 1),
  )
}
