# 生命周期结构化资产

## 格式与权威

新建 checkpoint、domain-strategy、stage-decision-package、task-package、approval-record 默认使用 JSON。Plan、Spec、评审正文继续使用 Markdown；仓库身份、注册表、Skill frontmatter、Slice、原始用户决定与捕获来源不在本轮迁移范围。

旧 YAML 继续读取。修改五类存量资产前显式迁移；历史验证、用户原文和旧批准原字节保留。迁移回执中的 source_to_target 标识原件为历史，当前消费者使用新显式引用；不能把目录里最后修改的文件当成权威。JSON 模板为当前入口，对应 YAML 模板仅供旧消费者兼容。

## 读取和写入

`scripts/contract validate <相对路径> --kind <类型> --root <项目>` 执行严格解析、对应版本 Schema 和原消费者检查；`--structure-only` 明确只核验结构，不能作为批准或流转证据。类型为上述五类，checkpoint 使用 `checkpoint`。校验引擎不从网络获取 Schema；本地引用缺失、重复键、未知版本、非字符串键、别名、非有限数及无法无损表示的整数均失败。

`scripts/contract plan-write <目标.json> --kind <类型> --input <候选.json> --root <项目> --output <仓库外计划.json>` 生成可审阅计划；`apply-write <计划.json> --root <项目>` 重新核验输入、Schema 和消费者后执行。候选应由解析后的对象修改得到；禁止字符串拼接合同。命令不批准合同、不生成用户回复。批准记录不可覆盖，应另发新记录。

写入前在隔离目录验证完整候选集合。计划绑定治理、工具和业务来源摘要；并发漂移即拒绝。受控写入使用排他锁、事务备份、临时文件回读与原子替换，事务信息保存在 `.yss/asset-transactions/`。多文件事务不是文件系统层面的整体原子操作；未完成事务阻断流转。`recover --root <项目>` 仅恢复本事务仍拥有的字节；活进程锁、后续编辑或损坏日志均不覆盖。

## 显式迁移

恢复自身也使用排他锁。若恢复进程被强杀留下 `recovery.lock`，工具保持阻断；需先核对记录 PID 已结束并保存事务目录，再清除该恢复锁重试，不能在活跃写入期间删除锁。

`scripts/contract plan-migrate <checkpoint.yaml> --root <项目> --output <仓库外迁移计划.json>` 沿当前引用发现五类资产，输出候选、来源摘要与阻断项，不写入产品资产。已完成任务包、历史结果、用户来源不转换。注释需审阅，原文保存在源文件和计划中；不静默丢掉仅存于注释的业务说明。

`apply-migrate <迁移计划.json> --root <项目> [--resolutions <处理证据.json>]` 在所有冲突解决后执行。处理证据含 `plan_id`、`items: [{ref, code, evidence_ref, evidence_digest}]` 和可选 `candidates: [{ref, kind, value}]`；只能覆盖计划内的候选，证据绑定当前字节。该记录仅证明处理依据可读；完整消费者校验与批准主体摘要核验仍执行，不能用它绕过批准。

新资产的批准必须绑定新字节和独立评审者。沿用用户决定按既有授权延续协议核验；未经核验不能复制旧 `approved`。旧资产 Schema 不合规时先报告修复，不能改字段躲过检查。只改序列化不升级业务 Schema。

## Plan 对照

`scripts/check-plan-stage-coverage --root <项目> --plan <Plan.md> --decisions <决定记录.md> --package <阶段包.json> [--mapping <对照.json>] --output <报告.json>` 提取决定表原编号和非目标表，输出来源行、原文、目标表述与摘要。无法识别的输入为 `unassessed`，不得宣称已覆盖。

非目标映射含 `plan_digest`、`package_digest` 和 `non_goals: [{source_text, source_line, target_index, target_text}]`。编号与映射只定位既有内容，不另造业务事实。`coverage_status: complete` 仅证明结构覆盖；独立评审仍逐项检查否定、范围、责任和承诺，包括编号正确但内容相反的情况。上游或目标变化后重新生成对照，旧报告不能证明当前语义。

## 版本取证

正式资产、事务回执、必要审查和验证证据纳入项目版本管理；临时日志按既有归档策略管理。没有 Git 历史时先保存仓库外原字节快照和纳入清单，取得本地提交授权后建立基线，再切换真实实例。提交、推送、发布仍是不同授权，不由迁移命令代办。
