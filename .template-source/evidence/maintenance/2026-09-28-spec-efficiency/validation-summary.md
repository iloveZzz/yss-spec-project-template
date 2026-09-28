# 当前验证与交付边界

当前实现覆盖五个方向，默认策略为 shadow。维护者自检针对授权边界、调用方兼容、来源绑定、错误返回、观察范围及回滚入口。以下为 2026-09-28 最终源码复验和此前适用回归的实际结果，原始日志均在本目录。

| 验证 | 实际结果 | 证据 |
|---|---|---|
| 新增针对性回归 | 27 / 27 通过，含查询漂移、权限负例、部分报告和专职分发 | focused-tests.txt |
| 既有合同视图及 validation-phase 回归 | 5 / 5 通过 | contract-regression.txt |
| 补充检查 | 118 条命令通过，含语法、投影、锁、研究包和旧任务包 | supplemental-verification/report.json |
| 四个 CLI 生成实例往返 | 4 / 4 通过，working-tree 来源 | distribution-smoke.json、distribution-smoke.txt |
| 核心变更完整检查 | 96 条唯一命令：95 通过、1 失败；另 1 条结果复用 | full-verification/report.json、full-verification.txt |
| 完整检查同组后续项 | 4 条在原运行中未执行，最终源码单独补跑全部通过；不覆盖原失败结论 | full-followups/report.json |
| 研究证据审计 | technical-evidence：4 claims、8 evidence、2 searches | research-validation.txt |
| L3 维护 checkpoint | implementation-ready 校验通过；不是发布批准 | checkpoint-validation.txt |

完整检查使用 `scripts/verify-template-fast --report-dir /tmp/yss-efficiency-final-verified`，因核心变更自动采用全量范围，未传限定文件。墙钟耗时 321.166 秒；其中 Node 工具回归 144 项测试通过。开始与结束输入摘要均为 `440440183363b97d98d7c8878c4a769f689d7fadfb8ee730a894c78a87b16041`，`input_drift: false`。

唯一失败为 `scripts/verify-strategic-handoff-tools-lock --require-committed`，退出码 1：当前来源为 working-tree。完整报告保留 `failed`；补跑和局部通过不改写该状态。补充检查、分发和测量各自绑定其运行时输入摘要；最后一次源码修订仅修复验证报告在部分执行时的计数，并经针对性与完整复验验证，未改变分发运行时。

## 实测范围

`query-measurement.json`：短路径预热 3 次、测量 30 次，函数内部耗时 p50 46.382 ms、p95 47.046 ms，子进程墙钟耗时另存每条 execution。与此前 82–94 ms 非同口径样本不计算加速率。

`selection-measurement/comparison.json`：同一合成 yss-research 文档影响、交替顺序、每策略 3 次，唯一命令 11 → 9，中位墙钟耗时 1580.654 → 1059.055 ms。操作系统缓存未控制，环境与负载已记录。该样本只证明局部执行减少，真实单仓/API/跨仓样本均为 0；真实 Token、人工等待和端到端首次验收数据未观测，保持 null。

四个 CLI 使用 working-tree 来源开发快照，实际包安装/初始化/sync、合同阅读、prepare-review、只读任务生产/执行/复核均验证。专职消费者保留各自的正式合同规则；项目实例只有进入模板维护分支时才加载维护校验器，不能因研究派发提前读取不存在的 .template-source。

已修复生成实例最小依赖闭包缺少只读入口的问题；仅添加真实入口，由既有模块闭包收集依赖。主 CLI 排除模板专用 selection/report 模块。

白名单不启用：局部样本的命令数量和耗时减少已经观测，但未提供覆盖所有允许文档语义变化的相关失败不遗漏资格。因此 qualification_ref 为 null；--selection allowlist 也回退 shadow，--selection legacy 可回原策略。真实项目效率样本为零，不宣称整体研发提速。

完整候选验证仍保留 --require-committed 的分发来源门禁。本轮未获 Git 提交、推送和发布授权，所有源码与快照保持 working-tree。该门禁失败不伪报通过，不能称 release-ready。固定提交发布集成必须在后续授权后重新构建和完整验证。

环境修复记录：初次全量检查因新工作树未生成 CLI 快照中断；第二次完成主要检查后发现 Node 工具依赖未安装及 working-tree 来源门禁。依赖已按 pnpm lockfile frozen 安装，无变更依赖版本。这些结果保留在 /tmp/yss-efficiency-full-1、/tmp/yss-efficiency-full-2，不作为最终通过证据。

回滚按设计分阶段执行；无需迁移现有项目、原决定或快照。Git 提交、推送、实际发布与付费 Agent 评测均未执行。没有产品 Spec、垂直切片 Ticket 或业务运行时代码变更。

最终全量结束后仅归档运行报告、日志并补全文档/checkpoint 引用，不再修改实现、测试、配置或分发字节。原始 JSON 中的绝对运行日志路径保留；对应文件已复制到本目录同名子目录，可通过 archive-manifest.json 核对归档字节。源码完整检查的摘要不冒充包含这些事后归档文件的摘要。
