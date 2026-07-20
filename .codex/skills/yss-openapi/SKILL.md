---
name: yss-openapi
description: Generate OpenAPI JSON from implemented YSS Java controllers, request DTOs, and response DTOs, then refresh frontend Orval API clients. Use only for the smart-doc plus Orval implementation workflow where smart-doc-maven-plugin emits an OpenAPI JSON file and frontend generation scripts regenerate API client code. Do not use this as the unified OpenAPI style guide, design-time API governance, or design-time Draft review skill.
---

# YSS OpenAPI

Use this skill to move an already implemented backend controller/DTO contract into the frontend generated API layer.

This is an implementation/generation skill, not the product API design step and not the unified OpenAPI specification governance skill. It generates `openapi.json` from controller methods, request DTOs, response DTOs, annotations, and Java comments; it does not decide naming conventions, resource modeling, error taxonomy, pagination policy, permission semantics, or organization-wide OpenAPI style rules.

For new or changed API contracts, first produce an OpenAPI Draft in the repository's agreed API draft location, pass engineering baseline, architecture / Spec Delta design, and Design Review, then Freeze the contract before using this skill to refresh generated clients. When the backend is already the implemented source of truth, use this skill to regenerate and inspect the emitted contract before updating call sites.

## Scope Boundary

Use this skill for:

- Running `smart-doc-maven-plugin` to generate an OpenAPI JSON file from implemented backend code.
- Copying generated `openapi.json` into the frontend OpenAPI input path expected by Orval.
- Running frontend API client generation and inspecting generated TypeScript changes.
- Verifying that implemented controllers/DTOs emit the expected OpenAPI shape before call-site updates.

Do not use this skill for:

- Designing a new API contract from Spec, prototype, or architecture inputs.
- Defining the unified OpenAPI style guide or reusable API governance rules.
- Reviewing design-time OpenAPI Draft files before OpenAPI Freeze.
- Choosing REST resource boundaries, error models, permission behavior, pagination standards, or contract test policy.

For design-time contract review, use `yss-openapi-draft-review`. For a stronger organization-wide OpenAPI governance baseline, prefer a separate OpenAPI lint/style skill backed by a maintained ruleset tool such as Stoplight Spectral or Redocly CLI, then layer YSS-specific response wrappers, permission, pagination, and security-red-line rules on top.

## Core Flow

1. Locate the backend module that owns smart-doc generation.
   - Search the repository for `smart-doc-maven-plugin`, `configFile`, `outPath`, and `smart-doc.json`.
   - Confirm which module contains the controllers/DTOs being changed and which plugin execution includes them.
   - Read the smart-doc config instead of assuming a directory. Its `outPath` determines where the generated OpenAPI JSON is emitted.

2. Generate the backend OpenAPI contract from the repository root.
   - Use the exact Maven wrapper, profiles, module selector, and plugin version already used by the repository.
   - Prefer the repo's documented generation command if one exists in scripts, docs, CI, or previous command history.
   - Do not add IntelliJ-specific listener or `-Didea.*` parameters.

```bash
./mvnw <repo profiles/options> <smart-doc plugin goal> -f <root-or-module-pom>
```

3. Find the generated `openapi.json`.
   - Use the smart-doc `outPath` from the selected config as the primary source of truth.
   - If the exact file name is not obvious, search under the configured output directory for OpenAPI JSON files.
   - If multiple files exist, choose the one from the module whose config and plugin includes cover the controllers/DTOs being changed.

4. Copy the generated contract into the frontend OpenAPI input.
   - Locate the frontend root by finding `orval.config.*` and the package script that runs Orval or API generation.
   - Read the Orval config to identify the OpenAPI input path.
   - Preserve the frontend input path expected by Orval; do not invent a new input path unless the config is updated too.

```bash
cp <generated-openapi-json> <orval-input-openapi-json>
```

5. Regenerate the frontend API client from the frontend root.
   - Use the API generation script already defined by the frontend package when present.
   - If there is no wrapper script, run the configured Orval command and any local cleanup/format scripts referenced by the package scripts.

```bash
pnpm <api-generation-script>
```

6. Inspect generated changes before touching call sites.
   - Check the Orval input JSON path from the config.
   - Check the generated client output paths from the Orval config.
   - Update handwritten call sites only after seeing the regenerated function names, request body shape, params type, and result type.

## How It Works

- `smart-doc-maven-plugin` scans Java controller methods, request/response DTOs, annotations, comments, and configured dependency source jars. It emits an OpenAPI contract under the configured `outPath`.
- The backend module is the source of truth for routes, HTTP verbs, DTO field names, enum descriptions, binary responses, multipart inputs, and operation IDs.
- The frontend `orval.config.*` determines which OpenAPI input file is read and where TypeScript schema types plus client functions are generated.
- Local cleanup, export-flattening, or formatting scripts may post-process generated files. Use them only when they are part of the repository's generation script.

## Repo Checks

Run these discovery commands when the layout is uncertain:

```bash
rg -n "smart-doc-maven-plugin|configFile|outPath|openapi" -S pom.xml '**/pom.xml' '**/smart-doc.json'
find . -maxdepth 6 \( -name 'orval.config.*' -o -name 'package.json' -o -name 'smart-doc.json' \) -print
rg -n "orval|format:generated|api-schema-cleanup|api-flatten-exports" -S '**/package.json' '**/orval.config.*'
```

## Troubleshooting

- If a controller or DTO is missing, check `smart-doc.json` `packageFilters`, the plugin `<includes>`, module dependencies, and whether source jars are available in the local Maven repository.
- If schema names look unstable or invalid, check `componentType` and the repository's smart-doc configuration.
- If binary download or Excel upload contracts are wrong, inspect backend annotations and any OpenAPI normalizer/override code in the repo before manually editing generated JSON.
- If Orval changes a client function signature, update frontend call sites to match the generated contract. Do not preserve old call shapes by hand-editing generated files.
- If `api-flatten-exports.cjs` cannot parse `getApi`, inspect the generated `index.ts`; an Orval version or mode change may have changed the output shape.
- If formatting or generation fails in nested workspaces, run from the frontend root that owns `orval.config.*` and the API generation script.

## Verification

Prefer targeted checks:

```bash
test -s <generated-openapi-json>
test -s <orval-input-openapi-json>
cd <frontend-root> && pnpm <api-generation-script>
git diff -- <orval-input-openapi-json> <generated-client-output-paths>
```

For frontend behavior after API signature changes, run the smallest build or type check that is reliable for the repository and the affected frontend package.
