import { defineConfig } from 'nitro'
import { resolve } from 'node:path'

export default defineConfig({
  modules: ["workflow/nitro"],
  alias: {
    '@db': resolve(__dirname, './src/db'),
    '@interfaces': resolve(__dirname, './src/interfaces'),
    '@integrations': resolve(__dirname, './src/integrations'),
    '@workflows': resolve(__dirname, './src/workflows'),
    '@constants': resolve(__dirname, './src/constants'),
    '@routes': resolve(__dirname, './src/routes'),
    '@providers': resolve(__dirname, './src/providers'),
  },
  routes: {
    "/**": "./src/worker.ts"
  }
})
