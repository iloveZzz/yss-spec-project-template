# Spec 四阶段门禁实施与验证记录

本文件记录实际实施与本地验证范围。最终固定候选的远端 CI、审查和合并结果由关联 PR 保存；未执行、失败或取消的运行不计为通过。

## 实施结果

新 Spec 只有 `gate.plan-approved`、`gate.spec-baseline-approved`、`gate.implementation-admitted`、`gate.delivery-accepted` 四个阶段出口。Plan、Spec 基线和交付验收消费真实用户决定或有效延续；实施准入自动核验有效 Spec 范围与当前 Slice。内部检查记录实际质量结果，无独立子批准或岗位会签。

内容4不含独立批准字段，checkpoint2引用不可变阶段记录。准备可以先于实施准入；执行继续核验合同、范围、API 适用条件和真实报告。Spec-only 到达目标即停，无 UI 时记录有依据的不适用结论。默认实际自检，明确的独立复核要求继续生效。

历史政策和批准按原来源读取，显式迁移保留原件且不补造批准。Handoff5 复用 Plan/Spec，冻结原政策、任务与 checkpoint；历史导出同时冻结原源 Profile，支持离线验包。Backend 自身流程保留原义。

## 固定来源

- 模板运行时源：`38952a72c4e8cbb7349e40c401d184705b3f3f4d`。
- Bundle producer：`7b973956dbd57ea9f7f3f471775c41a307d4eb4e`，`bundle-producer-v4`。
- CLI：`cc408fd0cee708a8f52e2abd67febf1f8901d141`，开发版本 `2.6.0-dev.1`。
- `tools/artifacts.mjs generate --scope all` 成功，实际归档 7,080,772 字节；内嵌归档按既有规则不入库。
- 三平台均从干净 CLI 提交实际构建，摘要核对实际二进制后写入 [CLI pin](../distribution/yss-cli-pin.json)。交叉构建不表示目标平台运行验收。
- [CLI PR #49](https://github.com/iloveZzz/yss-cli/pull/49) 核验全量 Go、冒烟、产物复现与脚手架对拍；[模板 PR #104](https://github.com/iloveZzz/yss-spec-project-template/pull/104) 按正式 pin 运行安装、完整 Worker 及必要维护回归。两仓必要 CI 均实际通过后才合并。

## 本地已执行的复验

- 当前代码全量 Go 在外层 `timeout 300s go test -timeout 5m ./...` 下通过；生产包构建、vet、gofmt、文档事实及禁止固定测试摘要检查通过。此前并发运行的五分钟超时不作为通过证据。
- 阶段合同、事务计划/应用/幂等、检查输入、当前 Slice、已知独立复核要求、准备快照、范围与报告漂移有针对性回归。官方 Plan 登记后、未来准入前，实际脚手架准备通过；扩大原选择写路径被拒绝。
- 原 P-001 的角色无关 approval3 读取、未知上下文拒绝、默认内容4及显式历史 v3 迁移、战术设计场景10/10通过。历史源 Profile 闭包缺失有真实 RED/GREEN Go 回归；源删除后的三个原失败 UI 包场景3/3通过。
- 当前阅读视图支持 identity2/checkpoint2，并保持只读和未评估授权；历史状态反馈9/9、注册唯一性/事务回滚3/3、架构选择、生命周期查询、分发与技能锁复验通过。
- 来源固定前的诊断构建，使用旧 Bundle 和当前 Node/Go 修复，单次安装链1/1通过（约196秒）：Plan 计划只读、应用幂等，显式迁移保留原 checkpoint 与用户回复，Spec-only 目标停止，Handoff5 在源关闭后实际导入 Backend，Receipt3 为待对账且 `ready_for_agent:false`。此诊断运行不替代最终 pin 的全新安装 CI。
- 更早累计 Worker 场景使用 CLI `d74e1323` / 模板 `712a8c69`，完成 Java 非法输入 RED、修正 GREEN、真实 JAR、Backend 本地终点及四阶段交付登记；修改报告后拒绝 `EVIDENCE_DRIFT`。累计诊断不冒充最终固定候选的全新单次 Worker 测试；最终闭环由模板必要 CI 复验。
- bigint inode 精度/无符号表示的8个传输与漂移回归通过，错误 inode 继续拒绝。并发验包使用各场景自己的认证运输根，保留目录、原字节与路径漂移检查。
- 三个较大的 Skill 入口复用共享阶段说明；既有 12,500 字节 Skill 上限及主控 8KB 上限保持。六个必要新阶段政策/schema/说明纳入流程资产预算；145项 fast 检查数量、Backend 有意保留门禁分歧和技能哈希均按实际来源同步。
- 批准计划原基线额外的 Skill 锁/同步8个用例与语法检查再次通过；影响计划未知文件为空。选择计划不计为执行通过。
- 独立最终上下文复核和后续定向复核未发现剩余已确认 P1/P2；复核不代替实际测试。

## 验证边界

本记录不是发行、部署、非 Linux 平台运行或真实业务验收证明。业务内容和用户回复夹具均为合成材料。现有项目需要升级及显式迁移；真实 `return-rate-engine` 在本环境不可访问，未复验，不生成其批准或恢复成功记录。
