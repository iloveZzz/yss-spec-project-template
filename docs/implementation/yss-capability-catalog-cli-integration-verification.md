---
pipeline: yss-capability-catalog-backend-pilot
stage: post-merge-cli-integration
status: green-post-merge-release-pending
owner: ai
---

# YSS capability catalog 与 `create-yss-spec` 跨仓库集成验证

本记录把 Harness 模板仓库与外部 `create-yss-spec` CLI 的身份、技能投影和验证命令绑定起来。它只证明当前开发分支组合通过集成验证，不构成模板发布、CLI 发布或 VS-001 实施放行。

## 1. 路由结论

| 影响面 | 仓库 / 分支 | 当前提交 | 状态 |
|---|---|---|---|
| Harness template-source | `iloveZzz/yss-spec-project-template` / `codex/yss-skill-optimization` | `18dcbcf` | 已推送，模板门禁通过；验证内容来自 `cf65208` |
| CLI 初始化与模板同步 | `iloveZzz/create-yss-spec` / `main` | `87cd720` | 已合入主线，未发布 npm |
| backend runtime | `modeling-yss` | 不适用 | 本轮未修改 |
| frontend runtime | 不适用 | 不适用 | 本轮无 UI / frontend 影响 |

CLI 原实现分支：[create-yss-spec 分支](https://github.com/iloveZzz/create-yss-spec/tree/codex/yss-capability-catalog-cli-integration)。其内容已由 merge commit [`87cd720`](https://github.com/iloveZzz/create-yss-spec/commit/87cd720) 合入 `main`；GitHub PR #11 记录为关闭状态，但仓库拓扑确认该 merge commit 的第二父提交为 `7c68860`。当前仍未执行 npm 发布。

## 2. RED 基线

以 CLI `349a1cf` 为基线，在隔离临时目录执行初始化时观察到：

1. 生成的 `yss-project.yaml` 原样保留 `repository_mode: template-source`，生成项目无法通过 `project-instance` 身份路由。
2. 模板源中的 `.claude`、`.codex`、`.hermes`、`.pi`、`.trae` 共享 scaffold 目录是指向 `.agents/skills` 的 Git directory symlink；CLI 模板同步器只处理普通文件，导致生成项目缺少 Router 要求的顶层 scaffold projection。
3. CLI 旧测试仍断言已移除的旧 Spec 模板路径和过时的单数 `.codex/skills/to-spec` 路径，不能作为当前模板契约的有效回归测试。

RED 结论：旧 CLI 可以生成目录，但不能同时满足仓库身份契约、当前技能投影闭包和当前模板路径契约。

## 3. GREEN 修复

CLI `7c68860` 包含以下最小修复：

- `src/cli.js` 在渲染根目录 `yss-project.yaml` 时，将模板源身份转换为 `project-instance`；若模板未声明 `template-source` 则 fail closed。
- `template.manifest.json` 将 `yss-project.yaml` 纳入渲染路径。
- `scripts/sync-template.js` 展开仓库内部的 directory symlink projection，复制其对应的受 Git 跟踪文件；拒绝指向仓库外的模板投影链接。
- 初始化完成前执行 `scripts/sync-skills --check`、`scripts/update-skill-lock --check` 和 `scripts/verify-template`；身份和门禁失败时 fail closed。
- 模板同步先构建同文件系统 staging snapshot，再进行可恢复替换；复制失败不会删除既有 bundle，也不会读取仓库外 symlink 目标。
- `tests/init-cli.test.js` 更新当前 Spec / `.agents` 路径，并覆盖五类 projection root 的六个核心 backend scaffold skill、旧入口迁移和可选示例文档链接。
- `tests/sync-template.test.js` 覆盖内部 projection 展开与外部 symlink 拒绝 / 旧 snapshot 保留。

## 4. Fresh verification

### CLI 回归

在 CLI worktree 执行：

```bash
YSS_SPEC_TEMPLATE_REF=codex/yss-skill-optimization npm test
```

结果：`13 passed, 0 failed`。

### 生成实例

使用修复后的 CLI 生成临时实例：

```bash
node bin/create-yss-spec.js \
  --project-name 'Generated Pilot Green' \
  --business-domain 'YSS Backend' \
  --team-size 8 \
  --target-dir /tmp/create-yss-spec-pilot-review-green.kbWUwC/generated-project
```

实例检查结果：

- `yss-project.yaml`：`repository_mode: project-instance`；
- `docs/skills/yss-capability-catalog.yaml` 存在；
- `skills-lock.json` 存在；
- 五个 projection root 均包含六个核心 backend scaffold skill；
- `scripts/verify-template`：通过；
- `scripts/verify-yss-capability-catalog`：49 个 entrypoint，通过；
- `scripts/verify-yss-router-scenarios`：`YSS Router stage 7 scenarios passed`；
- `scripts/verify-lifecycle-scenarios`：五类生命周期与生命周期编排器压力场景通过。

### Harness 独立门禁

在 Harness `codex/yss-skill-optimization` 上已通过：

```bash
scripts/verify-template
scripts/verify-yss-capability-catalog
scripts/verify-yss-router-scenarios
scripts/verify-lifecycle-scenarios
```

其中 catalog 校验结果为 49 个 entrypoint。模板源仍保持 `repository_mode: template-source`；只有 CLI 生成实例转换为 `project-instance`。

## 5. 跨仓库交接字段

| 字段 | 值 |
|---|---|
| template_ref_for_test | `codex/yss-skill-optimization` |
| harness_commit_for_test | `cf65208` |
| cli_commit_for_test | `87cd720` |
| backend_change | `not-applicable`；不修改原始 dirty `modeling-yss`，不修改 Pilot runtime |
| frontend_change | `not-applicable` |
| API / OpenAPI change | `not-applicable` |
| release / rollback | 主线已合入但未发布 npm；发布前可回退发行 commit 或不纳入发行物 |
| independent_review | Standards：PASS；Spec：两个 P2 已闭合；CLI 实现者未担任最终审查 |

## 6. 未解除的阻断项

1. 合并后的 CLI `main@87cd720` 已完成 fresh verification，但 npm 发布尚未授权，也未执行。
2. Harness 与 CLI 尚未绑定发布 tag；当前仅完成主线 commit 级共同验证。
3. Issue #41 仍是 `ready-for-human`；VS-001 仍是 Router `blocked`，没有获得生命周期批准、当前 catalog 合同和 `ready-for-agent` 状态。

因此当前结论为：跨仓库 CLI 主线集成验证已 GREEN，但 npm 发布和 backend Pilot 实施仍受发布授权与生命周期门禁阻断。

## 7. 合并后 fresh verification

验证输入：`iloveZzz/create-yss-spec@main`，HEAD `87cd720`；Harness 模板引用：`codex/yss-skill-optimization`。

```bash
YSS_SPEC_TEMPLATE_REF=codex/yss-skill-optimization npm test
```

结果：`13 passed, 0 failed`，CLI package version 为 `2.0.0`。

从该主线 CLI 生成实例 `/tmp/yss-merged-main-instance.Vdx5Ep/project` 的结果：

- `yss-project.yaml`：`schema_version: 1`、`repository_mode: project-instance`；
- 初始化自动通过 `scripts/sync-skills --check`、`scripts/update-skill-lock --check`、`scripts/verify-template`；
- 生成实例 catalog：49 个 entrypoint；
- Router stage 7：通过；
- lifecycle 压力场景：通过；
- 外部 symlink 拒绝、失败保留旧 snapshot、旧入口直接断言：通过。

这证明 CLI PR 合入主线后仍与当前 Harness 契约兼容，但不证明 npm 包已发布或 VS-001 已获实现放行。
