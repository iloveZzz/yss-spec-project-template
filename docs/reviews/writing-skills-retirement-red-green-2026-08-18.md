# `writing-skills` 退役与轻量替代验证记录

## 范围与分级

- 强度：L3
- 触发项：`aggregate-behavior-change`
- 原因：退役共享技能并改变无分级仓库的默认验证行为，属于技能治理方法的聚合行为变化。
- 范围：新增 `maintaining-skills`；退役 `writing-skills`；迁移现行调用方、六个共享投影、`skills-lock.json` 与当前 Wiki。
- 保留：`wiki/raw/**` 和既有 review 文件作为历史证据，不改写其中的旧技能名。

## RED

修改前的独立只读压力场景使用一个无 L1 / L2 / L3 策略、只需新增约 30 行内部 CLI 参考 skill 的外部仓库。旧 `writing-skills` 仍强制失败基线、subagent 压力场景、无指导 control、每个 wording variant 5 次以上重复、逐项人工审阅和完整部署清单；这与低风险、已有确定性结构校验的任务不成比例。

独立检查还确认旧技能声明的 `.agents/skills/test-driven-development` 与 `.agents/skills/using-superpowers/references/codex-tools.md` 在当前共享技能树中不存在，形成不可满足的必需背景依赖。

## GREEN

- 新增 324 词的 `maintaining-skills`，保留调用方检查、精确 discovery、渐进披露、风险适配验证、跨运行时可移植性和供应链闭环。
- L1 / L2 / L3 继续由 `docs/process/harness-process-tailoring.md` 唯一定义；新技能不重复治理规则。
- 无分级外部仓库改为结构校验与针对实际风险的行为验证；只有复杂、脆弱或高风险时才使用独立 forward test，不再强制每个普通修改构造失败基线。
- 删除旧权威目录和全部附属资源，不保留兼容别名；生成新投影，并在独立审查发现 broken symlink 逃逸后删除六个旧投影。

## REFACTOR 与 fresh verification

- `python3 .../quick_validate.py`：初次因运行环境缺少 `PyYAML` 在导入阶段返回 `ModuleNotFoundError: yaml`；经用户确认在当前用户 Python 3.12 环境安装 `PyYAML 6.0.3` 后重新执行，返回 `Skill is valid!`。
- 等价结构检查：frontmatter、`name`、`description`、本机绝对路径检查通过。
- `wc -w .agents/skills/maintaining-skills/SKILL.md`：324。
- `scripts/sync-skills --check`：通过。
- `scripts/update-skill-lock --check`：通过。
- `scripts/verify-maintenance-intensity-scenarios`：通过。
- `scripts/verify-matt-yss-integration-scenarios`：通过。
- 退役投影反例：修订前 `scripts/sync-skills --check` 错误放行六个受 Git 跟踪的 broken symlink；修订后同一命令准确报告六个 `unlocked projection`，`scripts/sync-skills` 删除旧链接后检查通过。
- `.template-source/tooling/node/test/skill-supply-chain.test.mjs`：覆盖锁外受跟踪投影被拒绝、未跟踪 personal skill 不被误判的回归场景。
- `git diff --check`：通过。
- `scripts/verify-template`：通过。
- 排除 `wiki/raw/**` 与既有 review 历史证据后，现行资产不再引用 `writing-skills`。

## 独立审查

首次 `formal-independent` 审查返回 `blocked`：六个平台仍保留指向已删除权威目录的受跟踪 broken symlink，且同步检查错误放行。删除旧链接、修复同步检查器并增加回归场景后，同一独立审查者完成复审，结论为 `pass`，无阻断 finding。

## Maintenance checkpoint

```yaml
schema_version: 1
intensity: L3
classification_reason: 退役共享治理技能并改变无分级仓库的默认验证行为
triggers: [aggregate-behavior-change]
changed_assets:
  - .agents/skills/maintaining-skills/SKILL.md
  - .agents/skills/writing-skills
  - scripts/lib/skill-supply-chain.mjs
  - .template-source/tooling/node/test/skill-supply-chain.test.mjs
verification_evidence:
  - kind: red
    command: 独立只读外部仓库轻量 skill 压力场景
    result: pass
  - kind: green
    command: maintaining-skills 轻量替代与调用方迁移
    result: pass
  - kind: refactor
    command: 退役 broken projection 逃逸修复与回归测试
    result: pass
  - kind: pressure-scenario
    command: scripts/verify-maintenance-intensity-scenarios
    result: pass
  - kind: fresh-verification
    command: scripts/verify-template
    result: pass
  - kind: formal-independent-review
    command: formal-independent 复审 verdict=pass
    result: pass
review_mode: formal-independent
escalation: none
```
