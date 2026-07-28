import * as THREE from 'three'

export class OuterLabel {
  public readonly mesh: THREE.Sprite

  private readonly context: CanvasRenderingContext2D
  private readonly glyphs = [...randomGlyphs(116)]
  private readonly texture: THREE.CanvasTexture
  private glyphElapsed = 0

  constructor(radius = 2.5) {
    const labelTexture = createLabelTexture(this.glyphs)
    this.context = labelTexture.context
    this.texture = labelTexture.texture
    this.mesh = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.texture,
        color: 0xd9e5ef,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    )
    this.mesh.scale.setScalar(radius * 2)
  }

  update(delta: number) {
    this.mesh.material.rotation -= delta * 0.05
    this.glyphElapsed += delta

    if (this.glyphElapsed >= 0.12) {
      const changes = 1 + Math.floor(Math.random() * 32)

      for (let index = 0; index < changes; index += 1) {
        this.glyphs[Math.floor(Math.random() * this.glyphs.length)] = randomGlyph()
      }

      redrawLabel(this.context, this.glyphs)
      this.texture.needsUpdate = true
      this.glyphElapsed = 0
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
  context.fillStyle = '#ffffff'
  context.beginPath()
  context.arc(center, center, 500, 0, Math.PI * 2)
  context.fill()
  context.globalCompositeOperation = 'destination-out'
  context.beginPath()
  context.arc(center, center, 416, 0, Math.PI * 2)
  context.fill()
  context.globalCompositeOperation = 'source-over'

  context.fillStyle = '#05070a'
  context.font = '600 26px ui-monospace, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  drawGlyphRing(context, center, glyphs)
}

function drawGlyphRing(context: CanvasRenderingContext2D, center: number, glyphs: string[]) {
  for (const [index, glyph] of [...glyphs].entries()) {
    const angle = (index / glyphs.length) * Math.PI * 2 - Math.PI / 2

    context.save()
    context.translate(center, center)
    context.rotate(angle + Math.PI / 2)
    context.fillText(glyph, 0, -458)
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
