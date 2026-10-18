# 模板源治理区

本目录属于 `template-source`，保存现行模板维护规则、CLI 核心、插件源码、分发合同、维护工具、必要工程依据。

## 当前资产

- `.template-spec/` 持有可供项目实例消费的治理规则；根入口、词汇和视觉规范仍是各自的权威来源。
- `agents/`、`contracts/`、`process/` 保存当前集成合同、工具边界和维护策略。
- `cli-core/`、`plugins/`、`scripts/`、`tooling/` 保存实现、测试及固定工具依赖；有效迁移 fixture 随现行兼容能力保留。
- `engineering/evidence/` 仅保存当前工程声明仍直接消费的必要依据，原日期、摘要和结论不改写为新验证。
- `wiki/` 是 `llm-wiki` 在本机按需生成的阅读视图：被 `.gitignore` 排除，不提交，也不成为规则权威；需要时重新生成，旧版本可从 Git 历史找回。

## 维护运行材料

历史研究、审查、发布过程、试验副本、构建缓存和旧规划从当前工作树移除。新的运行材料统一保存到当前工作区仓外 `maintenance` 命名空间；详细路径与恢复规则见 [维护留存策略](process/runtime-storage.md)。用 `scripts/maintenance-path <类别/运行ID/文件>` 取得绝对路径，用 `maintenance:<相对路径>` 引用维护证据并绑定摘要。

`docs/superpowers/specs` 与 `docs/superpowers/plans` 是模板源的**在办维护文档工作区**：只保留 draft / reviewed / active 状态的设计与计划，并写 frontmatter（doc_type、status、baseline_commit、created_at）。完成或废弃后，计划迁入仓外 maintenance 并记录摘要；需要长期作为依据的设计结论迁入 `.template-source/contracts/` 并登记到其索引。该例外不适用于项目实例。

恢复包、归档索引、报告及 Wiki 事务历史均保存在仓外。清理前核验逐文件字节、权限和恢复包完整性；已失效的计划不改写为已完成。当前 Git 历史仍可用于定位原始来源。

## 实例分发

外部 CLI 按显式分发清单构建固定版本快照。新 `project-instance` 不附带本目录、源仓维护环境、历史运行材料或模板源 Wiki。项目自身的产品资产按生命周期写入 `docs/`。
