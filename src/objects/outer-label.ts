import * as THREE from 'three'

const CLEAR_STEP_DURATION = 0.04
const GLITCH_CYCLES = 3
const GLYPH_UPDATE_INTERVAL = 0.12
const MAX_RANDOM_GLYPH_CHANGES = 32
const WAVE_STEP_DURATION = 0.075

interface MessageTransition {
  glyphs?: string[]
  loops: number
  phase: 'clearing' | 'revealing' | 'looping'
  progress: number
  stepElapsed: number
}

export class OuterLabel {
  public readonly mesh: THREE.Sprite

  private readonly context: CanvasRenderingContext2D
  private readonly glyphs = [...randomGlyphs(116)]
  private readonly ringOrder = createRingOrder(this.glyphs.length)
  private readonly texture: THREE.CanvasTexture
  private glyphElapsed = 0
  private transition?: MessageTransition

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

    if (this.transition) {
      this.updateTransition(delta)
      return
    }

    this.glyphElapsed += delta

    if (this.glyphElapsed >= GLYPH_UPDATE_INTERVAL) {
      const changes = 1 + Math.floor(Math.random() * MAX_RANDOM_GLYPH_CHANGES)

      for (let index = 0; index < changes; index += 1) {
        this.glyphs[Math.floor(Math.random() * this.glyphs.length)] = randomGlyph()
      }

      redrawLabel(this.context, this.glyphs)
      this.texture.needsUpdate = true
      this.glyphElapsed = 0
    }
  }

  showMessage(message: string) {
    this.clearMessage()
    this.transition!.glyphs = createMessageGlyphs(message, this.glyphs.length)
  }

  clearMessage() {
    this.transition = {
      loops: 0,
      phase: 'clearing',
      progress: 0,
      stepElapsed: 0,
    }
  }

  private updateTransition(delta: number) {
    const transition = this.transition!
    transition.stepElapsed += delta
    const stepDuration =
      transition.phase === 'clearing' ? CLEAR_STEP_DURATION : WAVE_STEP_DURATION
    let changed = false

    while (transition.stepElapsed >= stepDuration) {
      transition.stepElapsed -= stepDuration
      changed = true
      if (transition.phase === 'clearing') {
        advanceGlyphWave(this.glyphs, this.ringOrder, transition.progress, () => '')
        transition.progress += 1

        if (transition.progress > this.glyphs.length + 3) {
          if (transition.glyphs) {
            transition.phase = 'revealing'
            transition.progress = 0
          } else {
            this.transition = undefined
            break
          }
        }
      } else if (transition.phase === 'revealing') {
        advanceGlyphWave(
          this.glyphs,
          this.ringOrder,
          transition.progress,
          (index) => transition.glyphs![index],
        )
        transition.progress += 1

        if (transition.progress > this.glyphs.length + 3) {
          transition.phase = 'looping'
          transition.progress = 0
        }
      } else {
        advanceGlyphWave(
          this.glyphs,
          this.ringOrder,
          transition.progress,
          (index) => transition.glyphs![index],
        )
        transition.progress += 1

        if (transition.progress > this.glyphs.length + 3) {
          transition.loops += 1

          if (transition.loops >= GLITCH_CYCLES) {
            this.clearMessage()
            break
          }

          transition.progress = 0
        }
      }
    }

    if (changed) {
      redrawLabel(this.context, this.glyphs)
      this.texture.needsUpdate = true
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

function createRingOrder(length: number) {
  const leftmostGlyph = Math.floor(length * 0.75)

  return Array.from({ length }, (_, index) => (index + leftmostGlyph) % length)
}

function advanceGlyphWave(
  glyphs: string[],
  order: number[],
  progress: number,
  complete: (index: number) => string,
) {
  for (const [position, index] of order.entries()) {
    const age = progress - position

    if (age >= 3) {
      glyphs[index] = complete(index)
    } else if (age >= 0) {
      glyphs[index] = randomGlyph()
    }
  }
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
