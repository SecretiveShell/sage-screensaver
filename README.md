# sage-screensaver

A reactive Three.js orb for React interfaces, designed for AI-agent surfaces.

## Install

```sh
pnpm add sage-screensaver three
```

`react` and `three` are peer dependencies. The component is browser-only.

## Use

```tsx
import { SageAnimation } from 'sage-screensaver'

export function AgentPresence({ message }: { message?: string | null }) {
  return (
    <SageAnimation
      theme="cool"
      message={message}
      style={{ height: 420, width: 420 }}
    />
  )
}
```

The component fills its container. Give it an explicit height, directly or through its parent.

### Themes

```tsx
import { SageAnimation, THEME_NAMES, type ThemeName } from 'sage-screensaver'

const theme: ThemeName = 'evil'

<SageAnimation theme={theme} />
// THEME_NAMES is useful for a theme picker.
```

You can also pass a complete typed `ThemeConfig` to `theme` (or `handle.setTheme`) for a custom theme.

### Message ring

Pass `message` as ordinary React state. Characters phase naturally into the latest value; there is no imperative “set message” step. Use `null`, `undefined`, or `''` for ambient random glyphs.

### Audio response

For an HTML audio element, pass the element and resume the audio graph from the same click that starts playback:

```tsx
import { useRef, useState } from 'react'
import { SageAnimation, type SageAnimationHandle } from 'sage-screensaver'

function AgentVoice() {
  const animation = useRef<SageAnimationHandle>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const play = async () => {
    animation.current?.resumeAudio()
    await audio?.play()
  }

  return (
    <>
      <SageAnimation ref={animation} audioElement={audio} />
      <audio ref={setAudio} src="/agent-response.mp3" />
      <button onClick={play}>Play</button>
    </>
  )
}
```

`audioStream` accepts a `MediaStream`. If your source cannot be routed through Web Audio, set a 0–1 `audioLevel` yourself instead.

The ref also exposes deliberate effects such as `pulseCore()`, `gatherCubes()`, `scatterCubes()`, `setTheme()`, and `clearMessage()`. Alternatively use `onReady` to receive the same typed handle.

## Development

```sh
pnpm dev        # application and /demo route
pnpm run build  # application plus publishable ESM library and declarations
```
