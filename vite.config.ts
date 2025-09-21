import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import preact from '@preact/preset-vite'

// https://vite.dev/config/
export default defineConfig({
    build: {
        minify: false,
    },
    plugins: [tsconfigPaths(), preact()],
})
