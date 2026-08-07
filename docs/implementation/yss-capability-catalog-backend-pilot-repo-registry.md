---
pipeline: yss-capability-catalog-backend-pilot
stage: implementation-repo-registry
status: candidate-lifecycle-review-pending
owner: ai
---

# `modeling-yss` Backend Pilot 实现仓库登记

> 本登记初始由 `implementation-repo-onboarding` 只读扫描产生。当前 Pilot 只在隔离 worktree / 分支推进；原 `modeling-yss` dirty 工作区不修改、不清理、不回滚。

## 1. 基本信息

| 字段 | 值 |
|---|---|
| repo_role | backend（仓库整体同时承载产品文档和 frontend，但本 Pilot 只登记后端） |
| git_url | `https://github.com/iloveZzz/modeling-yss.git` |
| default_branch | `dev` |
| local_worktree | 原工作区：`/Users/zhudaoming/Projects/modeling-yss`（保留 dirty）；Pilot worktree：`/Users/zhudaoming/Projects/modeling-yss-pilot` |
| pilot_branch | `codex/yss-capability-catalog-backend-pilot` |
| pilot_baseline | `4517193`（基于 `origin/dev` 的 clean checkpoint） |
| implementation_root | `apps/backend/asset-product-modeling-service` |
| scaffold_status | existing |
| scaffold_skill | `yss-ddd-scaffold-generator`（历史基线；本轮不重新生成） |
| scaffold_target_confirmed | 是；沿用既有工程，在隔离 Pilot 分支验证 |
| target_git_url_or_output_dir | 已有远端仓库；后端当前位于仓库内的 `apps/backend/asset-product-modeling-service` |
| owner | 待人工确认 |
| ci_system | none / 未在本地登记远端 CI |
| issue_tracker | GitHub：`https://github.com/iloveZzz/modeling-yss/issues` |
| Harness parent | [yss-spec-project-template Issue #41](https://github.com/iloveZzz/yss-spec-project-template/issues/41) |

### 只读发现

- 仓库根目录存在完整产品研发文档、后端多模块工程和前端工程；后端包含 Domain、Application、Infrastructure、Adapter / Web、Bootstrap 模块。
- 后端服务子目录存在 `mvnw`、`mvnw.cmd` 和 `.mvn` wrapper 资产，但仓库根目录没有 `mvnw`。这与“实现仓库根目录执行 `./mvnw`”的 Harness 约定不一致，暂作为 Pilot blocker。
- 原 `dev` 工作区有 14 个已修改文件、23 个未跟踪文件，共 37 个 Git 状态项；该工作区仍不作为 Pilot 基线，且未被覆盖、清理或回滚。
- 隔离 Pilot 分支已新增并推送 `yss-project.yaml`，声明 `schema_version: 1` 和 `repository_mode: project-instance`；身份清单提交为 `4517193`。
- 隔离 Pilot worktree 当前 clean，基于 `origin/dev` 建立；身份解析通过，Maven baseline 通过。
- 现有文档已登记 VS-001 至 VS-006 的 Backend Slice Implementation Contract、OpenAPI Freeze、TDD 验证和 code review 证据；这些是候选输入，不等于本 Spec 的新鲜跨仓库集成证据。

## 2. 推荐 Pilot 候选

| 项 | 结论 |
|---|---|
| 推荐切片 | VS-001：查询当前项目 / 产品域、分页查询产品模型列表、创建产品主数据模型草稿，重复创建返回冲突错误 |
| 推荐原因 | 贯穿 Domain、Application、Repository / Gateway、Web / DTO，边界清晰，有真实业务行为、可观察 API 和已有测试 seam，最适合验证核心 Backend skill 最小闭包 |
| 既有合同 | `docs/implementation/asset-product-modeling-vs001-backend-slice-contract.md` |
| 既有验证 | Domain / Application / Infrastructure / Web 测试、OpenAPI / Web 合规测试、PostgreSQL Testcontainers 验证均有历史记录 |
| 当前选择状态 | `candidate-lifecycle-review-pending`；身份和隔离分支已具备，仍需 slice Ticket、需求冻结、合同审查和 wrapper 边界确认 |
| 首轮 Pilot 约束 | 只验证路由、合同、TDD seam 和测试证据；不执行生产 migration，不接真实 IAM / SSO，不接生产审计 adapter，不修改原 dirty 工作区 |

VS-006 暂不作为首选：它触及导出 / 文件服务边界，真实文件服务、临时 URL、文件权限和下载审计仍延期，容易误触已退役的 `yss-file` 入口。VS-003 至 VS-005 涉及规则、评审、发布快照和更高风险状态 / 权限路径，待核心 Pilot 通过后再评估。

## 3. 命令与流水线

| 类型 | 命令 / 链接 | 本轮只读结果 |
|---|---|---|
| install_command | `not-applicable` | wrapper 和依赖缓存已存在；未执行安装或修改依赖 |
| test_command | `cd /Users/zhudaoming/Projects/modeling-yss-pilot/apps/backend/asset-product-modeling-service && ./mvnw test -DfailIfNoTests=false` | PASS；clean Pilot baseline 127 tests，0 failures / errors / skipped |
| build_command | `cd /Users/zhudaoming/Projects/modeling-yss-pilot/apps/backend/asset-product-modeling-service && ./mvnw -q -DskipTests validate` | PASS；clean Pilot baseline Maven validate |
| lint_command | `not-configured` | 使用 Alibaba Java code style 人工 / review 约束；未发现独立 Checkstyle / Spotless 门禁 |
| typecheck_command | `not-applicable` | Java backend |
| ci_pipeline | `unknown` | 远端 CI 尚未登记；发布前阻断 |
| wrapper_boundary | `candidate-gap` | `mvnw` 位于后端服务子目录，不在实现仓库根目录；须由 owner 决定保持既有例外或补齐统一入口 |

Maven 输出包含本机 `~/.m2/settings.xml` 的 `distributionManagement` warning、MapStruct processor warning，以及测试中预期的无 request 上下文日志；本轮命令最终成功，但这些环境噪声应在干净 Pilot 基线中重新确认。

## 4. 契约与设计接入

| 接入项 | 状态 | 证据 / 路径 | 缺口 |
|---|---|---|---|
| openapi_integration | 已接入 | `docs/api/asset-product-modeling-openapi-freeze.md`、冻结 OpenAPI、Controller contract tests | 需要绑定到 Harness #41，并在 Pilot fresh clone 中确认契约来源和版本 |
| generated_client | 部分接入 | 仓库已有前端 Freeze JSON / Orval 产物 | 本 Backend-only Pilot 不重新生成客户端；若切片扩大到 frontend，需跨仓库切片记录 |
| yss_backend_baseline | 部分接入 | 多模块 DDD 工程、Backend Slice Contract、YSS DTO / Web / Repository 纠偏记录、Pilot clean baseline | 根目录 wrapper、owner、远端 CI 和当前 catalog 合同重编译仍未完成 |
| domain_modeling | 已有历史证据 | VS-001 合同和 Domain tests | 当前合同使用历史 `yss-domain-modeling` 名称；新 Pilot 必须改按 catalog 的 `domain-modeling` + `yss-domain` 路由核对，不得重新引入退役入口 |
| repository_gateway | 已有历史证据 | PO、Repository、Convertor、GatewayImpl 和 Infrastructure tests | 需要用当前 catalog 重新编译依赖闭包，确认不加载 retired / nested entrypoint |
| web_dto | 已有历史证据 | Controller contract tests、YSS Web compliance tests | 需要用共享 scaffold Web / DTO entrypoint 做一次新鲜路由验证 |
| database_migration | 受控延期 | Liquibase changelog 和既有 follow-up 记录 | 首轮 Pilot 不执行生产 migration；如候选切片必须改变 schema，则退回候选选择或升级数据架构 / 人审门禁 |
| permission_and_audit | seam deferred | `yss-userinfo` mock system、Application policy、mock audit seam | 不作为首轮真实系统集成；须记录 `seam_deferred`，不得声称生产 IAM / 审计已完成 |

## 5. 已知偏离项

| known_gaps | 风险 | 补齐计划 | 是否阻断 |
|---|---|---|---|
| 原 `dev` 工作区 37 个 dirty 状态项 | 直接使用会覆盖用户正在进行的产品 / 原型修改 | 已建立独立 Pilot worktree；原工作区继续保留并不参与验证 | 否（原工作区不作为 Pilot） |
| `project-instance` 身份清单 | 已在 Pilot 分支提交 `4517193`；原 `dev` 工作区仍未改动 | 在 Pilot branch 上继续执行身份和流程验证 | 否 |
| `mvnw` 不在实现仓库根目录 | 与统一 `./mvnw` 验证约定不一致，容易在 Ticket / CI 中产生裸 Maven 或错误工作目录 | owner 确认外部实现仓库边界；保持例外时在 implementation routing 明确记录，否则补根入口 | 是 |
| 远端 CI 未登记 | 缺少独立构建、测试和发布证据 | 补 GitHub Actions 或等价 CI；发布前必须完成 | 是（发布） |
| 现有仓库同时承载研发文档与运行时代码 | 与 Harness / implementation repo 职责分离不完全一致，跨仓库回链边界模糊 | Pilot 先登记现有例外；后续决定是否迁移后端到独立仓库，未决前不扩大写入范围 | 是（新切片） |
| 历史合同使用已退役 `yss-domain-modeling` 名称 | 若直接复用会重新引入 retired entrypoint，导致 catalog / Router 漂移 | 用当前 `backend-vertical-slice` profile 重新编译 VS-001 合同；历史名称只作为迁移上下文保留 | 是 |
| source / test evidence 来自 dirty worktree | 现有 PASS 可能包含未提交修改，不能证明远端分支可复现 | 在干净 checkpoint 上重新执行 `./mvnw` 与合同验证 | 是 |

## 6. 人工审查

| 人工确认项 | 是否涉及 | 审查人 / 角色 | 结论 | 补齐落点 |
|---|---|---|---|---|
| DDL / SQL / 数据库迁移 | 是 | Architecture / DBA / Release | 首轮 Pilot 仅允许延期 seam；不允许把历史 Liquibase PASS 解释为生产执行放行 | VS-001 Pilot contract、Build Architecture Checklist、目标环境验证记录 |
| 权限接入 / 认证 / 授权 | 是 | Security / Architecture | mock system seam 可用于行为测试；真实 IAM / SSO 未完成 | `seam_deferred`、权限拒绝测试、后续安全 follow-up |
| 审计日志 | 是 | Security / Architecture | mock audit seam 已有；生产 adapter、保留和脱敏策略未完成 | `seam_deferred`、后续 `yss-audit-log` 专项评审 |
| 仓库身份与实现边界 | 是 | Harness owner / implementation repo owner | 身份清单和隔离分支已完成；仍需确认后端子目录 wrapper、文档/运行时代码同仓例外和 owner | `yss-project.yaml`、implementation routing、repo registry |
| 远端 CI 与发布 | 是 | Repo owner / Release | 未登记；不阻断本地只读 onboarding，但阻断 Pilot 发布结论 | CI 配置、stage checkpoint、release review |

## 7. Harness 回写

- 关联 Harness change：`yss-capability-catalog-backend-pilot`。
- 关联功能父 Ticket：[Issue #41](https://github.com/iloveZzz/yss-spec-project-template/issues/41)。
- 推荐垂直切片：VS-001；当前只登记为候选，不创建 `ready-for-agent` 子 Ticket。
- 当前阶段：实现仓库登记 / Pilot readiness，状态 `candidate-lifecycle-review-pending`。
- Pilot branch fresh baseline：
  - `cd /Users/zhudaoming/Projects/modeling-yss-pilot/apps/backend/asset-product-modeling-service && ./mvnw -q -DskipTests validate`：PASS。
  - `cd /Users/zhudaoming/Projects/modeling-yss-pilot/apps/backend/asset-product-modeling-service && ./mvnw test -DfailIfNoTests=false`：PASS，127 tests，0 failures / errors / skipped。
- 这些命令只证明 clean Pilot branch 当前基线可构建和测试通过，不构成 Slice Implementation Contract 放行；合同重编译、生命周期批准和独立审查前，不进入业务写入。

## 8. 下一步门禁

1. 确认 `modeling-yss` 的隔离 Pilot branch 作为 Issue #41 的外部 implementation repo。
2. 确认后端服务子目录 wrapper 和“文档 / 运行时代码同仓”的现有边界例外。
3. 为 VS-001 完成需求冻结、切片 Ticket 和当前 catalog 依赖闭包重编译。
4. 由生命周期编排器审查并批准新的 Slice Implementation Contract；替换历史 retired skill 名称，不消费旧合同。
5. 确认首轮不执行生产 migration、不接真实 IAM / SSO、不接生产审计 adapter，并将其写入 Build Architecture Checklist 与 `seam_deferred`。
6. 在 clean Pilot branch 上重新执行模板验证、Router / lifecycle 场景、后端 `./mvnw` 验证和独立 review；通过后再创建 `ready-for-agent` 垂直切片 Ticket。
