# Plan / Spec 优化迭代交付记录

已落地四批实现，并完成本次自检修复。**本轮固定工作树验证输入已达到 L3 `implementation-ready`，维护 checkpoint 校验通过。当前并行工作区整体尚未验证通过，不声明可合并或可发布。** 未执行 Git 提交、推送、发布或存量迁移；八个仓库 HEAD 均保持本轮开始时的值。

本次结论见 [维护 checkpoint](maintenance-checkpoint.yaml) 和 [维护者自检](maintainer-self-check.md)。上一轮把发布检查缺口直接等同于本轮日常维护状态未闭合，表述过严；本次按既有维护政策纠正，未修改门禁。

## 本轮已交付

| 批次 | 实现与可审阅入口 |
|---|---|
| 入口和模板 | `.agents/skills/to-spec/SKILL.md` 统一引用 Spec 模板；Plan 指标及取舍、Spec FR/NFR/AC、来源与未决项；三个 profile 同步 |
| 只读诊断 | `scripts/inspect-plan-spec check`，结构解析、定位、恢复建议、工具版本与输入摘要；旧格式明确未评估 |
| 差异和追溯 | `diff` 按稳定 ID 展示增改删和引用变化，保留可重建原字节差异；Slice 现有 acceptance / verification 引用视图；Spec Delta 关联 ID |
| 效果和兼容验证 | 三类完整 / 缺陷固定样本、6 组前版表达对照、离线 CLI 安装与实例、只读 / 重复 / 旧格式兼容；人工使用效果单独待验证 |

设计见 [实施设计](design.md)，使用合同见 [Plan / Spec 内容诊断](../../../../.template-spec/process/plan-spec-quality.md)，贯穿案例见 [生命周期写作示例](../../../../.template-spec/templates/examples/lifecycle-writing-examples.md)。原有 YAML 合同、生命周期 schema、批准和阶段就绪判定均未升级；整个本轮保持诊断模式。

## 已验证的范围

[本轮固定输入验证报告](continuation-verification/report.json) 的 **15 / 15 个命令通过**；[输入清单](continuation-verification/inputs.json) 包含 12,403 个源文件 / 分发输入，执行前后摘要一致，`input_drift=false`。

- 诊断行为：24 项测试通过，覆盖预登记缺陷、中文 GFM、转义竖线、链接 / 代码 / 示例隔离、来源读取、输入漂移、只读、旧格式、字节差异和 Slice 映射。
- 完整 CLI 相关回归：42 项测试通过，包含默认 Plan 阶段诊断模块闭包的新增反例。
- Plan → Spec、Context 对账、用户决定、共享工具与 Skill 同步、战略上游来源、中文写作集成均通过本轮重验。
- 四套 CLI 均本地打包、离线安装，从实际入口创建临时实例，核对关键文件字节并执行 check / diff、旧格式、重复只读及 sync 预览。报告见 [分发记录](continuation-verification/distribution.json)。这些是 `working-tree` 集成证据，不是固定提交发布证据。

绑定摘要：`bee13e71165b214da68d9e9575c792fb84dae82678a15543a17002cb1c1a2ccd`。该范围显式排除 CodeGraph 缓存、node_modules / 解释器缓存及无关调研证据，不代替完整候选或发布核验。

| CLI | 版本 | 实例验证 |
|---|---|---|
| create-yss-spec | 3.5.3 | 通过；本地工作树快照 |
| create-yss-harness-design | 0.8.10 | 通过；本地工作树快照 |
| create-yss-harness-backend | 0.4.14 | 通过；本地工作树快照 |
| create-yss-harness-frontend | 0.3.14 | 通过；本地工作树快照 |

## 本次继续推进

自检补齐两个确定性反例并修复：`diff` 遇到缺失章节或无法提取的表头时，报告 `partially-compared` / `unassessed`，不把解析缺口判为需求删除；显式 Slice YAML 解析失败返回 `2`，可解析但 schema 不支持时单独标记未评估。两种场景均在四套离线 CLI 实例中验证。

共享工作区的重验检测到原型 / 设计源文件并行变化。最终在仓库外临时副本按已记录摘要固定输入，保留全部本轮实现与分发内容；变化文件的旧字节只在临时副本中从开工备份恢复，未回写共享工作区。另补齐 profile 既有文档工具和本地 pnpm 离线依赖。[输入来源记录](continuation-freeze-provenance.json) 可追溯恢复来源；[48 项一致性核对](continuation-live-comparison.json) 确认本轮核心源文件、profile 文件和四套 CLI 快照索引与共享工作区一致。新增并行原型内容不在本轮已验证结论内。

