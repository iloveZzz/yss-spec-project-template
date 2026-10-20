# Spec 四阶段门禁实施与验证记录

本文件归档实施结果和本地实际证据。远端 CI、审查与合并结果以关联 PR 的实时状态为准，不把计划或未执行项记为通过。

## 实施结果

新 Spec 只有 `gate.plan-approved`、`gate.spec-baseline-approved`、`gate.implementation-admitted`、`gate.delivery-accepted` 四个阶段出口。Plan、Spec 基线和交付验收消费真实用户决定或有效延续；实施准入自动消费有效 Spec 范围与当前 Slice。专业检查记录实际质量结果，不另办批准或岗位会签。

内容4不含独立批准字段，checkpoint2引用不可变阶段记录。准备可以先于实施准入，执行继续核验当前合同、范围、API 适用条件和真实报告。Spec-only 到目标即停，无 UI 时消费有依据的不适用结论。默认允许实际自检，明确的独立复核要求继续生效。

历史政策和批准按原来源读取；普通同步不迁移产品状态，显式迁移保留原件且不补造批准。正式 Handoff5 复用 Plan/Spec 记录，冻结原政策、任务及其 checkpoint，不增加第五次批准；Backend 自身流程保持原义。

## 固定来源

- 模板运行时源：`9b3101085facc9da783346d3267d5a150893cacb`。
- Bundle producer：`7b973956dbd57ea9f7f3f471775c41a307d4eb4e`，`bundle-producer-v4`。
- CLI：`22c2e7cbba0024819f79ee104bd60ca20da01c01`，开发版本 `2.6.0-dev.1`，未创建发行 tag。
- 平台构建摘要由实际构建回执写入 [CLI pin](../distribution/yss-cli-pin.json)，不代表非 Linux 平台运行验收。
- 固定来源 `tools/artifacts.mjs generate --scope all` 成功，实际归档 7,089,080 字节；忽略的内嵌归档不入库。
- CLI 实施与 CI：[yss-cli PR #49](https://github.com/iloveZzz/yss-cli/pull/49)。模板集成检查：[template-gate](https://github.com/iloveZzz/yss-spec-project-template/actions/workflows/template-gate.yml)。

## 本地已执行的复验

安装与累计交付集成首先在 CLI `d74e1323` / 模板 `712a8c69` 上执行。随后仅压缩两个 Skill 的重复入口说明并重新装配固定来源，没有修改 Go 业务逻辑；最终 pin 的全新安装与 Worker 闭环由模板 CI 再次执行。

- 四阶段合同、内容4、角色无关历史读取、原生阶段、检查输入关联、遗漏已知独立复核、候选与范围、准备快照及当前阻塞拒绝：针对性回归通过。
- 官方 Plan 阶段登记后、未来实施准入前，实际脚手架准备通过；扩大原选择写路径被拒绝。
- 实际安装 Spec 的 pending 记录可读但不授予入口；Plan 计划只读且应用幂等；显式旧政策迁移保留原 checkpoint 和用户回复；Spec-only 到达目标，没有原型或未来准入。
- 正式 Handoff5 已打包；关闭源目录后实际导入 Backend，Receipt3 为 `pending-context-reconciliation`、`ready_for_agent:false`。
- 干净 CLI 提交的完整 Bundle 候选已在全新目录单次通过 `stage-gates-installed.test.mjs`（1/1，约339秒），覆盖上述 Plan/Spec、迁移、目标停止和离线交接。该本地联调候选仍由模板 CI 按正式 pin 再次核验。
- 累计 Worker 场景已完成准备、自动准入、实际派发、Java 非法输入 RED、修正 GREEN 与真实 JAR。Backend 本地终点、官方交付登记计划和应用、当前阶段记录核验均通过；checkpoint 恰好四门禁且 `checks` 为空。修改实际执行报告后拒绝 `EVIDENCE_DRIFT`。
- 该累计场景复用已执行的合成 fixture 定位兼容问题，不冒充最终固定候选的全新单次安装测试。完整新安装与 Worker 闭环进入必需模板 CI，合并以其实际通过为条件。
- 大 inode 的 bigint 精度及 libuv 有符号表示修复覆盖8个传输与漂移回归，错误 inode 仍拒绝。
- 当前代码全量 Go、gofmt、生产包构建、vet、固定摘要检查及文档事实检查通过。冷编译墙钟超过本地五分钟总范围后，另以 `timeout 300s go test -timeout 5m ./...` 成功复验，复用已有成功测试缓存。
- 干净 CLI 提交的 Linux/amd64 完整 Bundle 候选构建与完整黑盒冒烟通过；Skill 投影、锁文件和模板文档事实检查通过。
- CLI `d74e1323` 的远端 Go、冒烟、全量生成产物复现与脚手架 Go/Node 对拍均通过；最终装配提交的重复验证结果见 CLI PR #49，不以旧提交结果替代新来源检查。
- 模板首轮 CI 发现 Skill 上下文超出原预算。两个入口改为先读共享规则，最大 Skill 为12,498字节，原12,500字节预算保持不变；预算、投影、锁与17个合同/历史读取测试通过，独立复核确认覆盖语义完整。
- 最终 pin 更新后，按批准计划原基线选择118条相关维护命令，按当前 main 基线选择115条，未知文件均为空。原基线额外的两项 Skill 锁/同步用例（8个测试）和一项语法检查已在本地补验通过；其余必要回归结果由模板 CI 保留，不把选择计划记为执行通过。
- 最终独立上下文复核及后续定向复核未发现剩余已确认 P1/P2；复核不代替执行测试。

## 验证边界

本记录不是发行、部署、非 Linux 平台运行或真实业务验收证明。业务内容与用户回复夹具均为合成测试材料。历史项目需要升级及显式迁移；真实 `return-rate-engine` 实例在本环境不可访问，未复验，不生成其恢复成功或产品批准记录。早期失败、取消和未固定候选不计入最终通过结论。
