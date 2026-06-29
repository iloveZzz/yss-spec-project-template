# Skills Maintenance

This repo expects Matt Pocock Engineering Skills to be installed locally for Codex and Hermes.

## Source

- Upstream: <https://github.com/mattpocock/skills/tree/main/skills/engineering>
- Installed date: 2026-06-29
- Installation mode: local copy

## Installed Skills

```text
ask-matt
codebase-design
diagnosing-bugs
domain-modeling
grill-with-docs
implement
improve-codebase-architecture
prototype
resolving-merge-conflicts
setup-matt-pocock-skills
tdd
to-issues
to-prd
triage
```

## Runtime Locations

| Runtime | Path |
|---|---|
| Codex | `/Users/zhudaoming/.codex/skills/<skill-name>/` |
| Hermes | `/Users/zhudaoming/.hermes/skills/software-development/<skill-name>/` |

## Upgrade Checklist

1. Back up the current Codex and Hermes skill directories.
2. Pull or download upstream `skills/engineering`.
3. Replace all 14 skill directories in both runtimes.
4. Confirm each skill has a `SKILL.md`.
5. Restart Codex.
6. Run `hermes skills list` and confirm each skill is enabled.
7. Re-read `AGENTS.md` and this repository's safety rules; they override upstream skills on conflicts.

## Verification Command

```bash
for d in ask-matt codebase-design diagnosing-bugs domain-modeling grill-with-docs implement improve-codebase-architecture prototype resolving-merge-conflicts setup-matt-pocock-skills tdd to-issues to-prd triage; do
  test -f "/Users/zhudaoming/.codex/skills/$d/SKILL.md" || echo "codex missing $d"
  test -f "/Users/zhudaoming/.hermes/skills/software-development/$d/SKILL.md" || echo "hermes missing $d"
done
```
