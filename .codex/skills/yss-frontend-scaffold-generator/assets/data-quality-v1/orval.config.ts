import { defineConfig } from 'orval';
export default defineConfig({ api: { input: './openapi/openapi.json', output: { target: './packages/src/api/generated/client.ts', schemas: './packages/src/api/generated/model', client: 'axios', mode: 'single', override: { mutator: { path: './packages/src/api/mutator.ts', name: 'customInstance' } } } } });
