# 模板源 ADR 退役 fresh verification

- executed_at: `2026-08-31T12:44:47Z`
- implementation_actor_id: `worker.adr-retirement.2026-08-31`
- candidate_digest: `125efcdf5e0ef9f5c62a97af177b303ee7493ae0a5ac3d65f49980a6c240e808`

## 实际结果

| 检查 | 结果 |
|---|---|
| 父仓 `scripts/verify-template` | exit `0` |
| `submodules/yss-harness-dev-agent/scripts/verify-template` | exit `0` |
| `submodules/yss-strategic-design-harness/scripts/verify-template` | exit `0` |
| `submodules/create-yss-harness-dev` 测试 | exit `0`，56/56；completion 边界直接执行 `node --test tests/*.test.js`，避免 pretest 重写已提交 snapshot metadata |
| `submodules/create-yss-strategic-design` 测试 | exit `0`，6/6；completion 边界绑定远端稳定 commit，包含连续同步字节一致性回归测试 |
| 开发 CLI 稳定源同步 | 从 `https://github.com/iloveZzz/yss-harness-dev-agent.git#b7f7ad993760e2bb0bdf140a0daac92760f54837` 生成；快照提交并推送为 `d76420bf391638f4ee78c811553c2becf3ef21f1`；metadata 无本机路径和 `working-tree` |
| 战略设计 CLI 稳定源同步 | 从 `https://github.com/iloveZzz/yss-harness-design-agent.git#f2c5f5878589667919f9000913743a288580ef46` 生成；`docs/adr/README.md` 的退役边界变更进入 ignored 发布 post-image，`.template-source/adr/**`、模板源 README/wiki/校验器不进入该 profile；为关闭 prepack 漂移将生成器修复并推送为 `161a79e818ee17bef14f914d26ac698957dfea23`，见 `adr-retirement-design-cli-noop-sync-2026-08-31.md` |
| 战略设计 CLI `npm pack --dry-run` | exit `0`；prepack 前后 `template.snapshot.json` SHA-256 均为 `ecf9fe1adecf0b4c586fbad88e03b53b2f3360fad0a269ec2001c4cd0068483b` |
| 三个 `.template-source/wiki` 的 `lint-wikilinks.mjs` | exit `0`，各 23 篇；advise 已运行，`unreferencedRaws=0`、`suspects=0` |
| ADR 重新引入压力反例 | 无 ADR 时通过；加入 `9999-regression.md` 后按预期失败 |
| 父仓和四个目标子仓 `git diff --check` | exit `0` |

## 环境说明

旧 `submodules/create-yss-spec/template` 由 `root:staff` 持有且 mode `700`，本账号无法重建该旧 CLI 快照；本轮发布目标是 `create-yss-harness-dev` 与 `create-yss-harness-design`，二者均已从已推送的远端稳定 commit 重建并完成测试。该环境问题不影响五仓冻结候选，但不构成旧 CLI 的发布结论。
