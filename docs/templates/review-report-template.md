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

## 签字确认
