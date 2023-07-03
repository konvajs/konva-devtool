import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

console.log('process.env.NODE_ENV', process.env.ENV);
// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.NODE_ENV': `'${process.env.ENV}'`
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/ui/index.jsx'),
      name: 'ui',
      fileName: 'ui'
    },
    outDir: path.resolve(__dirname, 'devtools/ui'),
    sourcemap: process.env.ENV === 'development'
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.resolve(__dirname, 'src/scripts'),
          dest: path.resolve(__dirname, 'devtools')
        },
        {
          src: path.resolve(__dirname, 'panel.html'),
          dest: path.resolve(__dirname, 'devtools')
        },
        {
          src: path.resolve(__dirname, 'devtools.html'),
          dest: path.resolve(__dirname, 'devtools')
        },
        {
          src: path.resolve(__dirname, 'icons'),
          dest: path.resolve(__dirname, 'devtools')
        },
        {
          src: path.resolve(__dirname, 'manifest.json'),
          dest: path.resolve(__dirname, 'devtools')
        }
      ],
      watch: {}
    })
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true
      }
    }
  }
});
