---
name: yss-openapi
description: Generate and refresh YSS backend OpenAPI contracts and frontend Orval API clients. Use when working in YSS Java plus Vue micro-application repos where smart-doc-maven-plugin creates target/openapi/openapi.json, the file must be copied into a frontend openapi directory, and package scripts such as generate:api, orval, api-schema-cleanup.cjs, api-flatten-exports.cjs, or format:generated regenerate src/api client code.
---

# YSS OpenAPI

Use this skill to move a backend controller/DTO contract into the frontend generated API layer.

This is an implementation/generation skill, not the product API design step. For new or changed API contracts, first produce OpenAPI Draft in `docs/api/specs/`, pass engineering baseline, architecture / OpenSpec / Comet design, and Design Review, then Freeze the contract before using this skill to refresh generated clients. When the backend is already the implemented source of truth, use this skill to regenerate and inspect the emitted contract before updating call sites.

## Core Flow

1. Locate the backend module that owns smart-doc generation.
   - In `yss-valuation-outsourced`, this is usually `valuation-outsourced-starter`.
   - Confirm the module has `smart-doc-maven-plugin` and a config such as `src/main/resources/smart-doc.json`.
   - The smart-doc config's `outPath` determines the generated directory; in this repo it is `target/openapi`.

2. Generate the backend OpenAPI contract from the repository root.
   - Use the exact project profile/options the repo expects.
   - For this repo, run the root `mvnw`; do not add IntelliJ-specific listener or `-Didea.*` parameters:

```bash
sh mvnw -P SpringCloud.2021.0.9,aliyun-only -DskipTests=true -Dmaven.repo.local=/Users/zhudaoming/.m2/repository com.github.shalousun:smart-doc-maven-plugin:yss-4.0.0:openapi -f pom.xml
```

3. Find the generated `openapi.json`.
   - Use `find . -path '*/target/openapi/openapi.json' -print`.
   - For this repo, the expected source is `valuation-outsourced-starter/target/openapi/openapi.json`.
   - If multiple files exist, choose the one from the module whose `smart-doc.json` and plugin includes cover the controllers/DTOs being changed.

4. Copy the generated contract into the frontend OpenAPI input.
   - In `yss-valuation-outsourced`, copy to `valuation-outsourced-frontend/openapi/openapi.json`.
   - Preserve the frontend path expected by `orval.config.ts`; do not invent a new input path unless the config is updated too.

```bash
cp valuation-outsourced-starter/target/openapi/openapi.json valuation-outsourced-frontend/openapi/openapi.json
```

5. Regenerate the frontend API client from the frontend root.
   - In this repo, run from `valuation-outsourced-frontend`:

```bash
pnpm generate:api
```

   - The script expands to:

```bash
orval && node scripts/api-schema-cleanup.cjs && node scripts/api-flatten-exports.cjs && pnpm format:generated
```

6. Inspect generated changes before touching call sites.
   - Check `openapi/openapi.json`.
   - Check `packages/src/api/generated/**`.
   - Update handwritten call sites only after seeing the regenerated function names, request body shape, params type, and result type.

## How It Works

- `smart-doc-maven-plugin` scans Java controller methods, request/response DTOs, annotations, comments, and configured dependency source jars. It emits an OpenAPI contract under the configured `outPath`.
- The backend module is the source of truth for routes, HTTP verbs, DTO field names, enum descriptions, binary responses, multipart inputs, and operation IDs.
- The frontend `orval.config.ts` reads `openapi/openapi.json` and generates TypeScript schema types plus axios client functions under `packages/src/api/generated`.
- `scripts/api-schema-cleanup.cjs` changes empty object-like generated schemas from `{ [key: string]: unknown }` to `Record<string, never>` so empty bodies/responses are stricter.
- `scripts/api-flatten-exports.cjs` converts Orval single-mode `getApi()` factory internals into top-level named exports, then keeps `getApi()` as a compatibility wrapper.
- `pnpm format:generated` formats generated TypeScript files.

## Repo Checks

Run these discovery commands when the layout is uncertain:

```bash
rg -n "smart-doc-maven-plugin|configFile|outPath|openapi" -S pom.xml '**/pom.xml' '**/smart-doc.json'
find . -maxdepth 5 \( -name 'orval.config.*' -o -name 'package.json' -o -name 'api-schema-cleanup.cjs' -o -name 'api-flatten-exports.cjs' \) -print
```

For `yss-valuation-outsourced`, expect:

- Backend smart-doc config: `valuation-outsourced-starter/src/main/resources/smart-doc.json`
- Backend generated file: `valuation-outsourced-starter/target/openapi/openapi.json`
- Frontend Orval input: `valuation-outsourced-frontend/openapi/openapi.json`
- Frontend Orval config: `valuation-outsourced-frontend/orval.config.ts`
- Frontend generated code: `valuation-outsourced-frontend/packages/src/api/generated`

## Troubleshooting

- If a controller or DTO is missing, check `smart-doc.json` `packageFilters`, the plugin `<includes>`, module dependencies, and whether source jars are available in the local Maven repository.
- If schema names look unstable or invalid, check `componentType`; this repo uses `NORMAL` to keep class-like schema names.
- If binary download or Excel upload contracts are wrong, inspect backend annotations and any OpenAPI normalizer/override code in the repo before manually editing generated JSON.
- If Orval changes a client function signature, update frontend call sites to match the generated contract. Do not preserve old call shapes by hand-editing generated files.
- If `api-flatten-exports.cjs` cannot parse `getApi`, inspect the generated `index.ts`; an Orval version or mode change may have changed the output shape.
- If formatting or generation fails in nested workspaces, run from the frontend root that owns `orval.config.ts` and the `generate:api` script.

## Verification

Prefer targeted checks:

```bash
test -s valuation-outsourced-starter/target/openapi/openapi.json
test -s valuation-outsourced-frontend/openapi/openapi.json
cd valuation-outsourced-frontend && pnpm generate:api
git diff -- valuation-outsourced-frontend/openapi/openapi.json valuation-outsourced-frontend/packages/src/api/generated
```

For frontend behavior after API signature changes, run the smallest build or type check that is reliable for the repo. In `yss-valuation-outsourced`, `pnpm exec vite build` from the frontend package workspace has historically been a better signal than broad repo-wide checks when toolchain noise exists.
