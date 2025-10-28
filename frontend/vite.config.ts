import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import tailwindcssPostcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

const tailwindAdapter = {
  name: 'tailwindcss',
  config: () => {
    void tailwindcss;
    return {
      css: {
        postcss: {
          plugins: [tailwindcssPostcss()],
        },
      },
    };
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindAdapter],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
});
