# Spec 后业务拆分与研发 Slice 衔接：L3 模板维护

本次执行用户批准的优化方案。维护强度 L3：生命周期、Ticket 类型边界、跨仓批准合同和生成语义均受影响。只做模板与分发实现，不提交、推送或发布。dataingest 仅作只读诊断。

## 基线与保留

工作区在本轮开始前已有大量未提交改动。主仓及 7 个子仓的差异、状态、文件摘要和修改文件归档备份位于 `/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-business-tickets-baseline-cdi76y_n`。未 reset、clean、stash 或提交；本轮按现有内容增量修改。profile 同步遇到 dirty 文件时验证其与本轮修改前 canonical 内容等值，再用现有同步 API 的 before_sha256 保护应用，证据见 profile-reconciliation.json。

## 维护范围

- Spec 业务草案、Design 校准、业务正式化和工程 Slice 分开；复用稳定 ID，无新增主阶段、Skill 或常规人工门禁。
- 版本化 tracker 配置控制新规则；历史配置缺失只读诊断，显式内容类型及能力声明不可降格。
- 业务票最小合同、只读检查、来源闭包、覆盖与延期、阶段状态投影。
- Slice v3 复用 basis 和 acceptance；编译、批准、执行共用的合同读取拒绝业务票冒充。
- Handoff v5 保持外层格式，业务集合绑定当前战略交接批准，历史包保留原策略。
- canonical Skills、profile 专属适配、生成投影、锁文件、CLI 快照与按阶段安装。

生命周期基线由现有 semanticHashesById / semanticDigest 重新计算，历史 v1 归档未更改；新增及现有职责的增量语义由本次已批准方案授权，不能解释为修改实例历史批准。

## 验证边界

采用定向 fixture、实际 CLI、反例和维护者自查。专业业务粒度/语义由下游独立审查负责；结构检查不会自称业务审查通过。模板 Context reconciliation 为 not-applicable（无产品工作单元；检查模板词汇合同）。本轮不运行已取消的多平台原生 Agent 评测，不作未测量效率结论。

当前命令、退出码、源摘要、分发集成及发布边界见[继续推进验证](continuation/verification.md)；[首轮记录](verification.md)保留历史失败。本地工作树分发验证不能替代固定提交/固定版本发布证据。
