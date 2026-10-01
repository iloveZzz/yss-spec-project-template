# 结构化资产修复与 JSON 迁移

本轮按五类资产实施：checkpoint、domain-strategy、stage-decision-package、task-package、approval-record。Plan / Spec / 评审正文保持 Markdown；身份、注册表、Skill frontmatter、Slice 和用户决定原始来源不转换。未提交、推送或发布。

## 根因与修复

换成 JSON 可以消除缩进事故，但无法修复决定错位、范围遗漏或验证器漏检。本轮将严格解析、权威 JSON Schema、原消费者语义校验串联；增加结构化写入、输入摘要、排他锁、原子替换、事务回滚和显式迁移。历史原件原字节保留，迁移回执区分当前与历史来源；新批准必须绑定新资产与独立评审主体。

Plan 对照工具保留来源行、D 编号、原文和包内表述，并绑定摘要。非目标必须提供显式映射；即使结构覆盖 complete，仍要求独立语义审查，不把编号匹配当成语义正确。

## 已执行验证

- 新资产定向测试覆盖重复键、未知字段、Schema 引用、并发漂移、失败回滚、历史权威切换、注释审阅、审批重新绑定及缺失决定。
- 阶段跟踪 23 项、读取视图与资产组合 27 项曾通过；后续最终定向结果另附日志。
- 阶段决策 v2/v3 正反例通过，额外覆盖 mapping.note 与重复 source_refs。
- 实例隔离副本五类真实资产的统一完整校验均 exit 0，见 pilot-validation.json。此结果不等于新 JSON 已批准。
- 全量首轮在修正代码与分发期间发生输入变化，已取消，不作为完整通过证据；最终隔离验证结果另附。

## 实例迁移边界

实例 Git 尚无提交，正式目录未修改。仓库外已保存实例摘要、隔离副本、迁移计划和模板变更前快照。迁移预检明确阻断：阶段决策批准文件缺失、领域战略批准需要重新绑定、YAML 修订说明需要审阅。详见 instance-migration-summary.json。不能通过复制旧 approved 状态来关闭这些问题。

后续先审阅纳入 Git 的正式资产与证据清单，取得本地基线提交授权；补齐真实审批和注释处置依据后重新生成迁移计划，执行完整消费者校验，再切换正式实例。无需把全部临时日志纳入 Git，也不应把整个 scratch 目录未经筛选一并提交。

## 复盘

不再维护字段白名单模拟 Schema；不对 checkpoint 或合同使用字符串拼接；决定内容和编号回到 Plan 权威来源。分发验收必须覆盖打包安装后的入口，本轮因此发现并补齐最小分发包遗漏 JSON 模板的问题。共享工作区有其他任务的未提交变化，本轮只对上述范围负责；分发快照为 working-tree，不能称固定提交可发布版本。

## 安装与实例补充验证

四个 CLI 均完成 npm 本地 tarball 打包、隔离安装、真实入口生成、Schema 正例 exit 0 / 反例 exit 1。工作树测试包使用 `npm pack --ignore-scripts`，未运行要求固定提交的发布 prepack，不代表发布验证。结果见 distribution-results.json；复现脚本 distribution-smoke.mjs 接受模板根目录参数并为每次运行创建新输出目录。

最新安装包使用真实 checkpoint 消费者完成迁移与当前 JSON 校验，并确认旧 YAML 被拒绝作为当前来源；原 YAML 字节未变。实例隔离副本中的补充检查器替换候选通过真实阶段包，并拒绝 mapping.note 与重复 source_refs，见 instance-adapter-probes.json。替换候选尚未安装到正式实例。

实例 D1–D16 和六项非目标显式映射后的结构覆盖为 complete；semantic_review 仍为 required。该对照不替代第 2 轮独立评审或真实批准。Git 基线候选为 49 个文件，见 instance-git-baseline-proposal.json；本轮未执行 add 或 commit。

## 最终核验边界

固定副本全量尝试执行 71 / 110 条命令，输入未漂移，但不是一次全绿运行：工具链旧夹具、YAML 写入测试、入口 8KB 预算及 working-tree 发布锁四项失败；组内失败使 39 项暂未执行。随后串行补跑 43 条，输入摘要一致：工具链整组、阅读视图、入口预算及资产测试重验通过。补跑曾发现边界派生视图遗漏并行新增 Skill、原型缺少作者工具目录；已分别由生成器刷新并通过 profile 同步及 17 项测试、按锁安装作者依赖并通过 4 项原型合同检查。原始失败记录保留，不改写成通过。

最新定向结果：资产 14、阶段跟踪 23、批准夹具 26、阅读视图 17、profile 同步 17 项通过；四 CLI 本地安装检查通过。入口压缩至 8189 字节，保留授权和门禁规则。另补充科学计数法 / 小数写法的不安全整数拒绝，防止精度丢失。

本轮只达到 implementation-ready，不是 release-ready。正式发布要求已提交 revision，当前工具锁为 working-tree；未提交、未推送、未发布，未把汇总结果包装成单次全量 exit 0。完整结果与补跑原始路径见 verification-summary.json、full-attempt.json、supplement-results.json。实例正式迁移仍未执行，须补齐批准、注释审阅及本地 Git 基线。
