# 维护者自检

本记录由本轮实施者完成，不作为独立审查或产品会签。范围依据用户确认的优化计划；仓库身份 `template-source`，整体按 L3，触发 `permission-boundary`、`core-validator`、`aggregate-behavior-change`。业务词汇对账为 `not-applicable`：本轮维护模板规则、工具与测试，不增加真实业务上下文词汇；仍消费根 CONTEXT 合同。

## 规则与行为

- 新建 Project Scaffold Contract 统一说明为 schema v4；历史后端 v3 只读恢复能力未删除。Slice v3、Data Decision v1 等独立合同未按版本数字批量修改。
- API Decision 的 `prepare` 仍产出 v2，消费端保留原有 v1/v2；本轮修正主控、编译器、DDD/MVC 与 OpenAPI Skill 的说明，未重写历史决定或批准。
- Reviewer 数量引用现有 `gate_consolidation`。统一候选、实现 / 审查身份分离、mandatory 检查仍保留，没有把“人数默认一个”改成“可以自审”。
- Plan 提示同时呈现当前决定与已验证延续两条路径；准备器仍返回 draft/pending、`approval_created=false`。发现两种证明同时提供被静默接受，补 `user-decision-proof-conflict` 阻断与反例；单一路径合法情况仍由原完整验证器判断。
- 生命周期状态命令仅给只读投影，不调用远端、不写 checkpoint、不执行推荐命令。新增检查范围、诊断、argv 数组下一步和 `execution_authorization=not-evaluated`；未知摘要 / 批准不报通过。当前所有者仍为 registry、checkpoint 和 orchestration。
- 运行中 / 未知结果先查既有任务；已完成先核验证据并重算路由。没有动作身份时不承诺外部幂等，没有自动派发或重做。恢复正文要求输入变化后复验，不另建状态机。

## 模板与分发

- 只调整上游目标引用与阶段细化、页面地图衔接、实际验证证据、发布 / 回滚及复盘行动表达。两组试填见 [template-trials/review.md](template-trials/review.md)，失败、拒绝与恢复未从模板中裁掉。
- canonical 位于 `.agents/skills`。通过既有同步命令处理投影、技能锁和 profile；4 个特化补丁保留原变体差异，仅重基于对应 canonical 文案。重基前原补丁应用结果与实际目标一致，备份见 `before-extra/`。
- 共享批准校验器变更按 `sync-strategic-handoff-tools` 同步；核对后才覆盖 3 个消费者同源文件。未提交、推送、发布或宣称 fixed-source release-ready。
- 初次全量检查发现证据 fixture 令 Git 文件清单超过默认输出缓冲；退役 ID 检查改为先在 Git pathspec 排除原规则已豁免的 evidence、CodeGraph 和 submodule。有效资产检查范围未缩小，真实失败与修复后通过均有记录。

## 评测器与反证

- 保留真实 AGENTS 原文并附隔离边界；缺必要来源先失败；场景文件不能通过 `./AGENTS.md` 等等价路径覆盖规则或越出 fixture。
- 多步场景共用磁盘，新建运行时会话；记录各步运行前输入摘要，超时终止步骤进程组，未 completed turn 或断言失败不记成功。
- 旧 CLI 缺 Code Mode host、隔离环境缺 Python user-site 依赖均实际暴露并保留；用配套 CLI 和离线复制的依赖闭包修复。真实校验在相同隔离环境预检通过后才重启正式批次。没有安装依赖、联网拉取或改变被测来源来放行。
- 固定基线、候选、评测器、场景、模型、推理档位、运行时与依赖分别保留摘要。评测来源快照仅用于用户批准的对照实验，不是治理协议的独立审查候选。
- 自动断言与维护者语义复核分开；原始失败、超时与未运行步骤保留。命令替身、合成批准和组件场景不能认证真实业务构建、跨仓接收或部署。

## 验证边界

[定向新鲜验证](fresh-focused-verification.json)包括评测器 12 项自测、状态场景、决定冲突、追踪与退役清单检查；此前 Plan、API、流转、registry、投影和分发检查另有执行清单。完整 `verify-template-fast` 因实际影响面升级为全量，其原始退出码与失败项必须独立保留，不因定向通过改写成全绿。

真实项目见 [auth-backend 接入报告](auth-backend-pilot-readiness.md)：只读发现当前合同 / 阶段依据缺口，18 项前端与 4 项后端定向测试通过；迁移计划 34 项冲突并保持 blocked。真实试点接收、固定提交来源验证、Git 与发布动作尚未闭合。正式 48 次对照与语义复核已完成，双方各 22/24 通过，UI 各两次超时。候选总耗时增加 3.8%，不据此宣称效率改善；UI 延长至 600 秒的 4 次补测均完成且通过维护者语义复核，原主批次失败保留。结果见 [Agent 评测报告](agent-comparison-report.md)与[补测报告](ui-supplement-report.md)。

补充自检：OpenAPI 职责段改为引用现有第 3 步，避免重复版本。原型证据历史描述未改其稳定 ID 语义，只补阅读注释明确现行 public_description；首次直接改写被原校验拦截，失败保留。七项补充定向检查全部 exit 0，见 [post-doc-focused-verification.json](post-doc-focused-verification.json)。冻结评测候选保持不变，最终源字节差异见 [post-comparison-source-delta.json](post-comparison-source-delta.json)。

最终源字节复验：`nice -n 15 scripts/verify-template-fast` 升级完整检查，307.74 秒、exit 1，90 项顶层检查中 89 项通过，唯一顶层失败为 committed-source 门禁，见 [full-check-post-docs-summary.json](full-check-post-docs-summary.json)。后续原始输出中的预期负向 fixture 失败不另算顶层失败。没有为了通过检查改变稳定 ID 基线或来源状态。

模型运行已经全部结束。主批次与补测执行窗口 166.21 分钟，未超登记的 180 分钟；所有阶段合计保留 68 次 CLI turn 轨迹，其中 5 次缺 usage，不按零成本处理。三份证据归档可读，来源快照、原始失败与语义记录保留，原始目录未清理；资源与覆盖边界见主报告链接。
