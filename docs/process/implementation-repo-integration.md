# 实现仓库接入流程

本文定义研发管理仓库与外部实现仓库的集成方式。当前仓库默认作为研发管理仓库，承载 PRD、OpenAPI、Issue、架构、垂直切片、验证、发布和复盘；前端、后端和其他运行时代码默认保留在独立实现仓库中。

## 职责边界

| 仓库类型 | 职责 | 不负责 |
|---|---|---|
| 研发管理仓库 | 规格、契约、架构、切片、Issue 同步、验证记录、发布说明和复盘 | 长期拥有前端 / 后端源码、替代实现仓库 CI |
| 实现仓库 | 前端 / 后端代码、分支、MR / PR、CI、测试命令、构建和发布流水线 | 定义跨仓库产品规格和生命周期门禁 |

## 接入路径

| 场景 | 推荐路径 | 关键产物 |
|---|---|---|
| 已有后端工程 | `implementation-repo-onboarding` 只读扫描，记录工程基线、测试命令和偏离项 | 实现仓库登记、工程基线审查、验证命令 |
| 已有前端工程 | `implementation-repo-onboarding` 只读扫描，检查技术栈、OpenAPI client、设计 token 和页面规范 | 实现仓库登记、前端基线审查、验证命令 |
| 0-1 后端工程 | 先在 Harness change 中记录实现仓库决策，再使用 `yss-ddd-scaffold-generator` 生成外部后端工程 | 后端 Git 仓库、YSS DDD 基线、Harness 登记 |
| 0-1 前端工程 | 先记录实现仓库决策，再按 `yss-frontend-scaffold-generator` 使用 YSS 前端模板生成外部工程 | 前端 Git 仓库、前端模板基线、Harness 登记 |
| 跨仓库垂直切片 | 使用 `cross-repo-implementation-routing` 绑定 Harness change、后端 MR、前端 MR 和验证证据 | 跨仓库切片记录、fresh verification |

## 实现前工程存在性判定

进入业务实现前，必须先判断当前需求受影响的 frontend / backend 运行时代码工程是否已经存在且可复用。该判定必须写入实施计划、实现路由记录或切片 issue，至少回答：

- 当前切片是否影响 frontend、backend，或两者都影响。
- 对应实现仓库 / 本地工程是否已经存在。
- 已有工程是否满足当前 OpenAPI、设计系统、YSS DDD 或工程基线要求。
- 若不存在或不可复用，是否需要初始化 0-1 脚手架，以及初始化到哪个目标仓库或输出目录。

判定结论的路由规则：

- 后端受影响且不存在可用工程：先记录实现仓库决策，再路由 `yss-ddd-scaffold-generator`。
- 前端受影响且不存在可用工程：先记录实现仓库决策，再路由 `yss-frontend-scaffold-generator`。
- 前后端均受影响且均不存在可用工程：先分别完成前后端初始化，再进入垂直切片业务实现。
- 工程已存在但与当前目录约定或技术基线冲突：先停在 engineering baseline / implementation routing，补齐偏离说明和处理决策。

## 实现仓库登记

每个参与实现的仓库都必须有登记记录。推荐使用 `docs/templates/implementation-repo-registry-template.md`，至少记录：

- repo role：backend / frontend / fullstack / other。
- Git URL、默认分支、本地 worktree 或远端 MR / PR 链接。
- CI 系统、测试命令、构建命令。
- OpenAPI 接入方式、设计 token 接入方式。
- 已知偏离项、人审要求和补齐计划。

登记记录可以放在当前 change 的 `design.md`、build entry review、实施计划或 `docs/implementation/` 下的实现记录中，但必须能被垂直切片和阶段 checkpoint 引用。

若当前切片需要新建 0-1 工程，登记记录还必须额外说明：

- `scaffold_status`：existing / required / initialized。
- `scaffold_skill`：`yss-ddd-scaffold-generator` / `yss-frontend-scaffold-generator` / none。
- 初始化理由、目标输出目录或目标仓库，以及是否已经通过基线检查。

## 跨仓库切片规则

每个跨前后端切片必须绑定以下信息：

- Harness change：Issue change ID、垂直切片 ID、OpenAPI Freeze 记录。
- Backend：repo、branch、MR / PR、测试命令、验证结果。
- Frontend：repo、branch、MR / PR、测试命令、验证结果。
- Contract：OpenAPI spec 路径、生成类型或 API client 版本、契约验证命令。
- Release：发布说明、回滚点、观察信号。

推荐使用 `docs/templates/cross-repo-slice-template.md` 记录。没有前端或后端影响时，对应仓库字段必须标记 `not-applicable` 并说明原因。

## 0-1 后端工程

从零创建后端服务时，继续使用 `yss-ddd-scaffold-generator` 生成 YSS DDD 多模块骨架。生成前必须先记录：

- 目标 Git 仓库或本地输出目录。
- 项目名、基础包名、数据库类型、是否带示例代码。
- 是否初始化 Git、是否创建远端仓库、默认分支和 CI 策略。
- 与当前 Harness change 的绑定关系。

生成后必须使用 `yss-backend-scaffold-parent` 做工程基线检查，不得把脚手架 sample 代码当作业务实现交付。

## 0-1 前端工程

从零创建前端工程时，目标模板固定为：

```text
http://192.168.167.142:8081/Data-Middleground-Develop-Area/product-code/ai-frontend/yss-design/yss-frontend-template.git#template
```

模板基线：Vue 3、TypeScript、Vite、Qiankun、pnpm、Ant Design Vue、`@yss-ui/components`、`@yss-ui/hooks`、Orval。

生成前必须记录：app name、microapp name、base route、OpenAPI source、目标 Git 仓库或本地输出目录、是否初始化 Git。初始化 Git、推送远端或创建仓库必须得到用户明确授权。

## 阶段回流

阶段结束时，按 `docs/process/templates/stage-checkpoint-template.md` 回写：

- Harness 资产完成情况。
- 各实现仓库 MR / PR 和 CI 状态。
- 测试命令和 fresh verification。
- 安全人审点、阻塞项和下一步。

不得只在实现仓库 MR / PR 中保留结论；Harness 仓库必须保留可追溯的规格和验证证据。
