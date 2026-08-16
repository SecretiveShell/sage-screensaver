import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { Scene } from './scene.js'
import type { Theme } from './themes.js'

export interface SageAnimationHandle {
  /** Restore the ambient random glyph ring. */
  clearMessage(): void
  gatherCubes(): void
  pulseCore(): void
  resumeAudio(): void
  scatterCubes(): void
  setMinimalMode(enabled: boolean): void
  setAudioStream(stream: MediaStream | null): void
  setAudioElement(element: HTMLMediaElement | null): void
  setAudioLevel(level: number): void
  setSignalLevel(level: number): void
  setTheme(theme: Theme): void
  showMessage(message: string): void
}

export interface SageAnimationProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** A live audio stream to analyse. Takes precedence over `audioLevel`. */
  audioStream?: MediaStream | null
  /** A media element to analyse. Call `resumeAudio` from a user gesture before playback. */
  audioElement?: HTMLMediaElement | null
  /** A 0–1 audio fallback for sources that cannot be analysed by the Web Audio API. */
  audioLevel?: number
  /** Text phased into the outer ring. `null` or an empty string restores ambient glyphs. */
  message?: string | null
  minimal?: boolean
  /** Called once the canvas is ready; useful when a ref is inconvenient. */
  onReady?: (handle: SageAnimationHandle) => void
  signalLevel?: number
  /** A built-in theme name or a complete `ThemeConfig`. */
  theme?: Theme
}

export const SageAnimation = forwardRef<SageAnimationHandle, SageAnimationProps>(
  function SageAnimation(
    {
      className,
      audioStream = null,
      audioElement = null,
      audioLevel = 0,
      message,
      minimal = false,
      onReady,
      signalLevel = 0,
      style,
      theme = 'cool',
      ...props
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<Scene | null>(null)

    const handle = useMemo<SageAnimationHandle>(() => ({
      clearMessage: () => sceneRef.current?.clearMessage(),
      gatherCubes: () => sceneRef.current?.gatherCubes(),
      pulseCore: () => sceneRef.current?.pulseCore(),
      resumeAudio: () => sceneRef.current?.resumeAudio(),
      scatterCubes: () => sceneRef.current?.scatterCubes(),
      setMinimalMode: (enabled) => sceneRef.current?.setMinimalMode(enabled),
      setAudioStream: (stream) => sceneRef.current?.setAudioStream(stream),
      setAudioElement: (element) => sceneRef.current?.setAudioElement(element),
      setAudioLevel: (level) => sceneRef.current?.setAudioLevel(level),
      setSignalLevel: (level) => sceneRef.current?.setSignalLevel(level),
      setTheme: (nextTheme) => sceneRef.current?.setTheme(nextTheme),
      showMessage: (nextMessage) => sceneRef.current?.showMessage(nextMessage),
    }), [])

    useImperativeHandle(ref, () => handle, [handle])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }

      const scene = new Scene(canvas)
      sceneRef.current = scene
      scene.start()

      return () => {
        scene.dispose()
        sceneRef.current = null
      }
    }, [])

    useEffect(() => {
      if (sceneRef.current) {
        onReady?.(handle)
      }
    }, [handle, onReady])

    useEffect(() => {
      sceneRef.current?.setTheme(theme)
    }, [theme])

    useEffect(() => {
      sceneRef.current?.setAudioStream(audioStream)
    }, [audioStream])

    useEffect(() => {
      sceneRef.current?.setAudioElement(audioElement)
    }, [audioElement])

    useEffect(() => {
      sceneRef.current?.setAudioLevel(audioLevel)
    }, [audioLevel])

    useEffect(() => {
      sceneRef.current?.setSignalLevel(signalLevel)
    }, [signalLevel])

    useEffect(() => {
      sceneRef.current?.setMinimalMode(minimal)
    }, [minimal])

    useEffect(() => {
      if (message === null || message === '') {
        sceneRef.current?.clearMessage()
      } else if (message !== undefined) {
        sceneRef.current?.showMessage(message)
      }
    }, [message])

    return (
      <div
        {...props}
        className={['sage-animation', className].filter(Boolean).join(' ')}
        style={{ height: '100%', overflow: 'hidden', position: 'relative', width: '100%', ...style }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Animated wireframe icosahedron"
          style={{ display: 'block', height: '100%', width: '100%' }}
        />
      </div>
    )
  },
)
