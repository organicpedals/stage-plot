import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// base './' serve tanto para GitHub Pages (subpasta) quanto para o app desktop (file://).
// OUT_DIR=dist nos builds de publicação; localmente o build vai para ../out/v01.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: process.env.OUT_DIR ?? '../out/v01', emptyOutDir: true },
})
