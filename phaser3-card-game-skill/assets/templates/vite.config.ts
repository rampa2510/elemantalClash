import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: './',
    server: { 
      port: 8080, 
      host: true,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
            firebase: ['firebase/app', 'firebase/database', 'firebase/auth']
          },
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js'
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true
        }
      },
      chunkSizeWarningLimit: 1500
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});
