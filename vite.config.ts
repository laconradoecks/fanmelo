import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev and preview, forward the waitlist API and admin page to the local
// Python service (python3 deploy/waitlist/app.py). In production nginx does this.
const backend = {
  '/api': 'http://127.0.0.1:8788',
  '/admin': 'http://127.0.0.1:8788',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: backend },
  preview: { proxy: backend },
})
