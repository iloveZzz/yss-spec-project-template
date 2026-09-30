# Spec 后业务拆分与研发 Slice 衔接：实施与验证结果

> 当前结论见[继续推进验证](continuation/verification.md)：上一轮功能回归与分发缺口已关闭，稳定副本整轮无输入漂移；发布来源门禁仍拒绝未提交内容。下文保留首轮记录，不作为当前状态。

本次批准范围的功能实现和本地分发集成已完成。定向验收通过；共享工作区完整回归未通过，不能据此宣布整个工作区可合并或可发布。未提交、推送或发布，也未修改 dataingest。

## 已实现的行为

1. Spec 完成时要求可读取的业务 Ticket 草案集合，包含原始 FR／AC、依赖、覆盖处置与来源摘要。产品设计校准已有 ID；无设计影响可直接正式化，不要求空原型。
2. 业务正式化复用当前 Spec／Design 批准及专业审查。独立 Design 将最终集合绑定当前战略交接批准；全生命周期本地流转不强制导出／导入自己的包。
3. 研发通过业务票来源细化实现 Slice。Slice v3 不升级，沿现有 basis／acceptance 绑定集合和原始验收；工程准备、合同批准、执行就绪门禁保留。
4. `scripts/verify-business-tickets` 提供草案／正式化只读检查；覆盖遗漏、依赖环、悬空引用、来源漂移、无依据延期和类型冒充会被定位。结构通过不等于专业语义审查通过，也不授予实现资格。
5. checkpoint／状态查询分别显示业务拆分、实现拆分和实现就绪；父 Ticket／map 的已声明同步可检测摘要过期。阶段任务完成不替代阶段批准。
6. 新项目默认 `business_ticket_version: 1`；旧配置缺失保留 `legacy-unassessed`。业务票放入 `issues/` 仍不能变成实现票；阶段工作项同样受检。
7. Handoff 保留 v5 外层，以 `business-ticket-approval-v1` 声明新批准绑定；历史包只读兼容。Backend／Frontend 接收业务映射，已知依赖按影响传播，未知依赖保守阻断。

协议见 `.template-spec/process/business-tickets.md`，模板见 `.template-spec/templates/business-ticket-*.{md,yaml}`。canonical Skills、profile 专属合同、派生视图、投影、锁文件和四套 CLI 已通过现有生成／同步工具处理。本次业务规则仍在各 profile 中；当前全 profile 同步检查另有原型变更冲突，见下文。

## 本范围最终验证

| 检查 | 结果与证据 |
|---|---|
| `node --test scripts/fixtures/business-tickets/*.test.mjs` | 33／33 通过；`business-final.log`。包含无工程草案、无 UI 正式化、批准复用／错绑拒绝、AC 覆盖、来源过期、交接能力及一票多 Slice。 |
| 编译／批准／执行／真实 CLI 类型拒绝 | 8 个断言通过；`entrance-rejections.json`、`entrance-rejections-final.log`。原本有效的合同被换为业务票／阶段工作项后，各入口均拒绝。 |
| 原始 Spec 验收正向编译 | 自动填充与显式引用均得到 `ready-for-lifecycle-review`，不产生批准；`compile-business-green.log`。修复前失败保留于 `compile-business-red.log`。 |
| 公开 Skill 导出 | 越界链接修复后，实际导出及 check 通过；`public-export-final.log`。 |
| 生命周期上下文查询及 YSS 集成 | 最终命令退出 0；`lifecycle-query-final.log`、`final-governance.json`。主生命周期 Skill 保持 8KB 预算内。 |
| 共享投影、锁、注册表、治理、交接工具同步 | 最终 7 个命令全部退出 0；`final-governance.json`。不包含下述仍失败的全 profile 同步检查。 |
| 高风险反例 | `counterexamples-final/` 保存实际权限否决、缺失阶段批准和无候选发布的拒绝记录；旧 `counterexamples/` 仅保留迭代历史。 |
| 旧交接工具 | 使用 Design 原提交 `77dcb2e4a1c69b28e42f1fe94dc932a9a469163a` 的实际工具读取新包，退出 1，报告不支持源用户决定策略；`legacy-capability-result.json`。 |
| 工作区保留 | 原主仓及 7 个子仓差异已有外部备份；未 reset／clean／stash。脏 profile 仅对匹配旧源字节的目标进行受 before_sha256 保护的同步，见 `profile-reconciliation.json`。 |

