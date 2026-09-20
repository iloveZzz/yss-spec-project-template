# 适用检查输入

这张表只用于选择规则所有者；具体规则从工程锁定的 Skill 及其当前引用读取，不在这里复制实现规范。将适用条款展开到现有 `constraint_results`，不能仅按 Skill 名写一行“通过”。

| 影响 | 读取的 Skill / 事实源 | 检查重点 |
|---|---|---|
| 每个后端范围 | `alibaba-java-code-style`、工程基线、实际模块/包/类型 | Java 规范、敏感日志、实际依赖方向；测试对象必须存在 |
| DDD 核心领域 | `yss-domain`、批准战术设计 | 创建/重建、不变量、领域错误、值对象及行为测试；领域规则不依赖框架 |
| DDD Application 或 MVC service/core | `yss-application`、所选架构 Profile | 用例边界、事务、提交后副作用、幂等和失败恢复；不要求无事务需要的用例套空事务 |
| 持久化 | `yss-repository` 及选定 Repository Profile；MyBatis 命中时加载 `yss-mybatis` | 聚合加载与展示查询、PO/Mapper/XML/SQL、主键/审计、分页/批量、绑定/参数化和映射完整性；基类按能力选择 |
| HTTP 入口 | `yss-web-controller`、冻结 API | CRUD 与认证/回调/Cookie 等手工入口；Controller 不能绕过应用用例；异常翻译允许引用领域错误 |
| wire / 参数 / 错误 | `yss-dto`、`yss-validation`、`yss-exception` | 真实响应/分页/错误协议、Bean Validation、命名空间、敏感字段与冻结 OpenAPI 一致 |
| 映射 / 注解处理 | `mapstruct`、`lombok` | 显式字段策略、处理器版本、领域工厂重建；不强迫聚合开放 setter |
| 实际组件调用 | Registry 中对应组件 Skill 与精确平台源码索引 | cache、userinfo、audit、ID、Excel、resilience 等按能力加载；不因“审查全面”要求安装不用的组件 |
| 工程和平台 | `docs/engineering/backend-platforms.json`、当前工程基线、effective POM、依赖树 | 精确 JDK/Boot、父/BOM、starter、javax/jakarta 和源码索引；源码可编译不等于兼容认证 |

每个后端范围显式评估 `yss-web-controller` / `yss-dto` / `yss-domain` / `yss-application` / `yss-repository` / `yss-mybatis`。无持久化或 MyBatis 影响时分别说明原因；不可跳过适用项，也不可为了填表增加实现。MVC 不强制构造 DDD 聚合/Gateway；没有展示分页需求就不要求分页类。

架构检查按已登记模块、包和实际注解/类型职责识别，不能只搜索 `rest`、`*Controller` 或某固定后缀。已有 ArchUnit 检查若命中零类，记录覆盖缺口；只运行空测试不能证明存量工程合规。

精确组件 API 事实用相应 `boot2-java8` / `boot3-java17` 索引与源码核验；过期或缺失只允许标记未知并继续不依赖它的检查，不允许跨平台借证据。当前未认证候选不等于所有既有工程必须升级；复用有效登记，缺哪个证据就补哪个。
