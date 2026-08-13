import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pagesはリポジトリ名のサブパスで配信されるため base を指定
// 例: https://yukisatodev.github.io/csv-quick-viewer/
export default defineConfig({
  plugins: [react()],
  base: '/csv-quick-viewer/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
