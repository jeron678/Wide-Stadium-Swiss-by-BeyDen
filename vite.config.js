import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        scoreboard: resolve(process.cwd(), 'scoreboard.html'),
        referee: resolve(process.cwd(), 'referee.html')
      }
    }
  }
})