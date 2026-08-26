# `create-yss-spec` 接管与模板同步跨仓库契约

本文定义模板源仓库与外部 `create-yss-spec` CLI 仓库之间的身份、资产边界、迁移、同步、验证和发布契约。

## 契约目标

- 模板源仓库保留 `repository_mode: template-source`。
- CLI 创建或接管的产品仓库写入 `repository_mode: project-instance`。
- CLI 只管理 manifest 声明的研发管理资产，不接管前后端运行时代码、业务目录、用户文件或 `.git`。
- `.gitmodules`、gitlink（mode `160000`）以及 `apps/` 下已挂载的实现仓工作树是用户资产，不属于受管文件；`attach` / `sync` 不得创建、覆盖或删除它们。
- 通过模板快照和 40 位 `templateCommit` 使每次初始化、升级和回滚可追踪。
- 新模板快照的实例门禁以 Node `>=22 <27` 运行；不得执行 `npm install`、`pnpm install` 或维护侧 vendor 构建。`scripts/vendor/` 必须随快照分发且可离线使用。
- 快照使用显式分发 allowlist 构建，不再等于 Git 跟踪树的隐式子集。根规则、共享 skills/projections、`docs/` 中的实例流程资产、`scripts/` 中的共享校验入口及 `scripts/vendor/` 属于分发面；根 `package.json`、`.cursor/environment.json`、模板源 CI、`.template-source/**`、源仓库 ADR、`wiki/`、`docs/reviews/` 和其他未登记顶层资源属于模板源资产。`.nvmrc` 与根 `.gitignore` 属于分发面。此前误随快照到达实例的文件，后续 `sync` 只 `remove-report`，不静默删除。

## 生命周期接口

### 空目录初始化

初始化必须把模板身份转换为 `schema_version: 1`、`repository_mode: project-instance`，并执行目标仓库的：

```bash
scripts/sync-skills --check
scripts/update-skill-lock --check
scripts/verify-template
```

### 已有项目 `attach`

```bash
npx create-yss-spec@latest attach \
  --target-dir . \
  --project-name "项目名称" \
  --business-domain "业务领域" \
  --dry-run
npx create-yss-spec@latest attach \
  --target-dir . \
  --project-name "项目名称" \
  --business-domain "业务领域" \
  --apply [--force]
```

`attach` 必须显式选择 dry-run 或 apply，已有 `.yss-template.json` 时拒绝并提示 `sync`。计划按 `missing`、`matched`、`conflict`、`unsafe` 分类；force 只能覆盖受管 conflict，不能绕过 unsafe 或迁移冲突。合法 `template-source` 可转换为 `project-instance`，合法 `project-instance` 保留并校验，非法身份在写入前阻断。

### 持续同步 `sync`

`sync` 只使用 CLI 包内置的模板快照。“最新”指用户执行 `npx create-yss-spec@latest` 所携带的最新已发布快照，不在运行时直接拉取模板仓库。普通同步新增缺失文件、更新 baseline 未被本地修改的文件、报告冲突和模板删除；`sync --force` 先备份再覆盖受管冲突，模板删除默认只报告。

完成后必须重新执行三个模板门禁；任一门禁失败时回滚文件变更并保持旧 metadata 版本。

模板把共享运行脚本从 Ruby 迁移到 Node 时，CLI 同步继续将模板删除按 `remove-report` 报告；不得静默删除既有实例的 `.rb` 文件。对新快照，CLI 必须验证公开入口、Node 版本失败信息、离线门禁和回滚均符合本契约。

## metadata v2

`.yss-template.json` 至少包含：

```json
{
  "metadataSchemaVersion": 2,
  "templateName": "create-yss-spec",
  "cliVersion": "2.1.4",
  "templateSource": "github:iloveZzz/yss-spec-project-template",
  "templateCommit": "<40-char-commit>",
  "managedFilesManifestVersion": "<manifest-hash>",
  "managedFiles": {}
}
```

`managedFiles` 是每个受管文件的 baseline。CLI apply 前把将被覆盖的文件保存到目标目录外的临时备份目录；验证成功后默认保留，失败按操作日志回滚，metadata 不更新。

## 实例分发清单

`template.manifest.json` 是模板源与 CLI 共享的分发清单。它必须同时声明允许进入快照的根文件、根目录和路径前缀，明确排除的源仓库路径及其例外文件，以及 init / attach / sync 的差异化受管边界。

未命中 allowlist 的新顶层文件默认不进入快照。`docs/adr/README.md` 是实例 ADR 入口，模板源 ADR 不进入快照；`.nvmrc`、根 `.gitignore`、共享 `scripts/` 和 `scripts/vendor/` 进入快照。旧实例已经存在的被排除路径只生成 `remove-report`，不得静默删除。

## 固定迁移规则

CLI 必须遵循 [Spec / Ticket 迁移指南](../../docs/user-guide/规格与任务迁移指南.md) 的固定映射：旧 Spec / Ticket skill 和模板入口迁移为当前名称，旧规格文件、根 `.scratch/<feature>/` 迁移到当前路径；无法推断功能归属的扁平 Ticket 标记为 `unsafe` 并阻断。新旧目标内容不一致时标记 `conflict`，不得静默覆盖。

## 跨仓库验收

| 场景 | 必须验证 |
|---|---|
| 空目录初始化 | `project-instance`、metadata v2、固定 commit、六类 projection 和模板门禁 |
| 任意已有项目 attach dry-run | 不写文件、不删除 `.git`，运行时代码和无关文件不变 |
| attach apply | 缺失资产新增；matched 纳入 baseline；conflict 需 force；unsafe 不可 force 绕过 |
| 旧资产迁移 | 规格 / Ticket 路径和根 scratch 安全迁移；目标冲突与扁平 Ticket fail closed |
| sync | 新增、更新、冲突、迁移和删除报告完整；force 只作用于受管文件 |
| post-sync | 三个门禁全部 fresh 通过；失败时文件和 metadata 回滚 |
| Node 运行时迁移 | Node 22 / 24 下 init、attach dry-run/apply、sync 都无需安装依赖；缺失或不兼容 Node 必须 fail closed 且回滚 |
| 遗留 Ruby | 新快照无活动 Ruby 脚本；既有实例遗留 `.rb` 仅 `remove-report`，不静默删除 |
| 发布包 | 固定 commit 下 `npm test` 和 `npm pack --dry-run` 通过，包内含 `template.snapshot.json` |

本变更只涉及模板治理和外部 CLI，不涉及 frontend、backend、OpenAPI 或运行时工程；这些范围为 `not-applicable`。

## 发布顺序与阻断条件

1. 模板恢复 `docs/process/*`、正式处理 `.qoder` 投影并通过 fresh verification，形成确定 commit。
2. CLI 绑定该 commit，完成 attach / sync 跨仓库测试和独立 review。
3. 运行固定 commit 的 `npm test`、`npm pack --dry-run`，确认包内快照和实例门禁通过。
4. 发布 CLI `2.1.4`，并回写版本、验证证据、备份恢复路径和回滚点。

模板引用仍为浮动 ref、任一共同验证失败、独立 review 未完成或打包失败时，只能声明“本仓库实现完成，跨仓库发布受阻”，不得声明整体可发布。本轮不执行 npm publish。
