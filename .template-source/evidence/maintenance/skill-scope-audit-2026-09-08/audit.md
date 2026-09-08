# 专职子模板技能排查与修正

本记录已按逐项复核及 Q1–Q7 用户确认修订，取代上一轮“所有移除项均合理”的笼统结论。

本轮是 L3 模板维护，触发 `generation-semantics`、`cross-repo-contract` 与 `core-validator`。产品 Spec、产品原型、业务 OpenAPI、业务 TDD 和产品 context_reconciliation 为 not-applicable：未修改产品业务，只修订技能分发、职责路由与校验。根 CONTEXT.md 的模板合同继续适用。

## 已确认决定

用户通过本任务的 grilling Q1–Q7 分轮回复“应用推荐”。最终共同理解绑定 `request_user_input_async/call_nNcfEN7BxnAFAamT6OZl26he/0` 及其紧随的用户回复。

| 决定 | 确认范围 |
|---|---|
| Q1–Q2 | 按实际职责和调用方判断，允许纠正误删；测试全绿不能证明退役必要性 |
| Q3 | 后端保留仅用于状态、逻辑、算法和接口假设的 prototype 技术试验，不能代替生产实现门禁 |
| Q4 | 前端保留自身文档索引刷新；通用工具按实际用途作为维护/专项入口 |
| Q5 | 移除对侧实现安装，但保留跨端禁止声明与交接身份，不扩张本地执行闭包 |
| Q6 | setup-ts-deep-modules / data-analytics 默认不携带，明确需求时按需接入，不永久禁止 |
| Q7 | 确认下列完整修正清单；完成验证与记录，不提交、推送或发布 |

## 最终分发结论

| 子模板 | 共享技能 | 平台包 | 处理 |
|---|---:|---:|---|
| design | 25 → 25 | 1 → 1 | 保留 H1/H2 与条件化 React 原型；其技术代码用于设计评审 |
| backend | 104 → 71 | 2 → 0 | 32 项退出本地流程；prototype 收窄保留；TS 模块工具默认不携带 |
| frontend | 104 → 79 | 2 → 2 | 24 项后端实现退出；DTO 实现退出但提取参考；前端索引刷新收窄保留 |

这里的退役仅适用于各专职模板的本地执行和分发面。同名技能仍可在适用模板、综合模板或用户全局安装中存在；角色禁止声明防止全局可见技能被误当作本仓职责。

### 后端清单逐项覆盖

以下 32 项原 SKILL 入口均已从删除前 Git HEAD 核查。Vue 页面、组件、表单、客户端请求、浏览器下载、前端提交/脚手架、产品视觉原型及其评审归属于前端或 design；后端只读消费结果，因此可退出本地安装：

`component-selection-imports`, `file-export-download`, `formily-foundation`, `formily-linkage-effects`, `formily-mode-slot-detail`, `formily-step-flow`, `frontend-agent`, `frontend-commit`, `page-form-module`, `page-list-module`, `page-skeleton`, `prototype-page-acceptance`, `prototype-review`, `theme-token-usage`, `vue3-best-practices`, `yedit-table-usage`, `yss-antd-design`, `yss-api-integration`, `yss-components`, `yss-design-system`, `yss-formily`, `yss-formily-schema-generator`, `yss-frontend-scaffold-generator`, `yss-hook`, `yss-microapp-commit`, `yss-page-module-development`, `yss-prototype-stage`, `yss-ui`, `yss-use-table-height`, `yss-use-tree-height`, `ytable-usage`, `ytree-usage`。

| 边界项目 | 实际判定 | 保留或替代路径 |
|---|---|---|
| prototype | 不是前端专属；ask-matt 和 wayfinder 仍有真实调用，原删除造成缺口 | 恢复仅限后端逻辑试验的技能，调用方同步去除 UI 支路；不恢复 UI.md，不自动提交 Git |
| setup-ts-deep-modules | 通用 TypeScript 模块工具；当前后端主链无依赖 | 从永久排除清单移出；默认不携带，明确 TS 后端/工具链需求时接入 |
| product-design 平台包 | 产品视觉/交互/原型能力由 design 提供 | 不携带；后端保留设计包接收能力 |
| data-analytics 平台包 | 有数据质量、SQL 校验、Python 分析等通用能力，不能归为前端包 | 当前主链无调用，默认不携带；有专题分析需求时按需接入 |
| file-export-download / yss-api-integration | 浏览器下载与 Orval 客户端实现可退役 | 后端保留文件响应、冻结接口和 JSON/SHA-256 交接义务 |
| yss-prototype-stage / prototype-review | 产品原型构建和独立设计评审转交 design | 视觉基线验包保留在 scripts/lib/visual-baseline-contract.mjs，API 审查继续消费上游设计结论 |

### 前端清单逐项覆盖

以下 24 项已从删除前 Git HEAD 核查，内容为 Java 代码规范/处理器、后端切片/提交、DDD/MVC 层实现、服务端组件与后端框架/脚手架，不属于前端本地实现：

`alibaba-java-code-style`, `backend-agent`, `java-backend-commit`, `lombok`, `mapstruct`, `yss-application`, `yss-audit-log`, `yss-cache`, `yss-ddd-scaffold-generator`, `yss-distributed-id`, `yss-domain`, `yss-excel-mvc`, `yss-exception`, `yss-layered-mvc-scaffold-generator`, `yss-mvc-data-analysis-project-initializer`, `yss-mybatis`, `yss-repository`, `yss-resilience4j`, `yss-security-algorithm`, `yss-tactical-design`, `yss-up-springboot3`, `yss-userinfo`, `yss-validation`, `yss-web-controller`。