插件构建曾出现临时目录清理 `ENOTEMPTY`，单独复跑时又因遗漏既有固定 CLI 测试包装器被拒绝。改用仓库包装器后，最终 7 个插件构建测试通过。共享工作区漂移及副本准备失败的原始报告分别保留在 [工作区重验](continuation-live-attempt/report.json) 和 [副本准备重验](continuation-snapshot-preparation/report.json)，未覆盖为成功。

## 整库核验的未闭合项

本次官方 `verify-template-fast` 通过既有 `--changed-file` 接口消费完整本轮变更清单，范围为 `limited`。实际执行 39 条命令、38 条成功；工具链用例因上述清理错误失败，且报告检测到输入漂移，vendor 和最终后置检查未执行。[原始 fast 报告](continuation-fast/report.json) 保持失败。后续通过的 15 项固定输入重验不冒充整库 fast 或 release 已通过。


上一轮执行 `scripts/verify-template-fast --concurrency 1` 时，当前整个脏工作区因已有核心资产改动自动升级为 release。该次运行完成 98 个检查命令，97 个返回成功；固定提交检查 `scripts/verify-strategic-handoff-tools-lock --require-committed` 拒绝 `working-tree` 来源。用户本轮授权不包含提交，未通过改写来源状态绕过检查。[原始报告](whole-workspace-attempt/report.json) 保留失败结果。

该次整库报告还有 `input_drift=true`，不能当作当前完整 Fresh Verification。核验时窗内观察到并行 `2026-09-30-shadcn-vue-design-research` 证据及 CodeGraph 数据 / WAL / 日志变化，详见 [变化候选](drift-candidates.json)。报告未保存逐文件起始快照，因此不宣称已穷尽所有漂移来源。本轮先前已对明确源文件范围重验；本次又在固定副本补齐输入绑定并重新验证，结果和局限见上文。

另行 `git diff --check` 显示既有 `.template-source/evidence/maintenance/2026-09-29-document-readability-design/plan.md` 第 67–71 行包含五处 Markdown 双空格硬换行。该文件与本轮备份字节一致，保留原样；本轮文件范围的 diff 检查通过。整库尝试在发布门禁失败后未运行其余语法后置检查和最终全局 diff 后置检查，不能声称整库通过。

本轮 `implementation-ready` 仅属于上述固定工作树验证范围。达到整库完成结论仍需：在获授权的交付阶段固定提交来源、稳定所有被观察的输入，处理上述已有格式检查项，再串行运行完整验证。本轮没有通过裁剪或更改门禁来消除这些限制。

## 效果、保真与未评估项

[格式对照原始记录](format-comparison.json) 保存三类共 6 组旧表达 / 增强表达，以及发现、未评估项、实际诊断耗时和输入摘要。旧表达由相同虚构输入转换并保留字段内容，属于表达兼容试验，不是真实用户历史文档或人工阅读试验。原规则、量词、拒绝条件、非目标与未知项仍需结合 source 表人工核对。

[人工效果登记](human-evaluation.md) 保持 `pending-human-feedback`。没有填写 / 审阅时间、澄清轮次、真实返工或 Token 数据，不声明效率提升比例，也未恢复此前取消的跨平台 Agent 评测。

## 工作区与分发维护

开工前对 root 与七个子仓的 16,828 个普通文件建立外部备份，并记录符号链接。逐文件核对后，已有源文件的改动均在本轮边界内；原有原型、设计系统和其他工作保留。[基线比对](baseline-preservation.json) 中 CLI 旧 blob 的缺失来自官方快照脚本重建，原内容仍保存在外部备份；未手改 blob。

战略设计共享段落先在源仓演进，通过本轮 `sync-authoring.mjs` 同步父模板及源 hash，再由仓库脚本生成 Skill 投影、锁、共享工具与 CLI 快照。分发验证发现并修复两处构建边界：完整 CLI 同步清单超出默认 1 MiB 缓冲，以及默认 Plan 阶段漏装诊断闭包。对应失败与修复后的测试原始记录均已保存。

回退按使用合同停用独立诊断和新模板默认入口，保留已生成文档与历史证据，不回写旧资产或恢复过期批准。
