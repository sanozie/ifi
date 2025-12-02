import { defineConfig } from 'nitro'
import { resolve } from 'node:path'

export default defineConfig({
  modules: ["workflow/nitro"],
  alias: {
    '@db': resolve(__dirname, './src/db'),
    '@interfaces': resolve(__dirname, './src/interfaces'),
    '@workflows': resolve(__dirname, './src/workflows'),
  },
  routes: {
    "/**": "./src/index.ts"
  }
})
