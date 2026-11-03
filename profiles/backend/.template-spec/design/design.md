# YSS 主题规范与实现映射

亮色映射来源于 [Spec 模板的 DESIGN.md](https://github.com/iloveZzz/yss-spec-project-template/blob/main/DESIGN.md)。Backend 安装不分发根 `DESIGN.md` 或 `yss-design-system`，仅保留此处的主题映射参考；当前项目已有的设计规范优先，模板默认不构成迁移授权。

## 当前标准

Spec 制作无基线的企业后台时默认采用 YSS 标准亮色主题；具体色值、排版、尺寸、图标、响应式、动效与图表规则从上述规范读取。本文件不另抄一套值表，也不为 Backend 增加产品设计职责。研发使用实际交付的 UI 规范与交互说明，业务行为、权限与异常恢复仍由 Spec 承载。

## 资源关系

| 资源 | 用途 |
|---|---|
| Spec 模板的 `DESIGN.md` | 规范角色及使用规则；保持 Google design.md alpha 字段边界；不随 Backend 安装 |
| `tokens/variables.css` | 亮色角色 `--yss-*` 与 `--brand-*` 兼容别名，覆盖页面和 Teleport 浮层 |
| `tokens/theme.json` / `tokens.default.json` | 旧组件库键名的兼容参考；本次明确角色已映射，未映射预设及 Grid 键保持历史含义，不代表生产 API 验证 |
| `tokens.dark.json` / `variables.dark.css` / `tokens.compact.json` | 历史快照，不属于当前亮色默认或当前投影一致性声明 |

实际 UI 工程按当前项目的组件及装配方式引用 Token，框架样式不能覆盖已采用的语义角色。品牌与主操作统一使用标准蓝；装饰边框与可识别输入边框分别映射。列表、看板及日期/团队组合筛选按 Spec 交付选择，不强制引入原型框架或完整应用壳。

## 维护与验证

模板维护时先更新 Spec 规范源，再同步 Backend 的亮色直接映射；项目研发只同步当前采用的资源。当前 CLI 不提供主题派生命令，不调用旧生成器，也不把人工同步称为算法重建。投影摘要保存在 Spec 模板中，Backend 不另建摘要；摘要不能证明浏览器或组件 API 正确。

按改动影响核对值引用、对比度、实际计算样式和关键交互。检查主题至少关注主按钮各状态、placeholder、输入边框、表格自然增高、窄屏重排、焦点与减少动效。结构核对不能替代浏览器操作或读屏结果；未运行项如实说明。不要求额外批准包、固定档位或检查计划。
