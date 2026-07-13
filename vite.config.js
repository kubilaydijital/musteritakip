import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Vite 8'in Rolldown derleyicisi, react-router-dom'un içinde kullandığı
      // "react-router/dom" alt yol importunu çözemiyor (bilinen bir uyumluluk sorunu).
      // Bu alias, o importu doğrudan react-router-dom'a yönlendirerek build hatasını çözer.
      'react-router/dom': 'react-router-dom',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // react-router ve react-router-dom'u AYNI parçada (chunk) tutuyoruz.
          // Rolldown, bunlar farklı parçalara bölündüğünde iç importu çözemiyor -
          // bu ayar, o bölünmeyi baştan engelleyerek sorunu kökten önler.
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
