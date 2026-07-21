---
pipeline: <feature-id>
stage: verify
status: draft
owner: ai
---

# 审查报告：<功能名称>

## 结论

Approved / Changes requested / Blocked

## 发现

| 严重级别 | 文件 / 位置 | 问题 | 建议 |
|---|---|---|---|
|  |  |  |  |

## 必须修复项

- [ ]

## Slice Implementation Contract 审查

> 按 Router 生成条件对称核验合同和执行结果。Reviewer 不得直接信任实现者自报的 `implemented`。

| 检查项 | 结论 | 证据 |
|---|---|---|
| `contract_id` / `contract_version` 与生命周期批准、持久化版本及 Ticket 引用一致；Router 未自行写入 `approved`、`ready-for-agent` 或 `completed` | pass / violation |  |
| Common、Frontend、Backend、Contract、Cross-repo 子合同按实际影响填写，不适用项均有原因 | pass / violation |  |
| `required_skills` 依赖闭包与实际影响对称；Application、MapStruct、Lombok、Alibaba 等强制依赖未遗漏 | pass / violation / not-applicable |  |
| 每个工作单元绑定唯一 `behavior-tdd` 或 `controlled-generation`；业务行为未混入机械生成 | pass / violation |  |
| `behavior-tdd` 有已确认公开 seam、RED 和 GREEN 证据；`controlled-generation` 有例外原因、输入、预期文件、验证命令和生成后行为测试 | pass / violation / not-applicable |  |
| 每个 YSS Skill Execution Result 引用当前合同版本和 work_unit_id，且状态枚举有效 | pass / violation |  |
| `changed_files` 全部位于 `allowed_write_paths`，没有未授权仓库或目录写入 | pass / violation |  |
| `expected_evidence_files` 已存在且可追溯到工作单元；不存在只写“符合 YSS”的自报结论 | pass / violation |  |
| verification result 包含实际执行命令、结果和时间；只列计划命令不算 fresh verification | pass / violation |  |
| `seam_deferred`、`deviations`、`new_impacts`、`drift` 和 `violation` 已分别处理，没有被错误汇总为完成 | pass / seam-deferred / drift / violation / not-applicable |  |
| 非空 `new_impacts`、被推翻的 `not-applicable` 或合同关键变化已使相关工作单元 / 合同变为 `stale`，并进入完整重路由或生命周期回退 | pass / violation / not-applicable |  |
| `Build Architecture Checklist` 已绑定同一合同版本和 Execution Result，并记录 Architecture Re-check / 回退结论 | pass / violation |  |

子合同对称审查：

| 子合同 | 重点检查 | 结论 | 证据 |
|---|---|---|---|
| Common | 影响面、skill、路径、禁止模式、证据、验证、人工审查、完整重路由触发 | pass / violation |  |
| Frontend | 批准原型、状态矩阵、冻结客户端、组件 seam、E2E 路径 | pass / violation / not-applicable |  |
| Backend | 分层、Application / 事务边界、持久化策略、禁止模式、证据、延期 seam、Wrapper 验证命令 | pass / seam-deferred / violation / not-applicable |  |
| Contract | API 影响、Freeze / no-impact、生成客户端、契约测试、重生成命令 | pass / violation / not-applicable |  |
| Cross-repo | 仓库、交付顺序、集成验证和回滚顺序 | pass / violation / not-applicable |  |

## YSS 后端门禁审查

> 涉及后端切片时必填；不涉及时写 `not-applicable`。任何 `violation` 都阻断完成 / 可合并结论。

