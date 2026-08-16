export interface AudioFrame {
  level: number
  innerSpectrum: Float32Array
  outerSpectrum: Float32Array
}

/** Owns one Web Audio graph and exposes stable, visualiser-ready frequency bands. */
export class AudioAnalyser {
  private analyser?: AnalyserNode
  private context?: AudioContext
  private timeDomainData?: Uint8Array<ArrayBuffer>
  private frequencyData?: Uint8Array<ArrayBuffer>
  private element?: HTMLMediaElement
  private source?: AudioNode
  private stream?: MediaStream
  private manualLevel = 0
  private readonly frame: AudioFrame = {
    level: 0,
    innerSpectrum: new Float32Array(12),
    outerSpectrum: new Float32Array(12),
  }

  setStream(stream: MediaStream | null) {
    if (stream === this.stream && !this.element) return

    this.disposeGraph()
    if (!stream) return

    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = this.createAnalyser(context)
    source.connect(analyser)

    this.context = context
    this.analyser = analyser
    this.source = source
    this.stream = stream
  }

  setElement(element: HTMLMediaElement | null) {
    if (element === this.element && !this.stream) return

    this.disposeGraph()
    if (!element) return

    const context = new AudioContext()
    const source = context.createMediaElementSource(element)
    const analyser = this.createAnalyser(context)
    source.connect(analyser)
    analyser.connect(context.destination)

    this.context = context
    this.analyser = analyser
    this.element = element
    this.source = source
  }

  setManualLevel(level: number) {
    this.manualLevel = clamp(level)
  }

  resume() {
    void this.context?.resume().catch(() => undefined)
  }

  sample(): AudioFrame {
    if (!this.analyser || !this.timeDomainData || !this.frequencyData) {
      this.frame.level = this.manualLevel
      this.frame.innerSpectrum.fill(this.manualLevel)
      this.frame.outerSpectrum.fill(this.manualLevel * 0.65)
      return this.frame
    }

    this.analyser.getByteTimeDomainData(this.timeDomainData)
    this.analyser.getByteFrequencyData(this.frequencyData)
    this.frame.level = rms(this.timeDomainData)
    fillSpectrum(this.frequencyData, this.frame.innerSpectrum, 2, 48)
    fillSpectrum(this.frequencyData, this.frame.outerSpectrum, 8, 96)
    return this.frame
  }

  dispose() {
    this.disposeGraph()
  }

  private createAnalyser(context: AudioContext) {
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.75
    this.timeDomainData = new Uint8Array(analyser.fftSize)
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount)
    return analyser
  }

  private disposeGraph() {
    this.source?.disconnect()
    this.analyser?.disconnect()
    if (this.context) void this.context.close()

    this.analyser = undefined
    this.context = undefined
    this.element = undefined
    this.frequencyData = undefined
    this.source = undefined
    this.stream = undefined
    this.timeDomainData = undefined
  }
}

function rms(data: Uint8Array<ArrayBuffer>) {
  let energy = 0
  for (const sample of data) {
    const value = (sample - 128) / 128
    energy += value * value
  }
  return Math.min(Math.sqrt(energy / data.length) * 4, 1)
}

function fillSpectrum(data: Uint8Array<ArrayBuffer>, target: Float32Array, start: number, end: number) {
  const range = Math.min(end, data.length) - start
  for (let index = 0; index < target.length; index += 1) {
    const bandStart = start + Math.floor((index / target.length) * range)
    const bandEnd = start + Math.floor(((index + 1) / target.length) * range)
    target[index] = enhanceBand(averageBand(data, bandStart, Math.max(bandStart + 1, bandEnd)))
  }
}

function averageBand(data: Uint8Array<ArrayBuffer>, start: number, end: number) {
  const upperBound = Math.min(end, data.length)
  let total = 0
  for (let index = start; index < upperBound; index += 1) total += data[index]
  return total / Math.max(upperBound - start, 1) / 255
}

function enhanceBand(level: number) {
  return clamp(Math.pow(level, 0.58) * 1.25)
}

function clamp(level: number) {
  return Math.min(Math.max(level, 0), 1)
}
