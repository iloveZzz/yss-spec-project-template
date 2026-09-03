# 后端工程师插件 Fresh Verification（2026-09-02）

## 范围

- 插件源：`/Users/zhudaoming/plugins/yss-backend-harness`
- marketplace：`/Users/zhudaoming/.agents/plugins/marketplace.json`（`personal`）
- 安装版本：`0.2.0+codex.20260902111226`
- 角色事实源：`docs/agents/digital-human-roles.yaml` 的 `role.backend-engineer`
- 维护类型：Codex 运行时适配器；不新增生命周期编排器、数字人角色、运行时或产品 Spec。

## 实际验证

| 检查 | 命令 / 结果 |
|---|---|
| 源插件结构 | `python3 /Users/zhudaoming/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py /Users/zhudaoming/plugins/yss-backend-harness` → pass |
| 安装缓存结构 | 对 `/Users/zhudaoming/.codex/plugins/cache/personal/yss-backend-harness/0.2.0+codex.20260902111226` 执行 `validate_plugin.py` → pass |
| Node 语法 | `node --check .../scripts/render_backend_prompt.mjs`（源与安装缓存）→ pass |
| 正例渲染 | 完整任务输入成功生成 `role.backend-engineer / Worker` 提示词，并包含 15 项动态 Core Skills、建议下一路由与 Workflow Execution Result 字段 |
| 缺失上游引用 | 缺失 `data_architecture_ref` → `blocked: data_architecture_ref 不能为空` |
| 技能漂移 | 提供不完整 `core_skills` 快照 → `blocked: drift: core_skills 与角色注册表 taskPackageDefaults 不一致` |
| 兼容角色名 | `role.backend-agent` → 输出 `role.backend-engineer`，并产生归一化告警 |
| 角色 / 路由 | `./scripts/verify-digital-human-roles`、`./scripts/verify-digital-human-roles-scenarios`、`./scripts/verify-skill-registry`、`./scripts/verify-skill-governance` → pass |
| 模板门禁 | `./scripts/verify-template-fast` 自动升级到 `release` profile → pass |
| Codex 安装 | `codex plugin add yss-backend-harness@personal` → installed, enabled |

## 结论

插件源与安装缓存一致，任务提示词会从目标仓库动态读取 `taskPackageDefaults`，合同 / 路径 / 上游边界缺失会 fail-closed。未执行真实后端工程的 `./mvnw`，因为本轮交付的是运行时插件，不是后端垂直切片实现；该验证责任仍由实际 Slice Contract 任务包承担。
