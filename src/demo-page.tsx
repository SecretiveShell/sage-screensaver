import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import { SageAnimation, type SageAnimationHandle } from './sage-animation.tsx'
import { THEMES, type ThemeName } from './themes.ts'

const themeNames = Object.keys(THEMES) as ThemeName[]

export function DemoPage() {
  const [theme, setTheme] = useState<ThemeName>('cool')
  const [message, setMessage] = useState<string | null>(null)
  const [draftMessage, setDraftMessage] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const animationRef = useRef<SageAnimationHandle>(null)
  const setAudioRef = useCallback((element: HTMLAudioElement | null) => setAudioElement(element), [])

  function changeTheme(event: ChangeEvent<HTMLSelectElement>) {
    setTheme(event.target.value as ThemeName)
  }

  function changeMessage(value: string) {
    setDraftMessage(value)
    setMessage(value.trim() || null)
  }

  function playSampleSpeech() {
    if (audioElement) {
      audioElement.currentTime = 0
      animationRef.current?.resumeAudio()
      void audioElement.play()
    }
  }

  return (
    <main className="demo-page">
      <section className="demo-preview" aria-label="Sage animation preview">
        <SageAnimation
          ref={animationRef}
          theme={theme}
          message={message}
          audioElement={audioElement}
          signalLevel={isSpeaking ? 1 : 0}
        />
      </section>
      <aside className="demo-controls" aria-label="Animation controls">
        <p className="demo-eyebrow">Sage animation</p>
        <h1>Demo controls</h1>

        <label>
          Theme
          <select value={theme} onChange={changeTheme}>
            {themeNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>

        <label>
          Ring message
          <input
            value={draftMessage}
            onChange={(event) => changeMessage(event.target.value)}
            placeholder="Empty uses ambient glyphs"
          />
        </label>

        <button type="button" onClick={playSampleSpeech}>
          {isSpeaking ? 'Restart sample TTS' : 'Play sample TTS'}
        </button>
        <p className="demo-note">
          Uses a generated WAV file. The animation reacts to its actual waveform and frequency bands.
        </p>
        <audio
          ref={setAudioRef}
          src="/demo-audio.wav"
          onPlay={() => setIsSpeaking(true)}
          onEnded={() => setIsSpeaking(false)}
          onPause={() => setIsSpeaking(false)}
        />
      </aside>
    </main>
  )
}
