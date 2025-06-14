import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: './env',
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(''), './src')
    }
  }
})
