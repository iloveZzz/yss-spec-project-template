---
name: release-management
description: 规划、预检和验证 yss-ui 多包发版，覆盖 release-changed 待发包检测、版本类型、changelog 门禁、CI 发布与发布后核验。
---

# 发版管理

## 触发条件

- 用户要求评估 patch/minor/major、查看待发包或检查发版条件。
- 用户要求发布 `@yss-ui/*`。
- CI 发布失败，需要定位版本、changelog、构建、npm 或推送问题。

## 不适用场景

- 只生成提交信息：使用 `../commit-linting/SKILL.md`。
- 只编写 changelog：使用 `../changelog-generation/SKILL.md`。
- 用户未授权发布、推送、创建 tag 等外部写操作：只做诊断和 dry-run。

## 硬约束（禁止/必须）

- 必须先检查当前分支、工作树、远程、待发范围和 CI 配置；禁止假设当前一定是 `dev`。
- 权威多包发布脚本是 `scripts/release-changed.js`，支持 components、hooks、theme、utils、skills-cli 和 skills。
- `scripts/release-smart.js` 只覆盖 components、hooks、theme 和 utils，不得用它预测或发布 `@yss-ui/skills`。
- 必须先执行 `node scripts/release-changed.js <bump> --dry [--base=<git-ref>]`，阅读待发包和目标版本，并修复所有 changelog 校验错误。
- patch 用于向后兼容修复，minor 用于向后兼容新能力，major 用于破坏性变更；存在歧义时必须请用户确认。
- 执行真实发布、推送、tag、触发 CI 前必须得到用户明确授权，并说明目标分支、远程和 bump 类型。
- 禁止在本地回显令牌、向输出打印 `NPM_TOKEN` 或手工拼接带凭据的远程 URL。
- 回滚优先发布新的修复版本；禁止默认执行 npm unpublish、删除远程 tag 或改写已共享历史。

## 标准代码骨架

```bash
git status --short
git branch --show-current
git remote -v
node scripts/release-changed.js patch --dry
pnpm validate:skills
pnpm type-check
pnpm test
pnpm build
```

只有用户明确授权真实发布时，才继续使用仓库 CI 已配置的发布流程。`ci-release.sh` 会调用 `release-changed.js`、更新包版本、发布并提交版本变更；不要在本地重复执行同一套写操作。

## 交付检查清单

- [ ] 待发包、比较基线、bump 类型、目标版本和 changelog 已经 dry-run 确认。
- [ ] 工作树没有未经确认的无关改动。
- [ ] Skills 变更已通过 `pnpm validate:skills` 并同步 `docs/skills`。
- [ ] 代码、测试、类型与文档构建检查结果已记录。
- [ ] 真实发布和推送已获得明确授权。
- [ ] 发布后已核对私服版本、CI 结果、文档站与发布通知。

## 失败兜底策略

- dry-run 找不到变更时，检查 base ref 和未提交工作树，必要时显式传入 `--base`。
- changelog 校验失败时，先使用 `../changelog-generation/SKILL.md` 补齐精确目标版本，不绕过门禁。
- CI 或 npm 发布失败时，保留日志并确认是否已产生部分版本；确定远程状态后再选择重试或新修复版本。
