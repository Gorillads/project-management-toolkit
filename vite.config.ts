import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://gorillads.github.io/project-management-toolkit/ by the Pages workflow.
export default defineConfig({
  base: '/project-management-toolkit/',
  plugins: [react()],
})
