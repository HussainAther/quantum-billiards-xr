import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/studio',
    lib: { entry: 'src/studio/quantum-billiards.ts', formats: ['es'], fileName: 'quantum-billiards' },
    rollupOptions: { external: ['@8thwall/ecs'] },
  },
})
