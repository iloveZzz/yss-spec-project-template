# 资料查询：局部设计草案

本草案只改善资料名称的换行与无查询结果时的下一步说明，复用 `fixture/existing.html` 的既有页面。仓库身份为 `template-source`；全部产物为可丢弃、test-data-only 的设计评测 fixture，不推进产品生命周期，不创建真实批准，不表示设计已通过。

## 设计依据与候选判断

- [任务简报](../fixture/brief.md)：既有模式已确认，只允许局部改进；只适用 `primary`。
- [既有页面](../fixture/existing.html)：标题、查询表单、结果数量、四列表格的顺序与结构基线。
- [固定数据](../fixture/data.json)：三条给定资料，保留完整名称、编号、负责人和状态。M-003 的负责人仍以“未填写”展示；checks、errors、updated 保留在随包数据中，不增设显示列，不使用当前系统时间改写数据。
- [根 CONTEXT.md](../CONTEXT.md)：消费现有术语，不登记虚构业务词汇。
- [根 DESIGN.md](../DESIGN.md) → [设计治理说明](../.template-spec/design/design.md) → [默认 Token 快照](../.template-spec/design/tokens/tokens.default.json)及 [CSS 派生视图](../.template-spec/design/tokens/variables.css)：保留浅色、默认密度及既有 Token。
- 使用当前 [yss-prototype-stage](../.agents/skills/yss-prototype-stage/SKILL.md) 的 [档位路由](../.agents/skills/yss-prototype-stage/references/prototype-profile-routing.md)、[HTML 适配器](../.agents/skills/yss-prototype-stage/references/product-design-adapter.md)、[离线实践](../.agents/skills/yss-prototype-stage/references/html-prototype-practices.md)，以及 [yss-design-system](../.agents/skills/yss-design-system/SKILL.md) 的 [执行规范](../.agents/skills/yss-design-system/references/design-system.md)。说明按[文档写作指引](../.template-spec/process/document-writing.md)记录操作、反馈和未验证项。

候选方案：`not-applicable`。简报明确不重新 ideation；既有页面已给出布局、查询方式、字段顺序和 Token，没有新的视觉方向或信息架构决定。仅沿原页面形成一个局部修改版本，不新增导航、详情、编辑、审批或导出。

本草案采用 H1 `visual-review` 的制作深度，`component_basis=html-css-js`，`runtime_build_required=false`。决策问题是：长名称能否完整阅读、空结果说明能否引导用户继续查询。此次不涉及失败恢复、权限变化或并发冲突。H1 是草案的适用档位，不是评审或门禁通过结论。

## 页面与修改边界

页面仍为“资料查询”：标题 → 名称或编号 / 查询 / 重置查询 → 结果数量 → 编号 / 资料名称 / 负责人 / 状态。查询表单原样保留，业务数据与字段顺序不变。

| 修改 | 具体做法与理由 |
| --- | --- |
| 长名称换行 | 仅对第二列取消 `nowrap`，允许连续长文本在可用宽度内折行；不省略、不截断，也不依赖悬浮提示阅读全文。表格保持原来的自动列宽，不设置新固定列宽。 |
| 空结果说明 | 原“暂无数据”改为“共 0 条。未找到匹配资料。请修改名称或编号后点击‘查询’，或点击‘重置查询’查看全部资料。”页面实际使用中文双引号。保留用户输入，不将空结果说成接口失败或权限不足。 |
| 窄屏容纳 | 表格最大宽度受容器约束；编号、负责人、状态仍不换行。名称列按剩余空间折行。极窄时只允许表格区域横向滚动，保留四列，不转卡片或隐藏字段。输入框限定最大宽度，表单沿原有文档流自然折行。 |
| 场景重置 | 表格后的独立评测区域提供“重置场景”，恢复空查询和三条原始资料，并反馈“已重置场景：primary”；不放入业务查询表单。 |
| 语义与焦点 | 结果说明使用礼貌播报的状态区域，表头带列语义，表格滚动区可键盘聚焦；焦点色使用已有高对比主控件 Token。 |

原有字号、页面内距、单元格内距、控件最小高度及原生控件外观均沿用。没有为适配设计系统重新绘制标题、按钮或表头。新增样式引用项目变量，不重定义 Token；`tokens.css` 为原 CSS 派生视图的完整字节副本，只使用默认浅色，不启用 dark/compact。规范与 Token SHA-256 记录在 [资源清单](yss-prototype-adapter.json)。

