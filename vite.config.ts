import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      // jsPDF optionally imports these for HTML rendering — we don't use that feature
      external: ['canvg', 'html2canvas', 'dompurify'],
    },
  },
})
