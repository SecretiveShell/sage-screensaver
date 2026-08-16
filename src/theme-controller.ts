import * as THREE from 'three'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { THEMES, type Theme, type ThemeConfig } from './themes.js'

export interface ThemeMaterials {
  core: THREE.Material[]
  foreground: THREE.Material[]
}

export class ThemeController {
  private target: ThemeConfig = THEMES.cool
  private readonly targetBackground = new THREE.Color(THEMES.cool.colors.background)
  private readonly targetCore = new THREE.Color(THEMES.cool.colors.core)
  private readonly targetForeground = new THREE.Color(THEMES.cool.colors.foreground)
  private readonly scene: THREE.Scene
  private readonly bloomPass: UnrealBloomPass
  private readonly materials: ThemeMaterials

  constructor(
    scene: THREE.Scene,
    bloomPass: UnrealBloomPass,
    materials: ThemeMaterials,
  ) {
    this.scene = scene
    this.bloomPass = bloomPass
    this.materials = materials
  }

  setTheme(theme: Theme) {
    this.target = typeof theme === 'string' ? THEMES[theme] : theme
    this.targetBackground.set(this.target.colors.background)
    this.targetCore.set(this.target.colors.core)
    this.targetForeground.set(this.target.colors.foreground)
    return this.target
  }

  sync() {
    this.apply(1)
  }

  update(delta: number) {
    this.apply(1 - Math.exp(-delta * 6))
  }

  private apply(amount: number) {
    ;(this.scene.background as THREE.Color).lerp(this.targetBackground, amount)
    blendMaterialColors(this.materials.core, this.targetCore, amount)
    blendMaterialColors(this.materials.foreground, this.targetForeground, amount)
    this.bloomPass.threshold += (this.target.bloom.threshold - this.bloomPass.threshold) * amount
    this.bloomPass.strength += (this.target.bloom.strength - this.bloomPass.strength) * amount
    this.bloomPass.radius += (this.target.bloom.radius - this.bloomPass.radius) * amount
  }
}

function blendMaterialColors(materials: THREE.Material[], target: THREE.Color, amount: number) {
  for (const material of materials) {
    if (hasColor(material)) {
      material.color.lerp(target, amount)
    }
  }
}

function hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
  return 'color' in material && material.color instanceof THREE.Color
}
