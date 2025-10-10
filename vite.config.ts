import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './', // GitHub Pages 호환을 위한 상대 경로
      publicDir: 'public',
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            admin: path.resolve(__dirname, 'admin.html'),
            chat: path.resolve(__dirname, 'chat_index.html'),
            simple: path.resolve(__dirname, 'simple.html'),
            test: path.resolve(__dirname, 'index2.html')
          },
          external: ['pdfjs-dist'],
          output: {
            globals: {
              'pdfjs-dist': 'pdfjsLib'
            }
          }
        }
      }
    };
});