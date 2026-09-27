# 本轮验证返工记录

本记录解释实际失败与修复，评测结论以[实施记录](implementation-report.md)和正式运行清单为准。维护者为当前主控；不是独立审查或发布批准。

## 事实与原因

首次 Agent 校准使用终端 CLI，运行时缺配套 Code Mode host，39 秒后未产生工具执行。改用本机 Desktop 配套 CLI 后，状态与运行中任务两个样本实际完成。此失败属于运行环境，不进入产品对照分母。

正式预检对 Python 依赖的隔离程度检查不足：主环境能运行验证器，Agent 的隔离 HOME 无法发现用户级 jsonschema。首批运行在有效 Plan 场景失败，随后停止并保留原始轨迹。修复采用离线依赖闭包、逐文件摘要及隔离 PYTHONPATH；在与 Agent 相同 shell 和环境下执行原验证器，之后完整重启两侧对照。没有通过放宽批准条件解决依赖问题。

完整模板检查曾因证据 fixture 数量增大，Git 文件清单超出子进程默认输出缓冲。退役 Skill 检查原本就在过滤 evidence、CodeGraph 与 submodule，但过滤发生在获取全部清单之后。把同一豁免前移到 Git pathspec 后，清单检查通过，有效资产范围没有缩小。

主批次基线和候选各两个 UI 样本在 300 秒截止时尚未写出要求的三份文档。轨迹显示规则与模板读取，无法仅凭超时判断模板缺陷或断言最终质量。主实验继续保留相同限额和失败，不用成功补跑覆盖原结果。

原型证据的历史 `description` 属于稳定 ID 语义快照，而 `public_description` 承载当前版本说明。直接对齐两字段触发原校验阻断后，恢复历史描述并添加明确阅读注释，未改基线摘要；OpenAPI 职责段则消除重复版本声明。比较来源保持冻结，后续修正有单独字节差异和新鲜校验。

## 修复与后续验证

| 既有工作包 | 已处理或下一步 | 关闭依据 |
|---|---|---|
| C1 运行环境 | 使用配套 CLI；离线依赖复制和哈希进入 runner，预检采用实际隔离环境 | `python-dependencies.json`、`C-isolated-fixture-readiness.json`、`C-isolated-crossrepo-readiness.json`、12 项 runner 自测 |
| D1 验证清单 | Git 从源头排除既有豁免目录 | `retired-inventory.log` 与最终全量日志；全量总失败仍保留 committed-source 限制 |
| C2 UI 成本 | 主批次两侧各 22/24 通过；四个 UI 超时保留。双方各两次 600 秒补测均通过，不回填原评分 | `semantic-review.json`、[补测报告](ui-supplement-report.md)、[资源台账](all-evaluation-resource-ledger.json)；缺失 usage 不计作零成本 |
| C3 存量恢复 | 按实际内容区分静态治理与动态项目资产，核清说明 / metadata 差异 | `auth-migration-conflict-triage.json`、`auth-profile-evidence.json`；真实迁移尚未执行 |

上述行动复用原维护计划编号，不另建生命周期状态。主实验与补测已结束；补测成功没有覆盖环境失败、初次验证失败和 timeout。正式与补测执行窗口 166.21 分钟，完整资源台账含校准共 68 次 turn 尝试；未验证单价，不估算金额。最终源码全量检查 90 项中 89 项通过、实际 exit 1，剩余为 committed-source 门禁。固定提交来源、真实项目接收和部署证据不由这份复盘替代。