| 检查项 | 结论 | 证据 |
|---|---|---|
| 已存在 `Backend Slice Implementation Contract`，且 required skills / allowed paths / forbidden patterns / evidence / seam / verification 完整 | pass / violation / not-applicable |  |
| `yss-domain` / `yss-backend-scaffold-domain` 已按影响面落实，Domain 不依赖 Adapter、Infrastructure、Mapper、Controller 或 Web DTO | pass / violation / not-applicable |  |
| `yss-backend-scaffold-application` 已按影响面落实，Application 只做用例编排、事务边界和跨聚合协调 | pass / violation / not-applicable |  |
| `yss-repository` / `yss-backend-scaffold-infrastructure` 已按影响面落实，需要持久化的切片有 PO / Repository / Convertor / GatewayImpl | pass / seam-deferred / violation / not-applicable |  |
| `yss-web-controller` / `yss-dto` 已按影响面落实，CMD / Query / VO / Result 按既有 DTO 体系定义或复用，Controller 不用内部类或非约定包临时承载主要 DTO / VO、不手工分页主要业务集合、不穿透 Repository | pass / violation / not-applicable |  |
| `mapstruct` 已按影响面落实，PO / Domain Model / DTO / VO / CMD / Query 转换使用 MapStruct Convertor / Mapper，未使用 `BeanUtils.copyProperties`、反射拷贝或重复手写字段赋值；例外已记录测试和补齐落点 | pass / violation / not-applicable |  |
| `lombok` 已按影响面落实，POJO 样板代码使用 Lombok，未成片手写 getter/setter、constructor、builder、logger；实体 / POJO 未触发 `@Data` 等反模式或已说明例外 | pass / violation / not-applicable |  |
| `alibaba-java-code-style` 已纳入审查，命名、异常、日志、ORM/MyBatis、Maven、MapStruct / Lombok 注解处理器配置、安全项无 blocker | pass / violation / not-applicable |  |
| 后端构建 / 测试 / OpenAPI / CI / Release 命令使用项目根目录 `./mvnw ...`；裸 `mvn ...` 已改正或有受控例外记录 | pass / violation / not-applicable |  |
| 持久化文档正文、章节标题、审查结论和实施说明使用中文；英文模板内容未原样落地 | pass / violation / not-applicable |  |
| `Build Architecture Checklist` 已回勾，延期项、漂移项、违反项有明确处理结论 | pass / violation / not-applicable |  |

### 后端 smoke check

```bash
rg -n "class (SingleResult|MultiResult|PageResult|Result)<|public static class .*(Command|Cmd|Query|VO)|subList\\(|InMemory.*Gateway|implements .*Gateway|extends .*Repository|@TableName|Mappers\\.getMapper" apps/backend
```

命中说明：`SingleResult` / `PageResult`、`CMD` / `Query` / `VO` 命中不等于失败；需要说明其是否来自 `yss-dto` / 项目既有体系、是否位于约定包路径、是否继承约定基类。

| 命中 | 解释 | 结论 |
|---|---|---|
|  |  | expected / seam-deferred / violation |

## 压力场景验证

| 压力场景 | 预期 | 本次结论 |
|---|---|---|
| Agent 尝试用 Controller 内部类承载主要 CMD / VO 或私自新建 Result 包装 | 应被标记为 `violation`，回到 `yss-web-controller` / `yss-dto` 复用 / 定义约定 DTO |  |
| Agent 尝试用 `BeanUtils.copyProperties`、反射拷贝或大段手写字段赋值完成 POJO 转换 | 应被标记为 `violation`，回到 `mapstruct` 补 Convertor / Mapper，或补受控例外、测试和 review 证据 |  |
| Agent 尝试成片手写 getter/setter、constructor、builder 或 logger | 应被标记为 `violation`，回到 `lombok` 补注解，或补受控例外、测试和 review 证据 |  |
| Agent 尝试用 `InMemory*Gateway` 完成正式持久化 | 只能 `seam-deferred`，必须有补齐切片和风险说明 |  |
| Agent 只写“符合 YSS”但没有 skill / 文件 / 测试证据 | 应被标记为 `violation` |  |
| Agent 在后端验证、CI、README 或发布说明中写裸 `mvn ...` | 应改为项目根目录 `./mvnw ...`，否则标记为 `violation` |  |
| Agent 将英文 skill / 模板的标题和说明原样输出为项目持久化文档 | 应改为中文正文和中文章节标题，否则标记为 `violation` |  |
| Agent 修改合同允许路径之外的文件，或缺少预期证据文件 | 应标记为 `violation` 并阻断 build |  |
| Agent 把状态机、权限、事务或错误映射放入 `controlled-generation` | 应拆分为 `behavior-tdd` 工作单元并触发完整重路由 |  |
| Agent 返回非空 `new_impacts` 后继续编码或补写旧合同 | 应暂停相关工作单元，将合同标记 `stale`，回到 Router 或更早生命周期阶段 |  |
| Agent 只列验证命令但没有实际结果和执行时间 | 不构成 fresh verification，不得给出 Approved / 可合并结论 |  |

## 签字确认
