# DDD 脚手架平台选择

仅在入口所列条件命中时读取本文件。Markdown 链接相对本文件；行内 references/assets/schemas 路径相对 Skill 根目录。Skill 自带的 bin/scripts 命令从 Skill 根目录执行；明确注明 repository root 的包装命令仍从项目根目录执行。

## Spring Boot / Java 平台选择

调用本技能前由生命周期编排器展示 `scripts/backend-platforms` 的精确版本清单及兼容状态，并通过 `gate.backend-architecture-platform-approved` 把架构、Spring Boot、Java 和 YSS 父 POM/BOM 合并展示、取得真实用户确认；生成器不提问、不猜版本、不使用 `x` 或 `latest`。已有批准且当前的选择展示摘要后复用；既有工程核验并复用登记值，不触发该门禁。

- 精确候选版本与可选状态只读取 `scripts/backend-platforms` 和共享平台清单，不在此复制版本表；候选不等于可生成。
- 独立子项目可继承主项目组合或覆盖，必须逐项目确认（允许一次确认明确列出的项目）；同一 Maven Reactor 使用一个平台。
- 只开放共享兼容清单中已有真实 YSS 构建、依赖和启动证据的组合。缺少兼容父 POM、BOM、starter 或相应能力证据即 `blocked`；不替换官方组件、不降级回退。
- 新生成合同必须有 `platform_configuration` v2，与架构决策、Maven 坐标及兼容条目摘要一致。Boot、Java、YSS 坐标或依赖配方变化时回生命周期重新确认并编译合同；仅追加同配置验证记录不重复确认，仍核验证据有效性。
- Spring MVC、Servlet、Validation、Jackson 和 starter 坐标消费共享平台清单；Java 下限和允许组合由当前平台条目决定。Jakarta 转换不包括 `javax.sql` 等 Java SE API。
- 平台候选维护验证产物标记 `platform_verification=candidate`，不能交给业务生成、升级完成等级或进入首切片验证。测试夹具不证明 YSS 兼容。

版本清单、合同字段、候选验证和支持晋级规则见 仓库共享合同 `.template-spec/engineering/backend-platforms.md`。
