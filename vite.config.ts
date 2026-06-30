import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const root = __dirname;
const production = process.env.ENV === 'production';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.ENV),
  },
  build: {
    outDir: path.resolve(root, 'devtools'),
    emptyOutDir: true,
    sourcemap: !production,
    rollupOptions: {
      input: {
        panel: path.resolve(root, 'src/extension/panel.ts'),
        devtools: path.resolve(root, 'src/extension/devtools.ts'),
        background: path.resolve(root, 'src/extension/background.ts'),
        'content-script': path.resolve(root, 'src/extension/content-script.ts'),
        'inspected-runtime': path.resolve(root, 'src/inspected/entry.ts'),
      },
      output: {
        entryFileNames: 'scripts/[name].js',
        chunkFileNames: 'scripts/chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'ui/style.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: path.resolve(root, 'panel.html'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'devtools.html'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'icons'), dest: path.resolve(root, 'devtools') },
        { src: path.resolve(root, 'manifest.json'), dest: path.resolve(root, 'devtools') },
      ],
      watch: {},
    }),
  ],
});
