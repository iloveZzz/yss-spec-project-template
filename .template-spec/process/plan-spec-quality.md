# Plan / Spec 内容诊断

本说明持有可选创作格式 `content_profile: plan-spec-v1` 与只读诊断用法。生命周期阶段、门禁、批准及工作单元仍引用 [生命周期注册表](lifecycle-registry.yaml)，中文写作仍引用 [文档规范](document-writing.md)。本工具不修改文档、状态、批准或就绪结果，不输出流转许可。

## 起草与单一事实来源

Plan 使用 [权威 Plan 模板](../plan/templates/plan-template.md)，Spec 使用 [权威 Spec 模板](../templates/spec-template.md)，常规入口与 `to-spec` 共用它们。Plan 负责战略决策，Spec 定义可观察行为；技术架构、OpenAPI Freeze、切片实现由现有下游阶段承接。

新文档默认带 `content_profile`；它不是生命周期 schema 或批准状态。既有文档无需批量迁移，历史批准、交接快照与 YAML 合同保持兼容。明确选择的存量功能可以改用新格式，实质变化按原有用户决定协议处理。

已有决策包时，成功标准的指标定义、基线或未知原因、目标及确认状态、观测窗口、数据来源、验证方式和补齐动作写入现有 `success_criteria[].statement`，Plan 使用 `success-criterion.*` 的权威引用表。关键取舍复用 `decision.*`，无需新 schema，也不凑固定数量候选。该 statement 的内容完整性由人工审阅；工具只核验引用。未命中决策包的轻量场景使用 Plan 直接填写表。

## 可机械读取的约定

正式条目放在 Markdown 根层级表中，第一列表头为 `ID`，位于模板的“功能需求”“非功能需求”“验收标准”“未决项”“成功标准”章节内（支持章节数字前缀）。表头使用模板原文；一张表对应一类条目。代码块、引用块、列表内示例，以及“示例 / example”标题下的表不会计入正式条目。未支持的表达会报告未评估，不根据关键词数量推断覆盖率。

- FR / NFR / AC ID 在同一功能内稳定，重排不重新编号，删除后不复用。Q 为当前文档的未决项 ID，SC 为轻量成功标准 ID。工具只识别显式基线，无法证明全部历史中从未复用 ID。
- 需求的“验收引用”填 AC ID；AC 的“需求引用”反向填 FR/NFR ID。多个 ID 可用逗号分隔。验收待补时填写 `待补 Q-001`，未决项登记负责人、补齐动作、时点、接收方和影响依据；工具报告“未评估验收覆盖”，是否可延期仍由现有门禁决定。
- NFR 可用数值及单位，也可用定性判断依据；测试、检查、分析、演示都是合法方法。未知目标保持候选状态并关联 Q，工具不判断目标是否合理。
- 没有适用约束的条件章节写 `not-applicable：具体原因`。不保留空白占位行。确定性诊断只检查支持的章节和字段，其他条件项由人工核对。

“来源引用”“数据来源”“权威引用”使用项目根相对路径和定位器：

```text
docs/input.md :: id:rule.submit
docs/input.md :: heading:原始需求
contracts/decision.yaml :: id:success-criterion.attachments
[S1](docs/input.md)
[输入](docs/input.md#heading:原始需求)
```

多个来源用 `；` 分隔。Markdown `id:` 匹配根层级表第一列已有 ID，`heading:` 精确匹配实际标题文字，不生成锚点。YAML/JSON 的 `id:` 匹配已有对象 `id` 字段或映射键，匹配多处即歧义。Markdown 链接以明确 locator / 标签定位，普通网页 slug 不自动推断。链接仅用于读取，不执行内容。来源文件最多 8 MiB、UTF-8、真实路径须在项目根内；外部 URL 不联网，提示补充本地证据快照。不递归追踪来源中的更多链接，不扫描整个仓库猜关联。

## 命令与报告

```bash
node scripts/inspect-plan-spec check --root . --plan docs/feature/plan.md --spec docs/feature/spec.md --json
node scripts/inspect-plan-spec check --root . --spec docs/feature/spec.md --slice docs/feature/slice.yaml
node scripts/inspect-plan-spec diff --root . --before docs/baseline/spec.md --after docs/feature/spec.md --json
```

