# 脚本性能优化：实现与 L3 自检

本记录只描述本轮源码维护。最终状态、量化结论及 Fresh Verification 以同目录 `report.md` 和 `checkpoint.json` 为准。

## 路由与边界

按根 `yss-project.yaml` 的 `template-source` 身份执行 `yss-product-lifecycle → maintaining-skills`。修改涉及核心验证、生成语义、跨仓共享依赖和事务协议，因此为 L3。目标为 `implementation-ready`；普通迭代采用维护者 self-check，不创建冻结候选或正式独立审查。产品 Spec、Ticket、Slice Contract、产品工作单元的 Context reconciliation 和 `ready-for-agent` 均为 `not-applicable`：本轮维护模板工具，没有批准或实施产品切片。模板 Context 合同仍由完整核验检查。

实际源仓不提交、不推送、不发布。测试仓中的合成 commit 只用于固定 revision 的生成与消费；`integration.json` 列出其来源和 revision。正式专职 CLI 锁、vendor 和模板快照保持原状态。

## 权威源与实现

| 候选 | 实现决定 | 权威与传播 |
|---|---|---|
| P01 | 同步有序 schema 批量 API 在一个 Python 进程内复用 validator；单项接口保留。compact/verbose、格式检查差异按调用者保留。战略来源的两个 schema 在结构语义检查前合批。Context reconciliation 导出可组合 API，CLI 包装保持命令与错误前缀。 | `scripts/lib/json-schema.mjs`、`context-reconciliation.mjs`、`strategic-handoff-io.mjs`；共享工具清单同步四 Harness。Plan entry 仅修改本体和已有该入口的 Design 变体。 |
| P02 | 保留既有纯 Context 解析复用。没有增加跨调用目录扫描通过缓存；输入、输出、导入和可变目录边界继续重检。目录规模采样未证明应引入额外缓存。 | 本体 `context-contract.mjs` 及已有共享同步链。 |
| P03 | 复用已有合并查询；runner 的开始、完成、失败、耗时和 profile 升级原因写入 stderr。JSON stdout 仍可解析。保留既有并发上限及组内顺序。 | 本体与四 Harness 各自持有的 runner/profile；仅移植共同执行反馈变更，不覆盖 profile 定义。 |
| P04 | 单次检查 memoize canonical tree hash；一次 `git ls-files -z` 构造受跟踪文件和祖先目录集合。每个目标投影仍检查路径、symlink 和内容；下次调用重新读取。 | 各仓 `skill-supply-chain.mjs` 变体；`update-skill-lock` / `sync-skills` 生成技能投影。 |
| P05 | 两个独立专职实例初始化使用 `Promise.allSettled`，上限 2；失败后等待双方完成清理。保留源场景和生成实例场景。复用只读 CLI 模板基底，每次运行创建独立可写目标；未增加另一层持久测试缓存。 | 本体 `.template-source/scripts/verify-delivery-harness-distribution.mjs`；已有旧三 CLI 分发并发方式保留。 |
| P06 | 三旧 CLI 显式区分 `test:unit`、准备好的快照测试和集成测试；Spec 已有的单测入口保留。默认 `pretest` / `prepack` 仍准备当前快照。临时准备一次的快照由各测试消费，各自创建目标。 | 三个 CLI 的独立 `package.json`、原 `sync-template.js`；无正式快照手改。 |
| P07 | `syncCore` 仅归档固定 commit 的 core 子树；`syncTemplate` 保留完整归档，只复用单次 capture 的物理文件字节和摘要。 | `.template-source/cli-core/build.mjs` → `sync-core` / `sync-template` → 临时专职 CLI。 |
| P08 | 新事务 schemaVersion 2 使用追加式 `intent.wal`；旧 journal/progress 恢复读取保留。操作日志预先记录临时文件路径，意图先于目标写入；文件 fsync、rename 保留；目录在 metadata 和提交屏障前集中刷盘。单次 bundle load 按摘要复用已验证 blob，每个逻辑文件获得独立 Buffer。 | `.template-source/cli-core/transaction.mjs`、`bundle.mjs` → 受锁 core 同步链。 |
| P09 | 包清单校验捕获的字节直接用于当前物化；避免重复读同一已校验输入。累计字节计数改为线性维护。安全路径、额外文件、审批、摘要和输入/输出边界校验保留。 | 本体 strategic-handoff/backend-delivery 共享工具 → 四 Harness → CLI → 生成实例。 |
| P10 | DDD 和前端 runner 保留固定 Maven / pnpm 命令，增加阶段计时、脱敏日志、可选超时和失败记录。DDD 异步 API 支持 AbortSignal；同步调用者通过 worker 获得执行监督。 | canonical 技能脚本；DDD 在 Dev/Backend 的已确认 schema/profile 变体采用对应补丁。 |
| P11 | fetch 即使未配置超时也由 worker 监督；未配置时仍无新增超时预算。已有 commit cache hit 路径继续验证来源和 object。取消/超时停止进程树；父进程退出时 worker 也清理其负责的 fetch 临时目录。self-update 保持既有命令和预算，仅使用本地 mock 验证。 | canonical core `command-runner.mjs` → 共享工具清单生成本体、四 Harness 和三旧 CLI 的对应文件；core updater 通过 sync-core 分发。 |
| P12 | 从批准 commit 归档导出，排除 checkout 中的未跟踪缓存及未提交修改；输出文件处理与 manifest 收集合并为一次遍历。保留 binary、大文件、锁文件、可执行权限和 symlink 原文，不对 symlink 解引用替换。 | canonical 前端生成技能 → `update-skill-lock` / `sync-skills` → 本体 CLI 快照；四专用 Harness 当前未配置该生成技能，不擅自扩大其技能集合。 |

