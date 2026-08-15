import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ComponentPropsWithoutRef,
} from 'react'
import { Scene } from './scene.ts'
import type { ThemeName } from './themes.ts'

export interface SageAnimationHandle {
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
  setTheme(theme: ThemeName): void
  showMessage(message: string): void
}

export interface SageAnimationProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  audioStream?: MediaStream | null
  audioElement?: HTMLMediaElement | null
  audioLevel?: number
  message?: string | null
  minimal?: boolean
  signalLevel?: number
  theme?: ThemeName
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
      signalLevel = 0,
      style,
      theme = 'cool',
      ...props
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<Scene | null>(null)

    useImperativeHandle(ref, () => ({
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