`check` 至少指定 Plan、Spec 之一，`--slice` 可重复且需要 `--spec`。默认向 stdout 输出文本；`--json` 输出 JSON。文本和 JSON 绑定相同工具版本与所有实际读取文件的 SHA-256，报告包含发现、位置、条目 ID、恢复建议、未评估项和人工审阅范围。无发现只表示支持范围内未发现机械问题。

| 退出码 | 含义 |
|---|---|
| 0 | 诊断执行完成，可有重复 ID、断链、内容缺漏等发现 |
| 2 | 输入缺失 / 不可读、解析未完成或输入在读取期间漂移；需恢复并重跑 |

主要规则：`DUPLICATE_ID`、`INVALID_ID`、`DANGLING_REFERENCE`、`REFERENCE_KIND`、`REFERENCE_MISMATCH`、`AC_MISSING`、`REQUIREMENT_MISSING`、`REQUIRED_FIELD`、`PLACEHOLDER`、`UNKNOWN_TARGET`、`UNKNOWN_BASELINE`、`TARGET_STATUS`、`NA_REASON`、`SOURCE_FORMAT`、`SOURCE_LOCATOR`、`INPUT_UNREADABLE`、`PARSE_ERROR`、`INPUT_DRIFT`。缺少结构的章节使用 `SECTION_MISSING` / `SECTION_UNPARSED`，旧格式使用 `LEGACY_OR_UNKNOWN_PROFILE` 标记部分未评估。

问题真实性、方案优劣、目标合理性、验收场景充分性、原规则保真与语义等价均为人工审查事项。全文正文、风险和非目标仍必须审阅，不能只读结构化表。输入新鲜度是本次读取前后字节与真实路径一致，不等于未来仍有效。

## 差异与下游追溯

`diff` 按稳定 ID 展示新增、修改、删除及引用字段变化；ID 重复时该条目无法唯一比较。原始差异同时提供共同前缀 / 后缀字节数、被替换字节和新增字节的 Base64，结合旧基线可精确还原新文件；章节正文、换行、重排和格式变化不会丢失。它不声称文本变化一定改变语义。旧基线缺失显示“无法比较旧内容”，不得用空文档冒充旧版本。

章节缺失、表头无法识别或格式未支持时，差异状态为 `partially-compared`，明确列出未评估范围；提取缺口不能直接解释为新增或删除，受影响条目标记 `unassessed`。仍保留完整原始字节差异。显式 Slice YAML 解析失败与其他输入解析失败一样返回 `2`；YAML 可解析但 schema 不支持时，保留未评估说明。

Spec Delta 仍只处理既有冻结基线的适用高风险变化，引用 FR/NFR/AC 与旧 / 新文件。新增 diff 不扩大 Delta 适用范围，不自动延续批准或缩小验证。

可选 `--slice` 读取既有 Slice schema v3 的 `acceptance.<ID>.source` 与 `locator`（AC ID 或 `id:AC-001`），沿 `verification.*.acceptance_refs` 和 `work_units.*.acceptance_refs` 生成追溯视图。该视图展示验证命令和预期证据引用，不执行命令、不核验批准或证据结果，也不替代 Slice schema 检查。未映射需求、失效定位、缺验证映射和未提供的依赖显示缺口；不得解释为“未受影响”。没有第二份手工追溯合同。

## 样本、分发与回退

[贯穿案例](../templates/examples/lifecycle-writing-examples.md) 关联三类虚构固定样本及预登记反例。确定性 fixture 仅证明诊断行为；人工填写、审阅时间、澄清轮次、遗漏、返工和 Token 必须有实际记录才统计。未取得人工反馈时，效果保持待验证；不恢复已取消的跨平台 Agent 评测。

解析采用 [unified](https://github.com/unifiedjs/unified)、[remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse)、[remark-gfm](https://github.com/remarkjs/remark-gfm)；frontmatter 使用现有 YAML 工具。维护侧由 pnpm 精确锁定和 vendor 构建分发；实例运行无须安装依赖。

本轮始终为独立诊断，不接入阶段阻断。回退时停用诊断调用和新模板默认入口，保留已生成文档、格式读取能力及证据；不回写历史资产或恢复过期批准。升级门禁须另立变更。
