---
status: template
owner: ai
---

# <功能 / change> Build Architecture Checklist

> 本模板用于 垂直切片实现 前和每个垂直切片完成后，把系统架构、数据架构、ADR、工程基线、OpenAPI Freeze 结论和风险 / 回滚约束转译为可执行检查项。它不是替代架构文档，而是防止架构资产在 build 阶段失效。

## 1. 输入资产

| 资产 | 路径 | 状态 |
|---|---|---|
| 系统架构 |  |  |
| 数据架构 |  |  |
| ADR |  |  |
| 工程基线 |  |  |
| OpenAPI Freeze |  |  |
| 系统 / 数据架构设计 |  |  |
| 风险 / 回滚约束 | `AGENTS.md` |  |

## 2. 架构约束矩阵

| constraint | source | slice | status | evidence | follow-up |
|---|---|---|---|---|---|
| DDD 分层不得穿透：Domain 不依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO | 系统架构 / YSS DDD 规范 / `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 若发现穿透依赖，标记 `violation` 并停止 build，回到架构修正 |
| 后端切片必须回勾 `Backend Slice Implementation Contract`：required skills、允许写范围、禁止模式、证据文件、延期 seam 和验证命令完整 | implementation routing / 垂直切片 Ticket / `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 缺合同或合同不完整时暂停并记录替代方案 |
| Web Adapter / DTO：必须按 `yss-dto` 定义或复用 CMD / Query / VO / Result；不得在 Controller 内部类或非约定包临时定义主要 DTO，不得手工分页主要业务集合 | `yss-web-controller` / `yss-dto` / OpenAPI Freeze |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 命中时回到 Controller / DTO 设计 |
| Application：负责用例编排、事务边界和跨聚合协调，不承载核心领域规则 | `yss-backend-scaffold-application` / 系统架构 |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 领域规则下沉 Domain，事务边界留在 Application |
| Infrastructure：需要持久化的切片必须有 PO / Repository / Convertor / GatewayImpl；`InMemory*Gateway` 只能作为显式 `seam-deferred` | `yss-repository` / `yss-backend-scaffold-infrastructure` / 数据架构 |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 未补齐时不得声称生产持久化完成 |
| POJO / Convertor：DTO / VO / CMD / Query / PO / Domain Model 样板代码默认使用 Lombok；对象转换默认使用 MapStruct，禁止 `BeanUtils.copyProperties`、反射拷贝和重复手写字段赋值 | `lombok` / `mapstruct` / `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 未加载 skill、缺注解处理器配置、缺 Convertor 或无例外说明时标记 `violation` |
| 后端工程工具链：构建、测试、运行、OpenAPI 生成、CI 和 Release 命令必须使用项目根目录 `./mvnw ...`；裸 `mvn ...` 必须有受控例外记录 | `yss-ddd-scaffold-generator` / `yss-backend-scaffold-parent` / implementation routing |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 无例外记录时改为 `./mvnw ...`，否则不得进入完成 / 可合并结论 |
| 文档语言：持久化生命周期文档、实施记录、审查报告、发布说明和 Git checkpoint 正文必须使用中文，英文 skill / 模板不得原样落地 | `AGENTS.md` / `yss-product-lifecycle` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 仅保留必要英文技术标识、命令和 metadata |
| 高风险变更：认证 / 授权、SQL / DDL、迁移、加密、公共基础库 API 变更必须记录验证证据、责任人和回滚约束 | `AGENTS.md` |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  | 缺验证证据或责任人时不得发布或合并 |
|  |  |  | `implemented` / `seam-deferred` / `drift` / `violation` / `not-applicable` |  |  |

状态说明：

- `implemented`：已有代码、测试或文档证据证明满足约束。
- `seam-deferred`：允许临时 seam，但必须说明风险、补齐切片、责任人和验证计划；延期项不得无限期挂起。
- `drift`：实现与架构意图不一致，必须先做 Architecture Re-check。
- `violation`：违反架构约束或缺少风险 / 回滚证据，停止继续 build，回到设计审查或架构修正。
- `not-applicable`：当前切片不触碰该约束，并说明原因。

字段说明：

- `source`：回指系统架构、数据架构、ADR、OpenAPI Freeze、工程基线或风险 / 回滚约束来源。
- `constraint`：可检查的架构或治理约束。
- `slice`：绑定的垂直切片编号或名称。
- `status`：只能使用上方状态枚举。
- `evidence`：代码、测试、文档、Ticket 评论或人工确认证据。
- `follow-up`：延期、漂移或违反时的补齐落点和是否阻断继续 build。

## 3. 当前切片回勾

| 切片 | 已落实 | seam / 延期 | 漂移 | 违反 | 是否允许继续 |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 3.1 后端实现证据回勾

| 层级 | required_skills | 代码证据 | 测试 / 验证证据 | 状态 | 备注 |
|---|---|---|---|---|---|
| Adapter / Web | `yss-web-controller`、`yss-dto`、`mapstruct`、`lombok` |  |  | `implemented` / `seam-deferred` / `violation` / `not-applicable` |  |
| Application | `yss-backend-scaffold-application` |  |  | `implemented` / `seam-deferred` / `violation` / `not-applicable` |  |
| Domain | `yss-domain` / `yss-backend-scaffold-domain` |  |  | `implemented` / `seam-deferred` / `violation` / `not-applicable` |  |
| Infrastructure | `yss-repository` / `yss-backend-scaffold-infrastructure` / `yss-mybatis` / `mapstruct` / `lombok` |  |  | `implemented` / `seam-deferred` / `violation` / `not-applicable` |  |

## 3.2 后端门禁 smoke check

> 命中不等于必然失败；`SingleResult` / `PageResult`、`CMD` / `Query` / `VO` 是 `yss-dto` 合法产物。命中项必须说明是否复用了既有 DTO 体系、是否位于约定包路径、是否继承约定基类；无法解释或未回勾合同即为 `violation`。

```bash
rg -n "class (SingleResult|MultiResult|PageResult|Result)<|public static class .*(Command|Cmd|Query|VO)|subList\\(|InMemory.*Gateway|implements .*Gateway|extends .*Repository|@TableName|Mappers\\.getMapper|BeanUtils\\.copyProperties|copyProperties\\(|new [A-Za-z0-9]+VO\\(|new [A-Za-z0-9]+DTO\\(" apps/backend
rg -n "class .*(PO|DTO|VO|Cmd|Query)\\b|private final .* log =|LoggerFactory\\.getLogger|public .*(get|set)[A-Z]" apps/backend
```

### 3.3 流程规范 smoke check

```bash
rg -n '(^|[[:space:]])mvn[[:space:]]' <backend-repo-or-doc-paths>
```

命中裸 `mvn ...` 时，必须改为项目根目录 `./mvnw ...`，或在实现路由 / 审查报告中记录受控例外。中文文档规范通过人工审查正文、标题、结论和 checkpoint 说明确认；英文技术标识、命令和 metadata 不视为违规。

## 4. 人工审查点

| 风险事项 | 是否涉及 | 责任人 / 结论 | 证据 | 阻断结论 |
|---|---|---|---|---|
| SQL / DDL |  |  |  |  |
| 审计日志 |  |  |  |  |
| 文件上传下载 / 临时 URL |  |  |  |  |

## 5. 结论

- 是否允许继续 build：
- 必须先修正：
- 可延期到后续切片：
- fresh verification 命令：
