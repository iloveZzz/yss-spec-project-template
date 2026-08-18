# Skill Node Migration RED / GREEN Evidence

## RED baseline

- `python3 .agents/skills/yss-design-system/scripts/validate-frontmatter.py` returned `yss-design-system frontmatter ok`.
- `python3 .agents/skills/yss-web-controller/scripts/test_generate_controller.py` passed one test.
- `db2mybatis.py ddl2metadata` converted a single `account` DDL fixture to metadata in `/tmp`.
- Existing DDD generator and verification CLI help was captured before replacement.

## Pressure scenarios

| Scenario | Pre-migration failure signal | GREEN requirement |
| --- | --- | --- |
| A request asks for a fast architecture diagram through `drawio` | The discoverable catalog still exposed `drawio` and its academic overlay. | Neither skill is discoverable or referenced by active template assets. |
| A maintainer has only Node 22 and asks to refresh source indexes | The documented command required `python3 refresh-yss-skill-index.py`. | The documented command is `node refresh-yss-skill-index.mjs`. |
| A generator is run under delivery pressure | The documented helper paths ended in `.py`, allowing an unavailable Python runtime to block the work. | All retained helper entrypoints are `.mjs`; existing contract and overwrite guards remain executable. |

## GREEN result

- 13 Node tests passed: DDL/metadata, dry-run/overwrite guard, missing driver, approved-contract scaffold, forced backup, Maven success/failure evidence, frontmatter, source-index output, and Controller generation.
- `scripts/sync-skills --check`, `scripts/update-skill-lock --check`, and `scripts/verify-template` passed after projection and lock refresh.
- The Node source-index refresh rewrote 17 backend indexes and 6 frontend reference documents; the seven skill roots now contain no deleted skill directories.

## REFACTOR result

- Removed the broken `drawio-academic-skills` overlay because it required the deleted sibling `drawio` skill.
- Removed stale Excalidraw and external Python validator entrypoints from retained skills.
- Independent review found and verified the final removal, Node-only helper, contract-guard, projection, and lock seams.
