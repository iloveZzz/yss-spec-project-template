---
doc_type: maintenance-design
status: completed
baseline_commit: e1337581036f55f66c00c7d40c042ad60f6c8190
created_at: 2026-10-18
moved_to: maintenance:archive/2026-10-18/2026-10-18-test-retirement-and-verification-dedup-design.md
---

# 过时测试与验证重复清理设计

本设计把当前审计发现落实为一轮模板维护：先修复漏测，再移除无消费者的代码，最后消除重复执行。依据是 `main@c37b6869c472891fc515e8e7e98200870762fca0` 的现行源码和本会话的定向实验；实验结果是审计证据，不是未来实现的通过证据。

## 1. 已确认问题与目标

| 编号 | 当前证据 | 本轮目标 |
|---|---|---|
| A1 | `check.template-release-sources` 按旧名称 `发行来源适配器` 筛选；实际测试名以 `发行来源收集` 开头。单独执行旧筛选时 TAP 出现 `1..0`，文件级条目仍通过 | 修改产物适配器或其测试时执行现有产物测试，不能用空匹配作为覆盖 |
| A2 | `verification-selection.test.mjs` 导入另外三份 `.test.mjs`；同时显式执行 selection 与 gates 时，同一“补充检查拒绝”用例出现两次 | 去掉测试文件之间的隐式注册，明确由检查登记选择消费者 |
| A3 | 普通检查与 supplemental 对 legacy coverage、CLI pin 重复登记；调度探针显示两个实际调用、无复用 | 发布仍必跑，每个逻辑套件只保留一条执行来源 |
| A4 | `assertBusinessCheckpoint` 的外部调用者只有两个旧测试；实际 checkpoint 入口调用原生校验 | 将两种业务边界通过真实 CLI 的检查结果验证后，删除旧 Node 函数和测试 |
| A5 | 两个旧 source consumer 导出只会抛错，唯一调用者是测试 | 删除内部空壳及两个断言，保留 worker / 报告对退役任务的拒绝 |
| A6 | `compactLegacyCoverage` 仅被反向压缩回环测试调用 | 删除一次性压缩器和该测试，保留历史读取与固定摘要 |
| A7 | 来源测试生成的旧 Go 装配器不再被调用；临时副本删除约 1.7 KB 后目标测试通过 | 删除无效夹具准备，保留仍实际编译和消费的 Go 来源夹具 |

本轮不删除完整测试文件。A5–A7 的直接删除量约为 33 行、4.3 KB；检查登记与必要回归会产生其他改动，因此不承诺最终净行数或耗时比例。

## 2. 全局约束

- 只修改模板仓；不修改、采用或发布 yss-cli，不改变 CLI pin、Bundle、来源锁或证据 Schema。
- 不新增依赖、测试框架、跨轮缓存或通用测试去重器；复用现有 `mandatoryChecks`、任务编译和独立报告核验。
- 未知路径、缺输入映射、非法依赖和陈旧证据继续拒绝；fast 保持 `limited`，release 保持 `committed`。
- 历史固定提交、117 条覆盖、历史摘要及恢复语义保持原义；不批量删除历史路径映射。
- 不按 retirement、legacy 或 frontend 等文件名批量删除测试；用户资产保全、协议拒绝和权限回流反例继续保留。
- 实现使用隔离工作树并保留用户原有修改；提交、推送、合并、安装和发布须有对应授权。
- 验证只覆盖本轮改动及真实消费者；没有执行的检查、正式发布或平台资格不得声明通过。

## 3. 检查登记方案

### 3.1 产物检查独立于名称筛选

保留 `check.template-release-sources`，只运行 `.template-source/scripts/tests/template-ci.test.mjs` 的三个来源场景，筛选表达式为 `固定发行拒绝缺失|发行验证在有 yss-cli 固定文件时|浮动版本与脏树`。

新增 `check.verification-artifacts`，命令为 `node --test tests/verification-artifacts.test.mjs`，资源为 `native-cli`、`go`，普通影响面包含该测试、`verification-artifacts.mjs` 及 CLI pin。两项都消费适配器源码；只修改产物测试时不再附带三个来源检出场景。新检查属于 `check.verification-final-integrity`。

### 3.2 发布必跑复用现有选择器

当前 release 的必跑集合由现有 Gate 派生。新增可选配置 `profiles.release.required_checks: string[]`，通过现有 `mandatoryChecks` 合并选入；不新增 Gate 或报告字段。缺省为 `[]`，显式值拒绝非数组、非字符串、空 ID、重复 ID 和未知 ID，错误前缀为 `RELEASE_REQUIRED_CHECKS_INVALID`。

本仓当前清单固定为：

1. `check.release-profile-consumers`
2. `check.daily-execution`
3. `check.verification-script-retirement`
4. `check.daily-preflight`
5. `check.verification-report-v2`
6. `check.verification-artifacts`
7. `check.legacy-coverage`
8. `check.yss-cli-pin`

