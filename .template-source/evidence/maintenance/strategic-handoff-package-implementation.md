# 战略交接包实现 checkpoint

用户已确认目录＋ZIP、完整快照＋差异、离线预览＋源码锁文件、导出＋验包＋受控导入、稳定规则身份与场景关联、逐条追溯、受控延期及按依赖阻断。

L3：cross-repo-contract、generation-semantics、core-validator。模板维护，无产品运行时代码，behavior-tdd 不适用；使用 Node CLI 集成反例和 Fresh Verification。context_reconciliation：not-applicable，原因是 template-source 只维护模板与合成 fixture。

写范围：各模板 scripts、docs/process/schemas、相关 canonical skills 及其生成投影；三份 CLI 的 template、manifest、snapshot。禁止产品资产、提交和推送。代码所有者为本次主控，CI 入口为各仓 .github/workflows；模板验证 scripts/verify-template-fast，CLI 验证 node --test，回滚点如下。

| 仓库 | 分支 | 回滚点（本轮前 HEAD） |
|---|---|---|
| . | main | e2778a83dac29c52e61bc54a2087149e4527d28b |
| submodules/yss-harness-design-agent | main | dd1ec2dbaf3ce6da528607519ef2d0888b78dbb4 |
| submodules/yss-harness-dev-agent | main | 9a0778c1bd2182fe20783a9f163dd1ba401c290b |
| submodules/create-yss-spec | main | 4d89152d5445f45234b4500aa7d36ae0e8bf0ae6 |
| submodules/create-yss-strategic-design | main | d315bdf5076f034fa7958ec15c5217d967df718d |
| submodules/create-yss-harness-dev | main | f7edb043f49bccc0ee1350492bc7cf9f17c73c12 |

发布顺序：模板子仓 → 对应 CLI → 主仓 gitlink。当前只维护工作树，不执行发布或 Git checkpoint 提交。MR/PR：未创建。验证结果见下文。

## 实现与维护者自检

入口 `scripts/strategic-handoff` 已实现 export / verify / import；标准目录和 ZIP 使用同一逻辑清单。批准资产字节、源词汇快照、原始引用映射、逐文件摘要、规则/场景索引、前版索引及差异均可在无源仓条件下核验。H2 源码树含锁文件，离线预览树由实际验证记录绑定，验证记录本身和源码树摘要再由交接批准绑定。工具不执行来源代码，不代替离线浏览采集。

源规则身份由战略合同确认；导出门禁不推断身份。下游导入生成独立快照和待确认草案，不修改目标词汇表、不批准战术合同。消费校验覆盖规则与关键场景的成功/失败 seam；延期按已声明依赖阻断，未知依赖整体阻断。规则变化、责任边界/不变量关联变化、方案决策和原型源码变化均触发相应复核。

维护者自检覆盖：源批准绑定、摘要的三种语义、路径闭包与 ZIP 反例、不可覆盖和幂等导入、源/目标 CONTEXT 唯一性、上游完整快照换版与战术过期、受控延期字段、跨 profile 用户决定策略能力。合成 PNG header 和浏览器记录只验证 CLI 合同，不是产品视觉或真实离线交互证据。源规则语义和测试断言是否充分仍由既有业务/战术评审负责。

## Fresh Verification

| 命令 | 当前结果 |
|---|---|
| `node --test scripts/verify-strategic-handoff-package-scenarios` | exit 0；8/8，包含修改源码/验证记录、伪造索引、换版、术语冲突及依赖阻断反例 |
| 设计模板 `scripts/verify-template-fast` | exit 0；核心验证配置变化自动扩大为完整 release profile |
| 研发模板 `scripts/verify-template-fast` | exit 0；同上 |
| 综合模板 `scripts/verify-template-fast` | exit 1；唯一失败为 `verify-skill-governance` 的战略设计上游 hash 漂移 |
| `node scripts/sync-strategic-handoff-tools --check`、三模板 `git diff --check` | exit 0 |

原始输出和本轮实现/CLI 快照摘要见 [战略交接验证证据](strategic-handoff-package/implementation-digests.json)。设计 CLI 既有回归 7/7、研发 CLI 既有回归 56/56 已通过；最终生成实例链路 `node .template-source/scripts/verify-strategic-handoff-distribution.mjs` exit 0：三个 CLI 均成功生成，设计源被移除后综合/研发工具仍可验包，研发完成导入、正式对账、完整战术 validator 及切片消费校验；原始输出见 `strategic-handoff-package/distribution.log`。综合 CLI 接入复测 exit 0，6/6：ASCII locale、既有运行时代码保护、根冲突备份、两类历史目录迁移、gitlink 边界；输出见 `strategic-handoff-package/spec-cli-attach.log`。没有宣称模板可发布。

## 尚未关闭的集成边界

本轮需要修改战略设计源仓的 canonical `yss-stage-decision`；父模板 manifest 仍锁定旧 revision。依据 [战略设计技能集成合同](../../../docs/agents/strategic-design-skills-integration.md) 的“先在战略设计源仓形成并推送固定 commit”，不能在旧 revision 下替换上游 hash。下一步须在获得 Git 提交/推送授权后，先固定源仓，再更新父模板 manifest 与技能锁、CLI 固定快照及 gitlink，重跑综合模板全量。当前本地 CLI 工作树快照只供集成测试，metadata 中的基准 commit 不代表这些修改已提交。

工作区同时存在另一项用户决定门禁改造；未回滚、未代提交其文件。早期综合 CLI 失败曾受该改造中间态影响；以最终复测为准。日常 L3 未创建冻结候选或正式独立审查，发布状态仍未开放。
