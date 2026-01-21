import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // --- ADICIONE ESTE BLOCO 'build' ---
  build: {
    chunkSizeWarningLimit: 1000, // Aumenta o limite do aviso para 1MB (opcional)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa bibliotecas do node_modules em um arquivo 'vendor' separado
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  // -----------------------------------
}));
