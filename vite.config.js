import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 시 GITHUB_PAGES=1 환경변수와 함께 빌드.
// 저장소 이름이 다르면 BASE_PATH 변수로 덮어쓸 수 있게 했다.
const isPages = process.env.GITHUB_PAGES === '1' || process.env.GITHUB_PAGES === 'true';
const basePath = process.env.BASE_PATH || (isPages ? '/AssignmentBotWeb/' : '/');

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500, // pdfjs worker 때문에 약간 큼
  },
});
