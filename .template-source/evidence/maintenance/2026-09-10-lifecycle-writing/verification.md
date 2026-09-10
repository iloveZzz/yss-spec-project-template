# 写作草案维护验证

日期：2026-09-10；范围：本目录的规范草案、三组对照及研究依据。

## 维护判定

- 仓库：`template-source`；本轮为非生效的文字提案，按 `maintenance-intensity.yaml` 的 `textual-only` 归为 L1。
- 当前合同、技能、模板、投影、lock 和状态计算均未改变；后续正式接入需按实际影响重新分级。
- 产品 Spec、原型、OpenAPI、垂直切片及 `context_reconciliation`：`not-applicable`，原因是仅维护可复用写作提案，没有产品工作单元或词汇变更。
- TDD：`not-applicable`，原因是仅新增非生效文档；以研究校验、链接检查、逐项语义自检和既有 fast 核验验证。
- Reviewer：未派发；下文为起草者维护自检，不是独立审查。
- Git：本轮开始时 `git status --short` 为空；完成草案后的变化仅为本目录。没有 commit、push 或发布授权，未执行这些动作。

## 已执行的验证

| 检查 | 实际命令 / 方式 | 结果与范围 |
|---|---|---|
| 研究包 | `node .agents/skills/yss-research/scripts/validate-research-package.mjs .template-source/evidence/maintenance/2026-09-10-lifecycle-writing/lifecycle-writing-research-brief.md .template-source/evidence/maintenance/2026-09-10-lifecycle-writing/lifecycle-writing-evidence.yaml` | exit 0；2 个 claim、4 个 evidence、4 条搜索记录；证明结构和引用关系通过，不证明效果 |
| 仓库 fast | `scripts/verify-template-fast` | exit 0；fast 未升级；证据索引、52 项 tooling 测试和 vendor 检查通过 |
| 空白检查 | `git diff --check`，并以 Python 检查本目录未跟踪 Markdown 的行尾空格、代码围栏和本地链接 | exit 0；初始三份 Markdown 的 8 个本地链接可读，无尾随空格或未闭合代码块 |
| 语义自检 | 对照 `rewrite-comparisons.md` 的输入表和保真核对表，逐项检查 P1–P6、S1–S7、T1–T6 | 19 项均有承接；未发现新增工期、收益承诺、API 或批准状态 |

源文件固定到 revision `7b9069b39972e269e61bd95c2f66ebb90cac6a02`，SHA-256 记录在相邻 evidence 文件；没有安装上游技能。来源核对只支持研究简报中收窄后的陈述。

## 当前结果与后续边界

已形成可审阅的写法和对应例子。`implementation-ready` 仅表示本次维护草案交付及核验完成，草案仍未生效，不代表正式模板接入、模型效果验证、独立审查或可发布。

尚未进行真实模型三条件生成、盲评及中文读者测试，因此不报告改善比例或显著性。下一步由用户审阅写法；正式接入时再修改权威规范、模板及加载入口，并验证实际生成行为。
