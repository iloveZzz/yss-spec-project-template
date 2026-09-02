---
name: changelog-generation
description: 根据真实变更、Git 历史和待发包版本生成 YSS UI 更新日志；当修改 packages 下的组件、Hooks、Utils 或 Skills，或准备提交、发版时使用。
---

# 更新日志生成

## 触发条件

- 变更 `packages/components`、`packages/hooks`、`packages/utils`、`packages/skills` 或会驱动 `@yss-ui/mcp` 索引重建的文档/规则。
- 准备生成提交、发布版本或补齐历史 changelog。
- `release-changed.js` 报告待发包缺少目标版本日志。

## 不适用场景

- 只修改不会触发包发布的仓库配置，且发布脚本确认未检测到待发包。
- 只生成业务仓库提交信息：使用 `../frontend-commit/SKILL.md` 或 `../java-backend-commit/SKILL.md`。
- 尚未查看真实 diff 或不能确定影响范围。

## 硬约束（禁止/必须）

- 必须先读取 `git status --short`、`git diff --stat`、`git diff` 和对应包的 `package.json`，禁止只按 commit subject 猜变更。
- 必须以 `scripts/release-changed.js` 的包检测与版本校验逻辑为准；`release-smart.js` 与 CI 共用 `scripts/lib/release-packages.js` 的包集合（含 `@yss-ui/mcp`、`@yss-ui/skills`）。
- `@yss-ui/mcp` 仅因文档/Demo/Skills/规则变更而发版时，允许由发版脚本自动写入「索引同步」块；`packages/mcp` 运行时变更仍需人工撰写条目。
- 必须使用精确版本标题 `## vX.Y.Z` 和独立日期行 `` `YYYY-MM-DD` ``，禁止使用 `## [X.Y.Z] - date`。
- 必须保持目标 changelog 已有的分类语言、emoji 和分隔符风格。
- 每个条目必须能对应到真实 diff；禁止编造性能数据、API 能力、兼容性或用户价值。
- 当一个提交同时修改多个可发布包时，必须分别更新各自 changelog。
- 提交链接只能使用真实 commit hash 和仓库 URL；当前变更尚未提交时不得伪造链接。
- 首页 `highlight` 是长期产品总体介绍，不是版本摘要。常规 changelog/发版只允许生成器更新 `version` 与 `date`；除非用户明确要求调整首页产品定位，禁止修改 `scripts/lib/home-release-positioning.js` 及其受保护快照。

## 标准代码骨架

```markdown
## v1.2.5
`2026-07-31`

### 🐞 Bug Fixes

- **API Integration / Page Skeleton**: 移除业务 Hook 重复的错误弹窗，保持 mutator 统一提示并 reject 中断。

### 🔧 Build

- **Skills Validation**: 新增 frontmatter、断链、文档同步与错误处理合同校验。

---
```

确定目标版本时：

1. 先用 `node scripts/release-changed.js <patch|minor|major> --dry` 获取已进入 Git 范围的待发包版本。
2. 若未提交工作树变更导致 dry-run 未检出，读取目标包当前版本，按与 `release-changed.js` 相同的 semver bump 计算并在提交后重跑 dry-run 复核。

## 交付检查清单

- [ ] 变更包与 changelog 文件一一对应。
- [ ] 版本号与发布脚本逻辑一致，标题带小写 `v`。
- [ ] 日期使用当地发布日期，格式为 `YYYY-MM-DD`。
- [ ] 条目完整覆盖用户可见行为、修复和必要的构建变更。
- [ ] 每个描述都已用 diff 或测试证据复核，没有伪造 commit 链接。
- [ ] `pnpm test:home-releases` 通过，首页长期产品定位没有被发版摘要覆盖。
- [ ] `release-changed.js --dry` 不再报告缺少目标版本日志。

## 失败兜底策略

- 无法确定 bump 类型时，先列出 patch/minor/major 依据并请用户确认，不直接写入猜测版本。
- 历史不完整或找不到 release 基线时，显式传入 `--base=<git-ref>` 并记录选择依据。
- 变更与日志无法一一对应时，保留已确认条目并报告缺口，不用通用文案填充。
