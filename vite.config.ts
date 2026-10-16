import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const compat = (file: string) => path.resolve(__dirname, './src/ws/compat/next', file)

// https://vite.dev/config/
export default defineConfig({
  // Tailwind is the WorldStore UI's layout layer (src/ws/app/globals.css).
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@ws', replacement: path.resolve(__dirname, './src/ws') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // The WorldStore UI was written for Next.js. These map its imports onto
      // react-router and the browser (see src/ws/compat/next).
      { find: /^next\/link$/, replacement: compat('link.tsx') },
      { find: /^next\/navigation$/, replacement: compat('navigation.ts') },
      { find: /^next\/image$/, replacement: compat('image.tsx') },
      { find: /^next\/form$/, replacement: compat('form.tsx') },
      { find: /^next\/headers$/, replacement: compat('headers.ts') },
      { find: /^next\/server$/, replacement: compat('server.ts') },
    ],
  },
})
