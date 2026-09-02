---
name: commit-linting
description: 在 yss-ui 组件库仓库生成、检查或执行 Conventional Commits 提交，并按真实变更范围选择 type、scope 与 changelog。
---

# 代码提交规范

## 触发条件

- 用户要求生成组件库提交信息、检查 commit 或执行提交。
- 准备发布 `@yss-ui/*`。
- commitlint 报告 type、scope、长度或格式错误。

## 不适用场景

- 前端业务仓库（微应用、React、monorepo 等）：使用 `../frontend-commit/SKILL.md`。
- Java 后端仓库：使用 `../java-backend-commit/SKILL.md`。
- 用户只要求审查变更，未授权执行 `git add` 或 `git commit`。
- 工作树没有与请求匹配的变更。

## 硬约束（禁止/必须）

- 必须先读取 `git status --short`、`git diff --stat`、`git diff` 和必要的 `git diff --cached`；禁止只根据用户的一句概述生成提交。
- 必须保留用户或他人的无关变更，禁止为方便使用 `git add .`。
- 只有用户明确要求提交时才能执行 `git add` / `git commit`；只要提交信息时仅返回文案。
- type 必须来自 `.commitlintrc.js`：`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`。
- scope 必须来自 `.commitlintrc.js`：`components|hooks|utils|theme|docs|scripts|config|deps|release|skills|mcp` 或完整包名；禁止把 `table` 等组件名当 scope。
- subject 和 body 必须使用中文；组件名放在 subject 的 `[组件名]` 中。
- `release-changed.js` 按包目录与派生输入决定待发包，不按 commit type 决定。配置了 changelog 的包在发版前必须有目标版本块；`@yss-ui/mcp` 仅因文档/Demo/Skills/规则变更而发版时，可由发版脚本自动插入「索引同步」块。
- 复核 staged diff 时若发现 `HOME_PRODUCT_HIGHLIGHTS` 或其保护快照变化，必须确认用户是否明确要求调整首页产品总体介绍；常规发版不得提交这类变化。
- 一个提交必须聚焦一个逻辑意图；多类无关变更必须拆分。

## 标准代码骨架

```text
fix(skills): [API Integration] 统一错误处理示例

- 移除 Hook 中重复的 message.error
- 补充 frontmatter、断链与文档同步校验
- 同步 Skills 更新日志
```

常用映射：

| 变更路径 | scope | changelog |
| --- | --- | --- |
| `packages/components/**` | `components` | `docs/changelog/components.md` |
| `packages/hooks/**` | `hooks` | `docs/changelog/hooks.md` |
| `packages/utils/**` | `utils` | `docs/changelog/utils.md` |
| `packages/theme/**` | `theme` | 当前无独立文件 |
| `packages/skills/**` | `skills` | `docs/changelog/skills.md` |
| `packages/skills-cli/**` | `skills` | 当前无独立文件 |
| `packages/mcp/**` | `mcp` | `docs/changelog/mcp.md` |
| `docs/components/**`、`docs/hooks/**`、`docs/utils/**` | `mcp`（派生索引） | `docs/changelog/mcp.md`（索引同步可由发版脚本自动补） |
| `.cursorrules`、`.dumirc.ts` | `mcp`（派生索引） | `docs/changelog/mcp.md`（同上） |

## 交付检查清单

- [ ] type 和 scope 通过 `.commitlintrc.js` 校验。
- [ ] subject 与 body 使用中文，首行不超过 100 字符。
- [ ] 提交描述与真实 diff 一致，没有夸大或遗漏。
- [ ] 已检查受影响包对应的 changelog 目标版本。
- [ ] 已运行 `pnpm test:home-releases`，且首页长期产品定位未被当次发版摘要替换。
- [ ] 暂存区只包含本次提交需要的文件。
- [ ] 执行提交后已核对 commit hash 和工作树状态。

## 失败兜底策略

- scope 不明确时，读取 `.commitlintrc.js` 并按主要变更包选择，不创造新 scope。
- 变更无法归入单一意图时，先给出拆分方案，不强行生成“大杂烩”提交。
- changelog 缺失时，先使用 `../changelog-generation/SKILL.md` 补齐并校验，不绕过发布校验。
