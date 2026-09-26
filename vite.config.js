import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    server: {
        host: '0.0.0.0',
        open: false,
        allowedHosts: ['.e2b.app'],
        // Browser-test traces contain HTML; don't reload the app when they're written.
        watch: { ignored: ['**/.cache/**', '**/playwright-report/**', '**/test-results/**'] },
    },
    build: {
        manifest: true,
    },
});