| 边界项目 | 实际判定 | 保留或替代路径 |
|---|---|---|
| yss-dto | Java DTO 生成退役，HTTP/JSON 响应包装、分页及方向知识仍必需 | 只读 profile 提取到 yss-openapi-governance/references；源仓、完整 revision、路径、SHA-256 独立绑定，恢复消费场景 |
| yss-skill-source-index-refresh | 原脚本混有真实前端维护能力，整体删除不合理 | 恢复前端专用刷新器，只更新已安装的六项前端技能；无需 Java 源仓、不写后端目录 |
| yss-userinfo | 服务端 AuthUserInfoUtil/JWT/头传播/Redis fallback 实现退役 | 登录态、认证头和权限体验继续消费已批准 API/UI 协议 |
| yss-validation | Bean Validation / JSR-303 / 服务端表达式引擎退役 | YFormily / UI 表单校验仍保留，不等于删除前端校验 |
| yss-exception / yss-security-algorithm / yss-resilience4j | Java 异常、加密和服务端降级实现退役 | 保留接口错误、客户端协议和恢复体验；新增前端加密协议需要独立前端实现合同 |
| yss-tactical-design | 后端 DDD 建模退出本地流程 | 前端通过 architecture-agent 执行 frontend-engineering-design；修订 requirements、迁移和交接文档的悬空指引，源包兼容字段不机械删除 |

## 依赖与校验修正

- canonical、六类 Agent 投影、lock、注册表 capabilities/recipes、派生 boundaries 按修正范围同步。
- 对侧技能作为 `cross-repo-reference`（design 兼容 `downstream-rd-profile`）保留于角色禁用/交接身份；不能成为本地 capability、可扩张依赖或编排执行路由。运行时即使收到伪装成 lifecycle 的全局跨端技能，也按 profile 拒绝。
- 默认不携带的通用能力列于 optional_skills；不与永久本地排除混用。
- 后端 JSON handoff 恢复原 SHA-256 断言；前端 DTO 消费场景迁移到保留的只读 profile 并重新加入验证组。
- 不恢复仅针对已退役生产能力的测试；历史任务包不改写，当前动态角色和任务包验证继续保留。
- 扩展排除测试覆盖每项 ID、全部运行时、lock 和 alias；补充可保留外部禁止声明、拒绝 capability/依赖扩张、正常本地执行及显式可选接入。
- 前端刷新器在临时目录测试完整六项、无 Java 源仓、缺失技能和越界链接；不把生成索引的时间戳当作已抓取最新文档的证明。
- wire profile 验证区分离线快照、固定提交与源工作树；校验不声称已抓取上游远程最新状态。

## Fresh Verification

本轮以下命令均已完成，实际退出码为 0：

| 范围 | 命令 | 实际验证档位 | 日志 |
|---|---|---|---|
| design | scripts/verify-template-fast | fast | correction-design-verification.log |
| backend | scripts/verify-template-fast | release（自动升级） | correction-backend-verification.log |
| frontend | scripts/verify-template-fast | release（自动升级） | correction-frontend-verification.log |
| 根仓 | scripts/verify-template-fast | fast | correction-root-verification.log |
| 前端参考来源 | scripts/verify-yss-dto-openapi-profile --source-root ../yss-harness-backend-agent | pinned-source-and-local-worktree | correction-wire-source-verification.log |

三个子模板的 Node 测试、前端 DTO 消费场景、前端刷新器测试及后端 JSON/SHA-256 交接场景均通过。原无 correction 前缀的验证日志仅保存第一轮历史结果，不能用于证明本轮修正。

## 复盘

上一轮把“目录清理完整”误当成“退役合理”，误删混合技能中的本端能力，并通过移除场景或削弱 marker 避开残留依赖。纠正方式是先逐项核查删除前职责和真实调用方，再区分实现技能、只读参考、可选维护工具与外部禁止声明；保留能力必须迁移等价验证，不能靠减项得到全绿。本轮已将这些区别落实到 profile、角色表、实际执行边界与负向测试。

## 交付边界

只修改本轮工作树，不提交、推送或发布。三个 CLI 固定快照要求完整源仓提交，尚未更新；源仓获授权提交后，再同步 design/backend/frontend CLI 并复验真实生成实例，不能宣称 npm 包已更新或可发布。原有 create-yss-harness-dev 工作区改动不在本轮范围。

## 修正后的退役清理复核

用户再次要求完成修正后清理已确认退役技能。本次在三个子模板实际工作树分别调用 `validateHarnessSkillScope(process.cwd())`，均退出 0：design 排除 54 项、保留 25 项共享技能；backend 排除 32 项、保留 71 项；frontend 排除 25 项（24 项后端实现及 DTO 实现）、保留 79 项。

已确认这些排除项不在 canonical、锁文件声明的各运行时投影、安装注册、能力主入口及可扩张执行依赖中；当前无额外残留需要删除。保留禁止声明和交接身份，不删除已恢复的技术试验、前端索引刷新与 DTO 只读参考。清理范围仍是三个专职子模板，不扩张到综合模板或用户全局技能；删除保存在工作树，未提交、推送或发布。

## 后续 GitHub 交付

用户已追加授权提交和推送，并升级三个 CLI。此前“不提交 / 快照待更新”为当时阶段边界；最新提交、版本、真实实例升级验证及公共核心修复见 [GitHub 交付记录](github-delivery.md)。
