# YSSComet 使用手册

本文档面向需要在项目中使用 YSSComet 生命周期流水线的开发者、产品/架构协作者和 AI Agent 操作者。它解释如何从零跑通一条 feature pipeline，并说明何时使用 `stub`、`codex`、`hermes`、`trae` 等后端。

## 项目定位

YSSComet 是一套 OpenSpec x Comet x Superpowers 驱动的 AI 研发流程模板。它把需求、设计、构建、验证和归档拆成可检查的阶段，并通过 `.comet.yaml` 记录 pipeline 状态。

适用场景：

- 需要把需求、设计、实现、验证串成可恢复流程的项目。
- 需要让多个 AI 后端生成阶段产物，并由 guard 统一检查产物质量的项目。
- 需要在团队中沉淀 PRD、OpenAPI、设计方案、测试、Review、Retro 等文档资产的项目。

不适用场景：

- 只想运行一次性脚本、不需要阶段状态的临时任务。
- 不希望以文件产物作为阶段推进依据的流程。

## 核心概念

| 概念 | 说明 |
|------|------|
| OpenSpec | 契约层，主要承载 OpenAPI / spec 等可审查需求产物。 |
| Comet | 状态机层，用 `.comet.yaml` 管理 Open -> Design -> Build -> Verify -> Archive。 |
| Superpowers | 方法论层，用 TDD、review、debug、plan 等方式约束 AI 协作。 |
| pipeline | 一条 feature 或需求的生命周期实例，例如 `demo-feature`。 |
| stage | pipeline 当前阶段：`open`、`design`、`build`、`verify`、`archive`。 |
| artifact | 每个阶段生成的文件产物，例如 spec、plan、tests、review、retro。 |
| backend | 生成 artifact 的后端，例如 `stub`、`codex`、`hermes`、`trae`。 |

## 从零开始

### 1. 检查环境

```bash
scripts/ysscomet doctor
scripts/ysscomet doctor --json
```

`doctor` 会检查状态文件、目录、脚本权限、OpenSpec、Superpowers、后端 CLI、CodeGraph 和 git 状态。遇到 warn/fail 时，先参考 [troubleshooting.md](./troubleshooting.md)。

### 2. 创建 feature pipeline

```bash
scripts/ysscomet init-feature demo-feature --title "Demo Feature" --sprint "Sprint 1"
```

这会在 `.comet.yaml` 中创建一条 pipeline，初始阶段为 `open`。

### 3. 生成当前阶段产物

```bash
scripts/ysscomet run demo-feature
```

默认读取 `.ysscomet/config.yaml` 中的 `default_backend`；没有配置时使用 `stub`。`stub` 适合先验证流程是否通畅，不依赖真实 AI CLI。

指定真实后端：

```bash
scripts/ysscomet run demo-feature --backend codex
scripts/ysscomet run demo-feature --backend hermes
scripts/ysscomet run demo-feature --backend trae
```

### 4. 推进阶段

```bash
scripts/ysscomet advance demo-feature
```

`advance` 会调用 guard 检查当前阶段 artifact。检查通过后推进到下一阶段；失败时 pipeline 会保持或进入 blocked 状态，需要补齐产物后再重试。

### 5. 查看状态和下一步

```bash
scripts/ysscomet status demo-feature
scripts/ysscomet status demo-feature --json
scripts/ysscomet next demo-feature
scripts/ysscomet next demo-feature --json
```

`status --json` 适合给自动化或前端读取；`next` 只给出建议命令，不会修改状态。

### 6. 重复直到归档

标准循环：

```text
run current stage -> advance -> run next stage -> advance -> ... -> archive
```

完成后可查看历史和仪表盘：

```bash
scripts/ysscomet history demo-feature
scripts/ysscomet dashboard
scripts/ysscomet collect-metrics
```

## 后端选择建议

| 后端 | 推荐场景 | 备注 |
|------|----------|------|
| `stub` | 初次接入、CI smoke test、验证状态机流程 | 内置，无需外部 CLI，产物是最小可用草稿。 |
| `codex` | 需要真实代码/文档生成，且本机有 `codex` CLI | 当前推荐的真实后端默认选择。 |
| `hermes` | 需要兼容旧 Hermes 入口或团队已有 Hermes CLI | 同时支持常见别名 `hermess`。 |
| `trae` | 团队已有 Trae CLI，并希望用同一 harness 契约接入 | 缺失时 `doctor` 会给出 warn。 |

项目配置示例：

```yaml
# .ysscomet/config.yaml
auto_transition: false
context_compression: off
default_backend: stub
required_tools: openspec,superpowers
```

## TypeScript interactive shell

`packages/hermes-cli-ts` 是可选的 React + Ink 交互式 shell。它与 Python core 通过 `python -m hermes_lifecycle.rpc` 通信。

当前已支持：

```bash
npm --prefix packages/hermes-cli-ts install
npm --prefix packages/hermes-cli-ts run dev -- doctor
npm --prefix packages/hermes-cli-ts run dev -- doctor --json
```

发布后的同一套实现会提供三个入口：

```text
hermes doctor
codex doctor
trae doctor
```

三个入口共享命令逻辑，只根据启动名切换终端展示品牌。

## 继续阅读

- [CLI 参考手册](./cli-reference.md)
- [故障排查](./troubleshooting.md)
- [CLI 扩展开发指南](../development/cli-extension-guide.md)
- [Comet 状态机说明](../process/COMET.md)
- [Harness 多后端适配规范](../process/HARNESS-ADAPTER-SPEC.md)
