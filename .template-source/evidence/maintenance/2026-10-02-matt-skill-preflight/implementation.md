# Matt 技能引用与按需补装维护记录

本轮为 template-source 的 L3 模板维护，目标为 implementation-ready。用户已授权实现模板源、受影响 Profile 与四类 CLI 快照；不提交、推送、发布，不修改存量项目。根 CONTEXT.md 合同校验适用，产品 context_reconciliation 为 not-applicable，原因是本轮不批准产品资产或流转产品阶段。

## 变更与自检

- Matt 来源链接、名称状态及固定版本只引用注册表、迁移说明与 skills-lock.json；补装消费模板的 YSS 适配快照。
- 查询仅在 --check-skills 下增加 skill_readiness；工作单元必填，条件依赖由重复 --when 激活。原生路由及支持技能展开 context-required / 已触发 context-conditional，不加入兼容引用、其他角色或 review-only 依赖。
- readiness 实际检查 canonical、锁、运行时投影及有效哈希，校验同名占用、受管丢失和链接边界。只读查询不授予安装、调用、阶段批准、ready-for-agent 或完成资格。
- 缺失共享技能先核对现有 CLI 计划，既有授权覆盖且无冲突时 apply，随后重验。漂移、冲突、退役、外部能力、运行时或版本问题阻断当前调用；禁止 force 和自动扩展同步、迁移范围。
- 专职查询通过受管转换适配本地编排合同。战略设计普通查询与 HEAD 原实现逐字段相同；三个 Profile 合同的语义差异仅为新增 skill_preflight，其余差异为 YAML 序列化格式。
- 同步 canonical 投影、有效哈希锁、专职主控提示和战略共享工具锁。四个 CLI 快照明确为 working-tree，Matt 固定上游 revision 未改变。

## 已执行的实际反例与集成

scripts/verify-lifecycle-context-query-scenarios 的真实文件系统反例覆盖：未触发条件、review-only 和兼容引用不安装；别名及依赖环；退役、未知和插件限定名外部技能；未登记或多运行时；canonical / 投影哈希漂移；锁与安装清单不一致；受管文件丢失；canonical / 仅投影同名占用；越界链接。预检前后目录摘要相同，legacy 元数据不产生自动迁移命令。

旧 CLI slim-distribution 测试在 codex、cursor、pi 上分别初始化 stage-selective 实例，Plan 需求单元仅缺 grilling / domain-modeling。核对 plan 后 apply、重新预检为 ready，重复 apply 不写入；tdd、code-review、to-spec、implement 均未安装。普通查询、实例元数据及验证合同保持兼容。版本不匹配由现有 ensure --plan 拒绝。

旧 CLI 全套 prepared 测试 212 项：working-tree 输入下 211 通过，已提交快照门禁拒绝 working-tree。该原始门禁已在仓库外、按固定默认 revision 构建的 committed 快照中独立通过。未改测试或伪造快照状态。专职设计和后端 CLI 测试通过；前端并行初始化超时，串行复验全部通过，失败日志保留。

首次 fast 因缺少 YSS_VUE_TOOLCHAIN 在原型作者工具预检处拒绝，输入无漂移。按仓库既有 package.json / pnpm-lock.yaml 在仓库外离线冻结安装，未改门禁；设置对应环境变量后，原型 contracts 与 vue-workspace 场景通过。原始失败报告保留在 prototype-fast-failure/，复验见 prototype-contract-fixed-report/report.json。

复验过程中会话中断，主进程停止，残留子测试随后退出。未把 running 的部分报告计为完整通过；保留 fast-verification-final/ 与 verification-interruption.json，完整结论使用恢复后新的报告目录。

## Fresh Verification 证据位置

本轮命令、退出码和日志保存在仓库外：

`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-matt-preflight-delivery-e4gxhR`

其中 root-preflight-scenarios.json、spec-slim.json、spec-full.json、committed-package-contract.json、test-design.json、test-backend.json、frontend-serial.json 和 verify-*-bundle.json 是已执行证据。package-smoke.json 记录四类本地 tarball 安装和隔离实例的真实入口，fast-verification-resumed/report.json 记录最终按实际影响面运行的脚本结果；交付结论须以这两个记录的最终 status 为准。

机械测试不证明真实 Agent 的自动补装判断或效率提升；本轮不宣称 committed-source release-ready。
