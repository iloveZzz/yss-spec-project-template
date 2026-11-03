# YSS 主题规范与实现映射

模板的视觉规范源是仓库根 `DESIGN.md`。`yss-design-system/assets/DESIGN.md` 是供技能独立安装使用的同内容副本；`.template-spec/design/tokens/variables.css` 是当前标准亮色角色的 CSS 投影。已有项目优先沿用自己的设计基线，模板默认不构成迁移授权。

## 当前标准

无基线的企业后台采用 YSS 标准亮色主题；具体色值、排版、尺寸、图标、响应式、动效与图表规则均从根规范读取。本文件不另抄一套值表。设计和 UI 原型由 `yss-design-system` 承担，业务行为、权限与异常恢复仍由 Spec 和交互说明承载。

## 资源关系

| 资源 | 用途 |
|---|---|
| 根 `DESIGN.md` | 规范角色及使用规则；保持 Google design.md alpha 字段边界 |
| 技能 `references/high-fidelity-default-theme.md` | 无基线时的采用规则，已有规范与用户覆盖的优先级 |
| 技能 `assets/DESIGN.md` | 默认规范的分发副本，可用于建立新项目 DESIGN.md |
| `tokens/variables.css` | 亮色角色 `--yss-*` 与 `--brand-*` 兼容别名，覆盖页面和 Teleport 浮层 |
| 技能 `assets/prototype-theme.css` | 默认密度、布局和自适应规则 |
| 技能 `assets/shadcn-vue-authoring/theme.css` | 固定组件的语义映射，不修改上游 vendor 文件 |
| `tokens/theme.json` / `tokens.default.json` | 旧组件库键名的兼容参考；本次明确角色已映射，未映射预设及 Grid 键保持历史含义，不代表生产 API 验证 |
| `tokens.dark.json` / `variables.dark.css` / `tokens.compact.json` | 历史快照，不属于当前亮色默认或当前投影一致性声明 |

样式加载顺序为框架基础样式、当前 Token 定义、原型主题、shadcn 语义映射、具体页面样式。框架样式不能覆盖语义角色。品牌与主操作统一使用标准蓝；装饰边框与可识别输入边框分别映射。列表和看板共用主题，页签、组合筛选、日期与阶段列按技能 `references/standard-theme-patterns.md` 选择，不强制全壳。

## 维护与验证

先更新规范源，再同步直接映射、技能副本和受影响平台副本。当前 CLI 不提供主题派生命令，不调用旧生成器，也不把人工同步称为算法重建。`.design-md-projection.json` 仅记录本次同步的亮色文件摘要；摘要证明字节一致性，不能证明浏览器或组件 API 正确。

按改动影响核对值引用、对比度、实际计算样式和关键交互。检查主题至少关注主按钮各状态、placeholder、输入边框、表格自然增高、窄屏重排、焦点与减少动效。结构核对不能替代浏览器操作或读屏结果；未运行项如实说明。不要求额外批准包、固定档位或检查计划。
