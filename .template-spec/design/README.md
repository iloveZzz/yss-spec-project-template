# 产品设计资产

完整 Spec 交付包含完整规格、原型设计及说明。核心操作与状态变化应可实际操作，纯展示可以静态设计，无 UI 用业务逻辑或状态原型；表达深度按风险选择。普通查询与局部修改只完成当前范围。技术设计、API、数据库与生产实现交研发。

产品流程、信息结构、内容、视觉及 UI 原型由 `yss-design-system` 负责；`prototype` 负责有边界的业务逻辑/状态试验；`prototype-review` 按实际产物复核。制作与复核方法分别见技能中的 `references/product-prototype.md` 和 `references/review-method.md`。不要求固定档位、先验审批或独立证据包。

读取项目已有 DESIGN.md、主题与组件约定。新标准列表默认 48px、表格正文 14/22，筛选与选择操作保持固定工具区；已有 36px 等规范不自动迁移。模板自带 Token 是设计起点，不能冒充目标项目已采用的规范；修改实际基线时再同步其受影响派生资源。新 Vue 高保真沿设计技能的固定来源与锁文件，不调用旧导出或封存脚本。

成果保存在已有或用户指定位置，无约定时新建任务目录，保护已有文件。说明规则/AC 与页面状态的对应、查看/运行方式、入口与退出、操作结果、异常恢复、模拟范围、实际检查和未覆盖项。可与 Spec 共用文件。

按需使用 [交互说明](templates/interaction-spec-template.md)、[状态矩阵](templates/state-matrix-template.md) 和 [复核记录](templates/prototype-review-checklist.md)，不是额外交付门禁。`design.md` 说明当前规范与映射；确认模板及 examples 保留历史约定，仅用于对应历史材料，不是新任务的默认步骤。

需要完整填写示范时，查看 [附件提交校验贯通示例](../../.agents/skills/yss-design-system/assets/spec-delivery-example/README.md)。它将同一份教学规则、Spec、Vue 原型和交互说明关联；作者资源需复制到新的空目录组装运行，不在技能目录安装依赖。模板中的业务信息、权限、流程、场景和采用版本按本次范围填写，简单内容可用短段落。
