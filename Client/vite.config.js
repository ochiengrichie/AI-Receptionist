import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: [
      "silent-hoops-kiss.loca.lt",
      "famous-taxes-smile.loca.lt",
      "rare-humans-battle.loca.lt"
    ]
  }
})