`final-source-inputs.json` 记录最终打包核对时的相关源文件及 CLI 快照摘要。后续复查 `final-input-recheck.json` 发现三套快照又有变化，其中 Design／Frontend 新增原型资产；其余列入清单的源文件未漂移。`current-business-module-bindings.json` 确认当前三套专用 CLI 快照仍保留本次已验证的业务模块摘要。这些清单不是完整工作区冻结或固定提交发布证明。测试使用合成 fixture，不代表真实 Agent 效率或 dataingest 产品批准。

## 四套 CLI 的本地集成

| 包 | 本地包版本 | 已执行 |
|---|---|---|
| create-yss-spec | 3.5.3 | 重建、打包、隔离安装、实际初始化；Spec／Design／工程阶段按需安装及重复安装。 |
| create-yss-harness-design | 0.8.10 | 重建、打包、隔离安装、实际初始化。 |
| create-yss-harness-backend | 0.4.14 | 重建、打包、隔离安装、实际初始化。 |
| create-yss-harness-frontend | 0.3.14 | 重建、打包、隔离安装、实际初始化。 |

四套均执行同步、重复同步、旧配置保留、用户文件保留、定制模板冲突可见，以及安装后业务正式化检查；44 个最终命令均符合预期。最终主 CLI 在公开导出修复后重新打包安装，其余三套相关运行模块也与源字节一致。见 `final-integration-results.json` 与 `package-evidence.json`；后者保存 tarball 摘要、当时的安装快照比对和实际生成模块摘要。随后变化的工作区快照不自动继承这些安装结果，后续原型资产组合尚需另行验证。

这些包均为 `sourceState=working-tree`，使用 `npm pack --ignore-scripts` 构造本地验收包，没有绕过发布边界宣布可发布。各 CLI 的 prepared 测试已实际运行：三个专用 CLI 通过；主 CLI 202／203 通过，唯一失败是 prepack 要求 committed 模板快照。详见 `prepared-tests.json`。固定提交、固定版本的正式发布证据尚未建立。

## 完整回归的失败边界

执行 `scripts/verify-template --concurrency 1`，报告包含 93 条结果：89 条退出 0、4 条失败，14 条后续检查未执行；`input_drift=true`。详见 `whole-workspace-regression.json`。不能把通过的子项拼接为全仓通过。

| 失败入口 | 原因与处置 |
|---|---|
| DESIGN.md lint | 当前 DESIGN.md 与 design-system-sync.yaml 摘要不一致，来自本范围之外的设计／原型修改；保留原修改。 |
| tooling Node 测试 | 同时命中设计摘要／投影、Vue 原型资产未配置 `.vue` loader，以及本次新增的公开 Skill 链接越界。最后一项已修复并单独重验通过；其余原型修改保留，不宣称该套件通过。 |
| 全 profile Skills 同步检查 | Design／Frontend 的设计资产、原型 Skill／资源及适配基线存在 19 项冲突；没有使用强制覆盖，也没有将这些冲突标记为已解决。 |
| `verify-strategic-handoff-tools-lock --require-committed` | 当前为工作树来源。用户未授权提交，保留正确的发布拒绝，不修改门禁。 |

回归期间共享工作区继续变化，本次也修复了导出链接并重建主 CLI，因此整轮报告存在输入漂移。最终定向结果和安装字节另行核对；全仓合并／发布前仍需在统一、稳定的输入上解决上述跨任务问题并重新串行验证。未执行的检查不记为通过。本次不落 `implementation-ready` 或 `release-ready` 的整体维护 checkpoint，也没有启动 PR、候选独立审查或发布。

## dataingest 与后续边界

[只读试点诊断](dataingest-read-only.md) 分别记录业务拆分缺失、工程前置未闭合、父 Ticket 与 checkpoint 不一致，以及当前批准范围校验失败。实际检查前后功能包和 tracker 摘要一致，证据为 `pilot.json`；未修改业务资产或历史批准。

存量启用需要显式迁移。回退可停用新规则入口，但必须保留资产读取及内容类型隔离，不能把新业务票解释成旧实现票。本轮不恢复已取消的多平台 Agent 评测，不宣称效率提升。

外部完整日志、构建包及安装实例：`/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-business-delivery-rc5sezwi`。仓内保存关键摘要和最终定向日志；外部目录不作为长期发布存储。
