import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Conx Academy',
        short_name: 'Conx',
        description: 'Sua plataforma de treinamentos e conhecimento',
        theme_color: '#000000', // Fundo preto como o seu sistema
        background_color: '#000000',
        display: 'standalone', // Faz abrir sem a barra do navegador
        orientation: 'portrait',
        icons: [
          {
            src: '/IconeApp.png', // Caminho exato do seu arquivo na pasta public
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/IconeApp.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Importante para ícones de Android
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));