## 持久化顺序自检

1. 初始 journal、状态目录祖先链以及新目标目录的父链先持久化，再进入目标写入。
2. 初始 journal 为每项预先绑定临时文件路径；路径由事务 ID 与索引派生，后缀长度保持不变，避免缩减原可接受文件名长度。原内容备份完成后，持久化空 WAL 及 apply journal；每项追加含操作索引和新目录信息的意图并 fsync，然后才写目标临时文件。
3. 目标临时文件写入、mode、文件 fsync 和原子 rename 保留。删除也登记受影响目录。目录屏障按照子目录先于父目录刷新，metadata 仍最后提交。
4. verify 和 committed 标记只能在目标目录屏障后写入。WAL 恢复接受完整连续记录，拒绝完整损坏记录；未换行尾部不能证明已允许目标写入，按未完成 append 处理。
5. 恢复会清理能够用事务路径、预期摘要和 mode 证明归属的目标临时文件；不清理未成功独占创建的文件，活进程清理还核对 inode/device。恢复继续校验身份、备份摘要、每个操作的 before/after 和用户后续修改。不能证明归属时保留恢复清单并失败。回滚也刷新目录，不能把简单删 fsync 视作优化。
6. 测试涵盖异常、进程 SIGKILL、中断旧事务、并发修改、权限和目录恢复。另有“未刷盘 rename 丢失后出现 before/after 混合状态”的持久化模型，以及 WAL/file/rename/目录/metadata 的顺序观察。模型和进程终止均不是物理断电实验。

## 回归修正

- 持久化中断矩阵新增 `target-fsync/kill` 反例，发现恢复可能留下目标临时文件却宣布 rolled-back。已让初始 journal 记录临时路径，并验证 fsync 后 rename 前中断、临时文件后续修改及独占创建前抢占。完整 core 测试为 40 项；详见 `retrospective.md`。
- 首次 DDD 场景要求既有 `[REDACTED:变量名]` 格式；共享 runner 最初只输出通用替换标记。已保留原命名格式并加入跨 chunk 秘密串测试。
- 持久化顺序自检补齐新目标父目录刷盘，并验证其失败时尚未写业务文件。目录恢复与保留的事务审计日志分开断言。
- 前端导出临时目录清理前保留 symlink 原文，并把 symlink 纳入生成清单；可执行文件替换后权限不变。
- 补充同步调用者被直接终止后的 worker 监督和临时资源清理，避免只测试异步 AbortSignal。
- 审计隔离器原本排除 `.vscode` 和 `.git`。集成夹具因此丢失受跟踪 MCP 配置及源码身份，已在临时仓恢复后重跑，保留失败记录。
- 临时源码补丁更新后曾遗漏实体技能投影刷新；`sync-skills --check` 拒绝该漂移。随后通过正式同步工具刷新临时投影与快照，失败样本不计作性能收益。
- 一次证据 runner 错将 shell 入口交给 Node，退出 1；这不是源码测试结果，最终通过可执行入口重新核验，原失败日志保留。

## 本地验证与外部边界

所有执行器故障测试、Maven/pnpm 成功或失败替身、服务 revision 测试均为本地维护夹具。没有测真实 Maven 私服、真实项目构建、远端 fetch 或实际 npm self-update；不据 mock 耗时推断其真实收益。测试会执行临时仓本地 Git 操作和回环服务，不发布产品。

完整核验按当前影响面自动升级，不能裁剪核心检查。发布仍须未来正式提交、更新分发锁并完成发布门禁；本轮完整核验通过也不会自动将维护状态升级为可发布。
