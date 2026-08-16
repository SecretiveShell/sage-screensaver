import { defineConfig } from 'vite'

export default defineConfig({
  // Demo audio belongs to the application build, never the component package.
  publicDir: false,
  build: {
    emptyOutDir: false,
    outDir: 'dist/lib',
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) => id === 'react' || id.startsWith('react/') || id === 'three' || id.startsWith('three/'),
    },
  },
})
