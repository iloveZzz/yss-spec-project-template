---
name: release-workflow
description: 编排 yss-ui 从变更审查、changelog、校验、提交到 CI 发布的完整流程；用户说“准备发版”、“提交并发布”或要求全流程执行时使用。
---

# 发版工作流

## 触发条件

- 用户要求“准备发版”、“提交并发布”、“commit and push”或执行完整交付流程。
- 多个可发布包同时变更，需要串联版本、changelog 和 CI。
- 发版前需要检查是否遗漏文档、测试或提交范围。

## 不适用场景

- 只要求生成 commit message：使用 `../commit-linting/SKILL.md`。
- 只要求评估版本或诊断发版失败：使用 `../release-management/SKILL.md`。
- 用户未授权提交、推送或真实发布时，只执行只读检查与 dry-run。

## 硬约束（禁止/必须）

- 必须分开“审查/dry-run”、“修改文件”、“提交”、“推送/发布”权限，不得把一句“看看能不能发”解读为真实发布授权。
- 必须依次使用 `../changelog-generation/SKILL.md`、`../commit-linting/SKILL.md` 和 `../release-management/SKILL.md`，不得复制冲突的版本规则。
- 必须使用 `release-changed.js` 检测全部可发包；禁止用不包含 skills/skills-cli 的 `release-smart.js` 处理 Skills 发版。
- 必须选择性暂存本次文件，禁止 `git add .` 混入用户的无关改动。
- 提交前必须展示待提交范围和 commit message；推送前必须确认当前分支和远程。
- 真实发布必须使用仓库已有 CI/私服凭据，禁止读取并回显凭据。
- 首页 `HOME_PRODUCT_HIGHLIGHTS` 是长期产品定位，常规发版不得改成当次变更摘要；只有用户明确要求调整首页总体介绍时才能修改。

## 标准代码骨架

```text
1. 审查：git status/diff → 识别变更包与无关改动
2. 预演：release-changed.js <bump> --dry → 确认目标版本
3. 补齐：changelog、文档、测试和 Skills 同步文档
4. 验证：定向测试 → test:home-releases → validate:skills → type-check/test/build
5. 提交：选择性暂存 → 复核 staged diff → Conventional Commit
6. 推送：核对分支/远程 → 用户授权后 push
7. 发布：用户授权后触发既有 CI 流程
8. 验收：核对 CI、私服版本、文档站与通知
```

## 交付检查清单

- [ ] 变更范围、待发包、bump 类型与目标版本已确认。
- [ ] 所有需要的 changelog 版本块已补齐并通过 dry-run。
- [ ] Skills 源文件、references/examples 和 `docs/skills` 不存在漂移。
- [ ] 首页产品定位保护测试通过，生成结果只更新版本号和日期。
- [ ] 定向测试、类型、lint 和构建结果已记录。
- [ ] staged diff 只包含本次变更，commit message 通过 commitlint。
- [ ] 推送与发布均有明确授权，发布后状态已核验。

## 失败兜底策略

- 任一预检失败时，停在当前阶段修复并重跑，不跳过门禁继续发布。
- 用户未回答 bump、分支或远程等关键选择时，可继续做只读检查，不执行对外写操作。
- 发布已部分成功时，先记录已发布包与版本，再制定补发或修复版本方案，不盲目重跑。
