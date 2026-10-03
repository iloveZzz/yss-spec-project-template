# YSS工程技能体系

YSS skills 是项目内置的工程规范技能，覆盖业务方案、UI、OpenAPI、后端工程、组件和编码规范。通用研发过程由 [[Matt技能体系]] 与生命周期入口协作承接，专项规则按实际影响加载。

核心技能负责生命周期控制或通用研发入口，默认可发现；专项技能由实现合同编译器根据影响面和实现合同选择。技能成熟度与文件存在、投影成功或可安装分别判断，路由必须消费 active 的 `.template-spec/agents/yss-skill-registry.yaml`。注册表当前使用 schema v3，负责身份、capability、任务模式、类型化依赖、分层、别名和默认可发现性；来源、hash 和投影完整性由 `skills-lock.json` 独立持有。

后端能力按技术设计、分层实现、wire/framework 契约、组件、工程初始化、平台治理与迁移分域。现行路由包括 `yss-technical-design`、`yss-domain`、`yss-application`、`yss-repository`、`yss-web-controller` 等；组件能力有缓存、当前用户、审计、Excel、分布式 ID 和韧性控制。具体平台线与组件绑定以注册表声明为准，来源索引禁止跨平台线兜底。

类型化依赖区分 `context-required`、`context-conditional`、`coordination-only`、`review-only` 与 `component-dependency`。闭包递归展开必需上下文，条件上下文按当前条件选择，其余三类不自动扩展实现技能；去重后保留所有选择原因。注册表中的 capability 与 Recipe 供 [[YSS路由与合同编译]] 消费。

现行锁定共享技能名包含 `yss-product-lifecycle`、`yss-implementation-contract-compiler`、`yss-research` 与工程专项技能。技能名派生摘录只证明清单，不用锁文件元数据变化推断技能正文发生变化。

维护共享技能只编辑 `.agents/skills`，使用 `maintaining-skills`，同步投影、更新锁文件并按影响面验证，见 [[技能投影与锁定]] 与 [[模板维护流程]]。公开发布清单由 `yss-public-skills.json` 冻结，`iloveZzz/yss-spec-dev-skills` 是单向发布投影。

## 来源

- `CONTEXT.md:39-43`、`CONTEXT.md:95-100`。
- `.template-spec/agents/yss-skill-registry.yaml:1-15`、`:16-57`、`:105-125`、`:136-177`。
- `skills-lock.json:780-792`、`:840-852`、`:879-891`（实际技能名；derived 输入）。
- `.template-source/agents/skills-maintenance.md:7-12`、`:24-30`、`:36-68`、`:112-120`。