保留 `check.release-profile-consumers` 的五文件批次，避免为同一职责拆出五套配置。新增 `check.verification-report-v2` 单独运行 `tests/verification-report-v2.test.mjs`；`check.daily-report` 只运行 `tests/verification-report.test.mjs`。两项保守保留原 daily-report 的输入、资源和 Gate 绑定，第一轮不继续缩减影响面。

删除三个重复 supplemental 登记：`check.legacy-coverage-supplemental`、`check.yss-cli-pin-supplemental`、`check.verification-optimization-regressions`。被替换的必跑检查显式继承 `committed`；保留旧 supplemental 的 Gate 责任并集：CLI pin 继续关联原 fixed-source 与 lifecycle；原 optimization 批次对应的普通检查继续关联 final-integrity，原 distribution 责任也保留。

普通 fast 不读取发布必跑清单；无关文档变化不触发这八项。历史报告仍按其固定提交中的配置独立编译，不用当前清单重写历史。

### 3.3 消除隐式套件与批次交叉

删除 selection 测试中的三个副作用 import。`check.daily-selection` 改为运行完整的 selection 文件，去掉依赖旧测试名称的长筛选表达式。组内 `check.verification-selection` 也只运行 selection 文件，移出 report 文件；原 report 责任由已有 `check.daily-report` 消费。

将原 daily-selection 中的 `tests/verification-gates.test.mjs` 输入移交 `check.release-profile-consumers`。原组内报告检查涉及的输入映射应仍能选中 daily-report；不丢弃任一旧生产消费者。为显式 `legacy` / `shadow` 组选路径在 candidate-integrity 组登记同 ID、同命令、同资源的 `check.release-profile-consumers` 和 `check.daily-report`，保留移出 import 的套件及原 report 责任；不新增别名 ID。保留 selection 文件里的全部实际测试，不为减数量删除断言。

## 4. 删除范围与前置

| 可删除项 | 删除前必须保留的行为 |
|---|---|
| `prepareCliSourceConsumer`、`validateCliSourceConsumer` 及其两个断言 | 旧 `source-test-consumer` 在 worker 执行前拒绝；报告不能挂靠旧源码回执 |
| `compactLegacyCoverage` 及“压缩再展开”测试 | `expandLegacyCoverage`、历史固定提交、117 条覆盖与摘要 `8fdcd99b97a508b39602fd0e0ec4048c9c9cbfdb84fc1444b316e3a9b5ea70c5` |
| 产物测试里生成 `tools/package/main.go` 的语句 | 现行 `main.go` 来源夹具、真实 `go build`、固定二进制与干净来源拒绝 |
| `assertBusinessCheckpoint` 及两个旧测试 | 真实 `yss lifecycle verify` 返回的 `business-checkpoint` 检查分别证明缺集合拒绝、进入正式化允许草案、离开时拒绝草案 |

checkpoint 迁移复用 `tests/business-ticket-native-report.test.mjs` 的 `approvedSpecFixture`、原生 `run` 和现有来源夹具。不得新增并不存在的公开 `contract --kind business-checkpoint`：该名称目前是内部语义校验器。正向场景检查公共返回中的业务检查通过；其他门禁的失败须如实保留，不将某一检查通过写成整个 checkpoint 已通过。

若当前固定 CLI 无法提供所需公开检查，A4 保持待处理并保留旧函数；不在本计划里放宽测试、改 CLI 或刷新 pin。其他任务可独立完成。

## 5. 验收

- AC1：产物源码或测试变化会执行实际现有用例；按登记命令替换测试文件为同名 sentinel 后，`发行来源收集` 确实写入执行标记。
- AC2：显式执行 selection 与 gates 时，“补充检查拒绝”仅出现一次；三个被移出 import 的套件仍由独立登记消费。
- AC3：空差异、策略变化、pin 变化三类 release 计划均保留八项必跑；各目标测试模块在完整编译计划中只有一条实际执行来源，Gate 责任、committed 和失败拒绝不减。
- AC4：两个业务 checkpoint 场景通过公共 CLI 消费后才删除旧函数；陈旧输入、缺集合、草案越过正式化仍拒绝。
- AC5：三处直接清理完成后，历史摘要、产物来源、安装树污染、旧任务及回执拒绝回归继续通过。
- AC6：独立报告消费拒绝少一个必跑任务或篡改 Gate / 执行来源的报告；固定历史报告读取保持原义。

## 6. 验证与交付界限

执行者按任务记录真实 RED / GREEN、删除前后的原有回归、定向调度观察及实际未覆盖范围。纯删除已有无消费者代码不新增“函数不存在”镜像测试，也不制造假的 RED。新选择行为及新增公共入口覆盖执行 RED → GREEN；已正确的旧行为测试先通过可记作迁移基线。

去重前后使用同一个计划场景观察逻辑套件、实际调用次数和墙钟时间；调度桩只能证明调用路由，不能替代真实测试或成为性能百分比。最终交付目标是本地 `implementation-ready`，不自动提交、合并或申请发布资格。