语义映射保持轻量：原生 form/input 对应查询输入，button 对应查询与重置，table 对应列表，status 对应结果反馈；不加载生产 YSS 或 Ant Design 组件。没有新增 API 字段、分页、权限或并发规则，API 反推在本次局部 fixture 中不适用。

## 状态与场景

直接打开 [index.html](index.html#scenario=primary)，或将整个 `drafts/` 复制后离线打开。运行资源均为同目录相对路径和普通脚本；数据随包加载，无网络请求、依赖安装、构建步骤或本地存储要求。

| 当前状态 / 事件 | 条件与动作 | 可见结果与退出路径 |
| --- | --- | --- |
| primary 初始化 | `#scenario=primary`，查询初值为空 | 共 3 条，完整显示三条给定资料。无 hash 时同样进入 primary。 |
| 查询 | 点击“查询”或在输入中按 Enter；沿用原页对 `(编号 + 名称)` 的大小写敏感子串匹配，不 trim、不新增规则 | 有匹配时显示数量和匹配行；编辑输入不会提前刷新，需再次提交。 |
| empty | 提交不匹配的关键词，例如“无匹配资料” | 共 0 条、保留表头、显示下一步说明；保留关键词。修改后查询，或使用原“重置查询”退出。 |
| 重置查询 | 原生 reset 恢复空输入后刷新结果 | 恢复共 3 条；可再次查询。 |
| 重置场景 | 任何查询状态下点击“重置场景” | 清空输入、恢复三条资料、归零表格水平滚动，更新评测提示；可重复触发。 |
| failure / no-permission / conflict | `not-applicable`：简报无失败、权限或写入冲突场景 | 不提供这些场景按钮；未知 hash 回退 primary，不伪造业务错误或权限状态。 |
| loading / disabled / dirty / 写入 success | `not-applicable`：仅同步查询固定数据，无提交写入 | 不添加假的异步加载、校验或保存状态。列表只读沿用原页。 |

## 验证记录与待验收项

本次已运行本地 JavaScript 语法检查，`node --check drafts/app.js` 与 `node --check drafts/scenarios.js` 均退出 0。Python 静态断言退出 0：数据逐字段等于 fixture/data.json、Token 副本逐字节相同、查询表单与原页完全一致、四列表头顺序相同。

局部资源封存与校验的实际命令、退出码和输出见 [verification.json](verification.json)。只检查此离线包，不运行全仓验证；封存只登记摘要，不是冻结批准。`prepare-static` 固定输出到生命周期目录，与本次只写 `drafts/` 的要求不符，因此直接派生既有页面并使用 adapter 的局部资源检查，不运行 starter、不修改工具或技能。

| Design QA 轴 | 本次能证明的内容 | 尚未验证 |
| --- | --- | --- |
| visual | 原样 Token 副本、原页样式保留 | 浏览器实际计算样式、字体和对比度，未采集截图 |
| layout | 名称列换行规则、表格局部滚动结构 | 1440×900、390×844 的长名称完整性、行高与溢出 |
| interaction | 脚本语法与事件处理代码 | 真实点击、Enter、重复查询、重置与 hash 初始化 |
| content | 数据、四列顺序及查询表单静态比对 | 浏览器中的实际文本呈现与空结果播报 |
| accessibility | label、表头语义、status、焦点样式 | 键盘遍历、可见焦点、读屏、200% 缩放和目标尺寸 |
| cross-platform | 普通脚本、本地相对资源、无运行时安装需求 | 独立目录 file:// 离线打开、各浏览器资源加载、console warning/error；无动效但未实测 reduced motion |

外部浏览器验收建议在两个指定视口依次执行：

1. 打开 `#scenario=primary`，确认共 3 条、M-002 全名可读、M-003 负责人为“未填写”。
2. 输入 `M-002` 后提交，确认共 1 条；输入内容后未提交时结果不变。
3. 查询“无匹配资料”，确认空态说明保留输入；点击“重置查询”恢复三条。
4. 再次查询任意资料后点击“重置场景”，确认恢复初始数据；重复操作确认可重放。
5. 检查窄屏整体无意外横向滚动，键盘可访问全部操作；检查控制台及断网独立目录加载。

未运行浏览器、未取得当前用户确认、未执行独立原型评审、未生成截图或视觉回归基线，不声称这些项目通过。既有页面“已确认”仅作为 fixture 输入，不成为真实项目批准。此交付为待外部浏览器验收的设计草案，不授予生产实现或发布权限。
