---
pipeline: yss-spec-cli-init
stage: implementation-routing
status: draft
owner: ai
---

# yss-spec 模板初始化 CLI 实现路由记录

> 进入 `#13` 实现前的实现路由记录。该需求不涉及 frontend / backend runtime 工程，而是在当前模板源仓库内新增一个 npm CLI 包。

## 1. 输入材料

| 资产 | 路径 / 链接 | 状态 | 备注 |
|------|-------------|------|------|
| 垂直切片 Issue | [#13](https://github.com/iloveZzz/yss-spec-project-template/issues/13) | ready | 首个实现切片 |
| OpenAPI Freeze / 无 API 影响记录 | [docs/requirements/yss-spec-cli-init-prd.md](/Users/zhudaoming/Projects/yss-spec-project-template/docs/requirements/yss-spec-cli-init-prd.md) | ready | PRD 明确 OpenAPI 影响为无 |
| OpenSpec-style Spec Delta（条件必需） | 不适用 | not-applicable | 不涉及 API、权限、状态机、数据模型、跨端或高风险行为差异 |
| Design Review | [docs/requirements/yss-spec-cli-init-prd.md](/Users/zhudaoming/Projects/yss-spec-project-template/docs/requirements/yss-spec-cli-init-prd.md) | ready | 本轮作为轻量 CLI 工具，无额外架构阻断项 |
| 实现仓库 / 实现位置 | 当前仓库 | ready | 当前仓库明确承载 `packages/create-yss-spec/` |
| 前后端工程存在性判定 | backend / frontend not-applicable | ready | 本需求不是 frontend / backend runtime 实现 |
| `垂直切片 Issue 状态` | [#13](https://github.com/iloveZzz/yss-spec-project-template/issues/13) | ready | 可进入实现 |

## 2. 实现前门禁

| 检查项 | 结果 | 备注 |
|--------|------|------|
| PRD 验收标准已可追溯 | 是 | 父级 PRD 已发布并与 `#13` 关联 |
| OpenAPI Freeze 或无 API 影响记录已完成 | 是 | PRD 已明确“无 API 影响” |
| Spec Delta 已补齐或明确不需要 | 不适用 | CLI 初始化工具不需要 |
| Design Review 阻断项已关闭 | 是 | 无额外阻断项 |
| 垂直切片 Issue 已拆到端到端可验收 | 是 | `#13` 为可独立验证的主路径 |
| 实现仓库 / 实现位置已登记 | 是 | 当前仓库承载 `packages/create-yss-spec/` |
| 受影响 frontend 工程已存在可复用，或已完成初始化决策 | 不适用 | 不涉及 frontend runtime |
| 受影响 backend 工程已存在可复用，或已完成初始化决策 | 不适用 | 不涉及 backend runtime |
| 缺失工程时已路由到对应脚手架 skill | 不适用 | 不需要 `yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` |
| YSS skill 路由已完成 | 是 | 本轮无需 YSS frontend/backend 专项 skill；实现采用 `tdd` + `implement` |
| fresh verification 方式已明确 | 是 | 以 CLI 行为测试和 E2E 目录输出校验为主 |

## 3. YSS skill 最小集合

| 领域 | skill | 使用原因 | 是否必需 |
|------|-------|----------|----------|
| 前端 | none | 不涉及 YSS 前端 runtime | 否 |
| 后端 | none | 不涉及 YSS 后端 runtime | 否 |
| API / 契约 | none | 无 OpenAPI / API 影响 | 否 |
| 测试 / 验证 | `tdd`, `implement` | 先失败测试，再最小实现主路径 | 是 |

## 4. 外部实现仓库

| repo_role | git_url | default_branch | working_branch | MR / PR | CI | test_command | build_command | 状态 |
|---|---|---|---|---|---|---|---|---|
| backend | not-applicable |  |  |  |  |  |  | not-applicable |
| frontend | not-applicable |  |  |  |  |  |  | not-applicable |
| other | current-repo | main | current-branch | pending | pending | `npm test` | `cd packages/create-yss-spec && npm pack --dry-run` | ready |

说明：本需求属于模板源仓库内的 npm CLI 能力，不是 frontend / backend runtime 工程，因此作为 `other` 角色在当前仓库实现。

## 4.1 脚手架初始化判定

| 受影响端 | 是否已有可用工程 | 处理结论 | 使用 skill | 输出位置 / 仓库 | 备注 |
|---|---|---|---|---|---|
| backend | 不适用 | not-applicable | none |  | 不涉及 |
| frontend | 不适用 | not-applicable | none |  | 不涉及 |
| other / npm CLI | 否 | 在当前仓库内初始化最小 npm workspace / package | none | `packages/create-yss-spec/` | 由当前切片直接建立 |

## 5. TDD 与验证策略

| 层级 | 先失败测试 / 验证命令 | 通过标准 |
|------|------------------------|----------|
| Domain / Application | `npm test` 中的 CLI 行为测试 | 对外行为符合用户输入与模板规则 |
| API / 契约 | 不适用 | 无 API |
| 前端组件 | 不适用 | 无 UI |
| E2E / 关键路径 | `printf 'Acme Spec Repo\nInvestment Research\n12 人\n<TMP>/output\n' \| node packages/create-yss-spec/bin/create-yss-spec.js` | 关键元信息文件被渲染，输出目录不含维护性目录 |
| Package / 发布验证 | `cd packages/create-yss-spec && npm pack --dry-run` | tarball 包含 CLI 运行文件、manifest 与模板快照 |

## 6. 回滚点与风险

| 风险 | 回滚点 | 观察信号 | 负责人 |
|------|--------|----------|--------|
| 在仓库根初始化 npm 工程时影响既有模板文件 | 新增的 npm 工作区与 CLI 目录 | 根目录出现非预期配置漂移 | AI / 当前实现者 |
| 模板复制边界定义不清导致输出污染 | `render/copy/exclude` 规则清单 | 生成结果带入 `.codex`、`.git` 或维护目录 | AI / 当前实现者 |
| 主路径测试依赖文件系统副作用，失败定位困难 | CLI E2E 测试用临时目录 | 测试 flaky、输出目录残留 | AI / 当前实现者 |

## 7. 完成标准

- [x] 垂直切片 Issue 完整，且状态允许进入实现。
- [x] YSS skills 已最小化选择，没有绕过 Issue、OpenAPI Freeze / 无 API 影响记录或必要的 Spec Delta。
- [x] 受影响外部实现仓库已登记，并绑定分支、MR / PR、CI 和验证命令。
- [x] 受影响 frontend / backend 工程存在性已判定；缺失工程已完成脚手架初始化或明确阻塞原因。
- [x] 每个切片包含测试命令、验证方式和回滚点。
- [x] 需要人工确认的事项已记录范围、责任人和结论。

## 8. 下一步门禁

- 结论：Approved
- 下一步：TDD 实现 `#13`
- 阻断项：进入红灯测试前需确认测试 seam
