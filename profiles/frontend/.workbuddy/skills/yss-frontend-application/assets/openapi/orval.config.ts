import { defineConfig } from 'orval'

export default defineConfig({
  application: {
    input: { target: './openapi/application.json' },
    output: {
      mode: 'split',
      target: './src/api/generated/application.ts',
      schemas: './src/api/generated/schemas',
      client: 'axios-functions',
      httpClient: 'axios',
      indexFiles: false,
      clean: false,
      override: {
        mutator: { path: './src/api/transport.ts', name: 'customRequest' },
        components: { schemas: { suffix: 'Schema' } },
      },
    },
  },
})
