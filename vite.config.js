import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/adsb-api': {
        target: 'https://opendata.adsb.fi',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/adsb-api/, '/api'),
      },
      '/flightaware-api': {
        target: 'https://aeroapi.flightaware.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/flightaware-api/, '/aeroapi'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet')) return 'vendor-map';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
          }
        },
      },
    },
  },
})
