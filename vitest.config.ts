import { defineConfig } from 'vitest/config'

// Configuración de tests separada de vite.config.ts a propósito:
// así el plugin de PWA no se ejecuta al correr la suite.
//
// Hoy solo se testean funciones puras (src/utils/), por eso environment: 'node'.
// Cuando se testeen componentes React habrá que añadir jsdom,
// @vitejs/plugin-react y @testing-library/react.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
})
