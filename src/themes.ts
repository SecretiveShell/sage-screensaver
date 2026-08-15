import type { ColorRepresentation } from 'three'

export interface ThemeEffects {
  signalLevel: number
  raySpin: number
  rayStutterSpin: number
  stutterFrequency: number
  stutterPower: number
  particleFlickerThreshold: number
  cubeOrbitAmplitude: number
  cubeOrbitSpeed: number
  cubeScatter?: { interval: number; variance: number }
  cameraJitter: {
    x: number
    y: number
    xFrequency: number
    yFrequency: number
  }
}

export interface ThemeConfig {
  colors: {
    background: ColorRepresentation
    foreground: ColorRepresentation
    core: ColorRepresentation
  }
  bloom: {
    threshold: number
    strength: number
    radius: number
  }
  effects: ThemeEffects
}

const QUIET_EFFECTS: ThemeEffects = {
  signalLevel: 0,
  raySpin: 0,
  rayStutterSpin: 0,
  stutterFrequency: 0,
  stutterPower: 1,
  particleFlickerThreshold: 2,
  cubeOrbitAmplitude: 0,
  cubeOrbitSpeed: 0,
  cameraJitter: { x: 0, y: 0, xFrequency: 0, yFrequency: 0 },
}

export const THEMES = {
  cool: {
    colors: { background: 0x020407, foreground: 0xc6ddeb, core: 0xffffff },
    bloom: { threshold: 0.58, strength: 0.8, radius: 0.46 },
    effects: QUIET_EFFECTS,
  },
  alert: {
    colors: { background: 0x0a0202, foreground: 0xff8a6d, core: 0xffffff },
    bloom: { threshold: 0.48, strength: 0.8, radius: 0.46 },
    effects: QUIET_EFFECTS,
  },
  void: {
    colors: { background: 0x030106, foreground: 0x8d73b5, core: 0xd8c0ff },
    bloom: { threshold: 0.45, strength: 0.62, radius: 0.42 },
    effects: QUIET_EFFECTS,
  },
  warning: {
    colors: { background: 0x100800, foreground: 0xffbd4a, core: 0xffefb0 },
    bloom: { threshold: 0.36, strength: 0.92, radius: 0.48 },
    effects: {
      signalLevel: 0.68,
      raySpin: 0.006,
      rayStutterSpin: 0,
      stutterFrequency: 0,
      stutterPower: 1,
      particleFlickerThreshold: 2,
      cubeOrbitAmplitude: 0.035,
      cubeOrbitSpeed: 0.55,
      cameraJitter: { x: 0, y: 0, xFrequency: 0, yFrequency: 0 },
    },
  },
  ice: {
    colors: { background: 0x01070d, foreground: 0x9deaff, core: 0xf1fdff },
    bloom: { threshold: 0.5, strength: 0.7, radius: 0.42 },
    effects: QUIET_EFFECTS,
  },
  matrix: {
    colors: { background: 0x000c03, foreground: 0x35ff74, core: 0xc3ffd1 },
    bloom: { threshold: 0.3, strength: 0.92, radius: 0.46 },
    effects: {
      signalLevel: 0.45,
      raySpin: 0.01,
      rayStutterSpin: 0.025,
      stutterFrequency: 9,
      stutterPower: 24,
      particleFlickerThreshold: 0.9,
      cubeOrbitAmplitude: 0.045,
      cubeOrbitSpeed: 0.65,
      cameraJitter: { x: 0.008, y: 0.006, xFrequency: 31, yFrequency: 43 },
    },
  },
  sunset: {
    colors: { background: 0x130407, foreground: 0xff8b67, core: 0xffd5b5 },
    bloom: { threshold: 0.35, strength: 0.95, radius: 0.5 },
    effects: {
      signalLevel: 0.2,
      raySpin: 0.003,
      rayStutterSpin: 0,
      stutterFrequency: 0,
      stutterPower: 1,
      particleFlickerThreshold: 2,
      cubeOrbitAmplitude: 0.025,
      cubeOrbitSpeed: 0.4,
      cameraJitter: { x: 0, y: 0, xFrequency: 0, yFrequency: 0 },
    },
  },
  ghost: {
    colors: { background: 0x060708, foreground: 0xb9c0c5, core: 0xf2f4f5 },
    bloom: { threshold: 0.6, strength: 0.5, radius: 0.35 },
    effects: {
      signalLevel: 0.08,
      raySpin: 0,
      rayStutterSpin: 0.008,
      stutterFrequency: 5,
      stutterPower: 32,
      particleFlickerThreshold: 0.96,
      cubeOrbitAmplitude: 0,
      cubeOrbitSpeed: 0,
      cameraJitter: { x: 0.004, y: 0.003, xFrequency: 23, yFrequency: 29 },
    },
  },
  evil: {
    colors: { background: 0x120001, foreground: 0xff2438, core: 0xff0022 },
    bloom: { threshold: 0.16, strength: 1.1, radius: 0.55 },
    effects: {
      signalLevel: 0.85,
      raySpin: 0.018,
      rayStutterSpin: 0.08,
      stutterFrequency: 17,
      stutterPower: 18,
      particleFlickerThreshold: 0.75,
      cubeOrbitAmplitude: 0.12,
      cubeOrbitSpeed: 0.8,
      cubeScatter: { interval: 1.35, variance: 0.85 },
      cameraJitter: { x: 0.035, y: 0.025, xFrequency: 37, yFrequency: 53 },
    },
  },
} satisfies Record<string, ThemeConfig>

export type ThemeName = keyof typeof THEMES
/** A built-in theme name or a complete custom theme configuration. */
export type Theme = ThemeName | ThemeConfig

/** All built-in themes, suitable for menus and controls. */
export const THEME_NAMES = Object.freeze(Object.keys(THEMES) as ThemeName[])
