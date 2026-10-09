---
name: yss-validation
description: "接入或排查 YSS Bean Validation、校验消息与校验错误映射；不存在的历史 EL 组件路由保持阻断。"
---

# yss-validation

执行路线消费当前 Profile 主控合同的 `request_triage.delivery_path` 与固定 CLI 的 `route` / `verify-daily` 结果。仅已启用且合格的 Spec、Backend、Frontend `daily` 使用同一 Ticket 的范围、验收、工程基线、实际测试与独立审查；本端写范围不扩大。缺政策或能力时保持正式路径，已有正式任务不得降级；本技能不授予执行授权。

处理 YSS Bean Validation 注解、消息资源和校验失败映射；先区分 DTO 校验与当前不可用的历史 EL/parser 请求。

## 平台与源码门禁

接入、修改、代码生成或提供精确类名/配置前，必须读取并执行 [共享平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，以 `--skill yss-validation` 校验当前路线已核验的精确平台线及匹配源码根（`daily` 来自同 Ticket 的已有工程基线，`governed` 来自批准的配置）；不因普通路径跳过源码检查。缺失、错配或漂移返回 `blocked`；不跨代回退，不在业务实现中升级、降级或替换组件。只读分诊可继续，但须标注未完成源码核验，不能据此宣称跨 Boot/JDK 兼容。

## 源码定位

按 [源码定位策略](../yss-skill-source-index-refresh/references/source-location.md) 确认真实位置，再从 [平台索引](references/source-index.md) 定位当前任务需要的源码。`yss-microservice-components/yss-component-validation-jsr303` 仅是模块路径提示。

## 工作流

1. 区分 JSR-303 注解校验与表达式/EL parser 请求。
2. 从当前路线已核验平台的索引核验实际 POM、校验消息资源、消费 Controller 注解及匹配的异常 Advice。当前模块 README 为空，不作为前置证据。
3. 当前组件仓不存在历史 `yss-component-validation-engine-parent`；表达式、LiteFlow EL 或 `ExpressParserFactory` 请求返回 `blocked`，先确认真实组件来源和生命周期影响，不以旧索引或通用知识生成实现。
4. 校验失败映射保持当前工程的 service/API 错误合同。
5. 消费工程基线选择 javax/jakarta，不自行升级 Java/Boot。MVC 输入校验放在 server/client，业务不变量由 service/core 验证；不生成 DDD Domain。HTTP 失败形态由 server 的合同测试验证。

## 能力边界

- `validation-jsr303` 当前聚合依赖与消息资源，没有本地 Validator、Advice 或自动配置 Java 实现。
- 历史 `validation-el-parser` / `ExpressParserFactory`：当前源码根不存在，状态为 `blocked`，不得作为可用 capability。

## 排障

- EL/parser 请求停止实施并确认真实仓库/模块，不假设已移除路径仍存在。
- 注解未生效时先检查 Controller/service 校验注解和 Spring validation starter 装配，不先改 parser 代码。
- 当前证据使用 POM、消息资源、Controller 注解和 `GlobalExceptionAdvice`。
- 表达式校验与 DTO 校验行为不一致时先确认对应模块，再路由问题。

## 验收

- 核验所需依赖或 starter 已进入实际工程。
- JSR-303 与不可用的表达式校验不混入同一整改。
- 不将类、parser 或配置归给不存在的历史模块。
- 校验错误保留中文业务用户可理解的消息。
- 新增包装前先复用工程既有约定。

## 修改边界

- 类名和配置 key 先核验当前索引与源码，不凭记忆补造。
- 使用组件已有扩展 seam，不以业务本地框架代码替换。
- 保持当前组件任务范围；扩展到其他组件须有用户要求或重新路由依据。

## 执行证据与新增影响

`daily` 将命中的组件来源、技术约束和真实测试/命令/退出码回填同 Ticket，接受独立审查；`governed` 保留原合同与正式结果协议。缺平台/源码事实、测试失败或超出当前范围的影响时停止受影响动作并回生命周期调查，未知或排除风险升级；不从本技能取得迁移、升级或新生产接入授权。
