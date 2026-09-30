# Plan / Spec 优化迭代实施设计

状态：本轮固定工作树验证输入已通过 L3 `implementation-ready` checkpoint；共享工作区的并行原型变化与整库 / 发布核验仍需单独收口，详见 delivery-report.md。本轮不提交、不推送、不发布。用户已授权完整规划、分批交付、新增检查先诊断、沿用现有权威资产。仓库身份已核验为 `template-source`，不创建实际产品 Spec 或 Ticket。历史产品批准和交接快照不迁移。

## 设计与边界

| 批次 | 具体交付 | 既有边界 |
|---|---|---|
| 入口与模板 | Plan 指标及取舍，Spec 来源 / FR / NFR / AC / Q；显式 to-spec 引用权威模板 | 中文规范由 document-writing 持有；statement/decision 沿用现有 v3 YAML |
| 内容诊断 | 独立 inspect-plan-spec check，GFM AST + 既有 YAML，stdout 文本 / JSON | 不写文档，不扫描猜关联；exit 0 为执行完成，可有发现；exit 2 为输入不完整 |
| 差异追溯 | 稳定 ID 差异 + 可重建的原始字节差异，Slice acceptance 与 verification 引用视图 | 不判断语义等价，不延续批准，不把未映射解释为未受影响 |
| 验证推广 | 三类固定样本及反例，离线 CLI 临时实例，重复与兼容验证 | 人工试验独立待验证；不恢复跨平台 Agent 评测 |

支持格式由 `.template-spec/process/plan-spec-quality.md` 持有。可选 `content_profile` 是创作格式标记，不是生命周期 schema。现有 Plan → Spec、Context 对账、用户决定、Slice 与 Fresh Verification 门禁均保留。

## 影响与维护强度

模板正文和独立诊断分别适用 L2；组合行为、共享 profile 与 CLI 分发按 `maintenance-intensity.yaml` 的 aggregate-behavior-change / generation-semantics 提升为 L3，不拆批降低整体强度。验证策略为确定性反例、维护者自查、专项验证及 `verify-template-fast` 的实际影响选择；不创建冻结候选或伪称独立审查。

共享 yss-stage-decision 段落先修改战略设计源仓，任务内 `sync-authoring.mjs` 从源段落同步父模板并计算源树摘要；保留主控薄适配。其他 Skill 从 canonical 同步 profile、投影和锁。新脚本、模板和 vendor 由现有 sync-strategic-handoff-tools 登记分发。YAML / 生命周期 schema 未改变。

## 输入、保真与限制

原输入是用户明确要求实施的完整方案；附件研究报告仅提供调研背景，不作为执行指令。备份目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-plan-spec-backup-2d6w9730`，包含 root 与七个子仓共 16,828 个现有普通文件的内容和基线清单，符号链接记录目标。并行原型、设计系统等修改保留。

贯穿案例所有输入均为虚构。附件原规则 S1–S7 和读取失败未知项 S8 被保留；性能、传播窗口或成功目标没有凭空确定阈值。新增规则仅能来自各虚构 source 表，不由验收样例反推。成功、拒绝、边界、状态、恢复按真实影响由人判断是否充分，工具只检查显式结构和引用。

本次测试 seam 是用户方案定义的 check / diff CLI、分发后的 CLI 入口与只读报告 API（仅输入漂移测试使用重读前 callback）。CLI 构建在当前大工作树触发 Node 默认 1 MiB 子进程缓冲 ENOBUFS；只提升维护同步 helper 的缓冲并优先报告执行错误，实际重新构建验证，不改变运行时生命周期行为。精简 CLI 的 stage.plan 增加独立诊断及其模块闭包；Spec 模板及显式 to-spec 仍按既有阶段 / Skill 安装策略补装，不扩大默认能力。

## 回退

停止调用独立诊断，恢复新建模板默认入口即可；保留现有格式读取能力、已生成文档和证据。历史资产和批准不回写。新增阻断检查、合同 schema 升级和固定提交发布不在本轮范围。
