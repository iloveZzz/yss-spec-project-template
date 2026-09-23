---
name: yss-distributed-id
description: "接入或排查 YSS 分布式 ID 的 Segment、Snowflake、主键注入与迁移；旧 CosId/远程调用仅按既有平台线分诊。"
---

# yss-distributed-id

处理 `yss-component-distributed-id` 及 Leaf 消费项目的发号、主键填充与迁移。先从批准的 `platform_configuration.component_platform_line` 选择 [源码索引](references/source-index.md)；Boot 2 的历史能力不能推定为 Boot 3 可用能力。无批准合同的既有工程故障可只读分诊，不据此改策略或宣布兼容。

## 接入决策

1. 核对实际组件 GAV、平台线、依赖树及当前源码，再确定已有主键策略、注入模式和数据库约束。保持既有 Long 主键及调用方类型，策略变更单独评估数据和 API 影响。
2. Boot 3 的数值分布式发号使用本地 Leaf Segment / Snowflake；拦截器仍有 String UUID 分支，但它不是数值发号方案。CosId、Feign/远程注入及旧注解参数是迁移分诊线索，不作为新接入选项；Boot 2 维护以其独立源码索引为准。
3. Boot 3 默认 `local + Segment`：引入组件后核对 DataSource、JDBC 驱动、目标方言建表脚本及 `leaf_alloc`。不发号的应用应显式关闭注入及 Segment；选 Snowflake 时显式启用 Snowflake、关闭 Segment，并验证 worker-id 唯一、时钟回拨处理和节点重启行为。`local` 注入须且只能启用一种算法，不要把 ZooKeeper 当作当前 Snowflake 的默认依赖。
4. Segment 缺失标签策略、声明、step 和初始水位必须与真实业务表及既有分配记录一致。自动建标签不建表、也不读取业务表最大 ID；迁移前固定停写/切换边界，起点不得低于已分配号段上界，不重置 `leaf_alloc`。
5. 主键填充同时核对实体注解、插入方法和参数形态。`IdType.AUTO` 保留数据库自增；`ASSIGN_ID` 或显式 Segment/Snowflake 才走组件发号。已有非零值应保留；生成值与 `Long`、十进制 `String`、`Integer` 的转换及溢出必须验证，不能只凭注解推断批量入口已被拦截。

## 排障与验证

- 启动失败：按自动配置、注入模式、算法开关、DataSource、`leaf_alloc`、方言顺序定位。`disabled` 仅关闭自动注入；完全不用 Segment 时还须核对其算法开关。
- 重号/错号：核对跨服务业务 tag、控制表唯一键、当前水位、历史号段、Snowflake worker-id 与时钟；先保留现场，不用重建表或清空控制记录排障。
- 插入缺 ID：核对 `TableId`/生成策略、实体字段类型、当前公开批量方法及 MyBatis 参数包装是否经过拦截器；再检查消费者自定义 `IdentifierGenerator` 是否接管。
- 行为修改使用组件父 reactor 的根 `./mvnw` 验证启动、单条/批量主键、迁移边界和目标数据库方言；H2 不能证明生产方言。只读故障分诊与已执行验证分别记录。

当前源码入口与平台差异见 [能力与迁移说明](references/README.md)。不要从 Skill 的历史示例或旧资产复制生产源码；精确类名、配置和默认值以选定平台线的当前源码为准。

## 平台与源码门禁

接入、修改、代码生成或给出精确类名/配置前，读取 [后端组件平台与源码门禁](../yss-skill-source-index-refresh/references/backend-component-platform-compatibility.md)，从批准的 `platform_configuration.component_platform_line` 选择 `source-index.boot2-java8.md` 或 `source-index.boot3-java17.md`，并以 `--skill yss-distributed-id --platform-line <line> --source-root <matching-root>` 运行统一 freshness 校验。平台线与源码根不匹配、组件 tree 不一致、组件子树 dirty、索引缺少平台信号，或 Manifest / 组件 GAV 缺少 verified 兼容证据时返回 `blocked`；不得回退另一代索引，也不在业务实现中升级、降级或替换 YSS 组件。既有工程只读分诊可继续，但不得据此宣称跨 Boot/JDK 兼容。
