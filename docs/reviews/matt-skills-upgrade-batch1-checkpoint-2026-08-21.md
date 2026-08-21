# Matt 技能升级批次一维护 Checkpoint

本记录只覆盖“上游来源与调用拓扑”；兼容入口行为调整和前端还原门禁属于后续批次。

```yaml
schema_version: 1
intensity: L3
classification_reason: 改变 skill 调用权限、默认入口、上游来源验证和核心场景校验，并退役共享 skill。
triggers: [permission-boundary, core-validator, aggregate-behavior-change]
changed_assets:
  - .agents/skills/triage/SKILL.md
  - .agents/skills/wayfinder/SKILL.md
  - .agents/skills/diagnosing-bugs/SKILL.md
  - .agents/skills/wait-what/SKILL.md
  - .agents/skills/domain-modeling/SKILL.md
  - .agents/skills/grilling/SKILL.md
  - .agents/skills/yss-product-lifecycle/references/orchestration-contract.yaml
  - scripts/lib/scenario-checks.mjs
  - scripts/lib/skill-supply-chain.mjs
  - scripts/verify-upstream-skill-source
  - skills-lock.json
  - AGENTS.md
  - docs/agents/skills-maintenance.md
  - docs/process/MATT-POCOCK-ENGINEERING-SKILLS.md
  - batch-grill-me 的权威目录及六个投影
verification_evidence:
  - kind: red
    command: docs/reviews/matt-skills-upgrade-plan-2026-08-21.md#批次一：上游来源与调用拓扑/RED-基线
    result: pass
  - kind: green
    command: scripts/verify-upstream-skill-source --source-root=/Users/zhudaoming/skills && scripts/sync-skills --check && scripts/update-skill-lock --check
    result: pass
  - kind: refactor
    command: scripts/verify-lifecycle-registry && git diff --check
    result: pass
  - kind: pressure-scenario
    command: scripts/verify-template（含 Matt/YSS 调用边界、来源锁定、退役条目和工作单元路由压力场景）
    result: pass
  - kind: fresh-verification
    command: scripts/verify-template
    result: pass
  - kind: formal-independent-review
    command: 冻结候选后由非实施者执行 Standards / Spec 双轴正式独立审查
    result: pending
review_mode: formal-independent
escalation: formal-independent-review-required-before-release
```

当前实现已通过所有可执行验证，但在正式独立审查完成前，不宣布本批次为可发布候选。
