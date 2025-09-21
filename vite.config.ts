import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
    esbuild: {
        pure: ['console.log'],
        minifyIdentifiers: false,
    },
    build: {
        minify: 'esbuild',
    },
    plugins: [tsconfigPaths(), preact()],
})
