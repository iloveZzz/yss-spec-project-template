# 竞品分析合同

本合同在现有 research evidence v1 上增加可选 `competitive_analysis` 扩展。`yss-research` 持有研究模式、证据包和汇总，`competitive-intelligence` 执行专项分析。父级 `search_log`、`evidence_items`、`claims` 是唯一检索、来源与 Claim 台账；竞品扩展引用这些 ID，不另建台账。

## 1. 模式与输出

普通探索采用 `quick`，在聊天中给出简报和精简功能矩阵，标明未审计；用户未要求落盘时不写文件。深度、严格、可复现、可审计请求以及正式生命周期批准输入采用 `evidence-audited`。深度默认 `output_selection: both`；用户明确只要矩阵或报告时使用 `matrix` 或 `report`，证据审计要求不变。

竞品策略研究用 `strategy-evidence`；其中技术能力和协议 Claim 必须满足 `technical-evidence` 的一手来源要求。竞品确定状态引用 `technical-fact` Claim 时，校验器要求至少一项 `primary` 支持证据，独立于父 profile 和 `decision_bearing`；`unknown` 不作确定判断，仍须记录来源缺口与补证计划。不得把已知技术事实改标为 `background` 绕过此要求；是否属于技术能力或协议事实仍须来源语义审核。不要新增 profile 或模式。探索材料作为正式批准输入前须升级为审计包。

审计模式始终保留相邻的 `<slug>-research-brief.md` 与 `<slug>-evidence.yaml`。按选择追加 `<slug>-competitive-matrix.md`、`<slug>-competitive-analysis.md`；深度报告不能替代简报。`template-source` 使用 当前工作区仓外的 `maintenance:research/<run-id>/`（用 `scripts/maintenance-path` 解析；证据引用绑定原字节摘要），`project-instance` 沿项目研究 / 证据目录约定。

## 2. 可选扩展接口

| 字段 | 内容 |
|---|---|
| `schema_version` | 固定为 `1` |
| `output_selection` | `matrix`、`report` 或 `both` |
| `as_of` | 调研截至日期，`YYYY-MM-DD` |
| `comparison_scope` | 本次用户、能力、用途、时间范围及非目标 |
| `competitors` | 对象列表；每项为 `{id, name, type, product, version, edition, region}` |
| `capabilities` | 能力列表；每项为 `{id, module, name, definition, user_value}` |
| `assessments` | 全部竞品 × 能力结果；每项为 `{competitor_id, capability_id, status, claim_refs, limitations, gap}` |
| `artifacts` | 同目录附属文件名：`matrix` / `report`，由输出选择决定必填项 |

竞品和能力 ID 稳定且在各自列表唯一；每个竞品 × 能力组合恰有一个 assessment。竞品 `version`、`edition`、`region` 等未确认信息明确写 `unknown`，不能推定适用于所有版本、套餐或地区。能力定义写可观察的功能范围，`user_value` 说明服务的用户任务；不把不同功能因名称相近合并。

`claim_refs` 引用父级 Claim ID，`limitations` 为限定条件列表。`gap` 是 `null` 或 `{reason, next_step}`；未知必须给出无法判断的原因和补证步骤，不能用空缺口代替。决定性比较结果使用已审计 Claim；引用措辞应包含适用的产品、版本 / 套餐、地区、日期与能力范围，审核者须核对来源实际支持范围。

`artifacts.matrix` 固定命名为 `<slug>-competitive-matrix.md`，`artifacts.report` 固定命名为 `<slug>-competitive-analysis.md`。只允许与证据文件同目录的文件名，不允许绝对路径、子目录、`..` 或符号链接逃逸；渲染和校验均应拒绝不安全路径。

未包含扩展的旧 evidence v1 包继续使用原合同与校验行为；不回写历史证据、报告和收尾记录。

## 3. 支持状态与证据

| `status` | 展示 | 判定要求 |
|---|---|---|
| `supported` | ✅ 明确支持 | 已审计 Claim 支持定义范围内的能力，记录适用条件 |
| `partial` | ⚠️ 部分支持 | 已审计 Claim 支持其中一部分；`limitations` 明确缺少的部分或限制 |
| `absent` | ❌ 明确不支持 | 已审计 Claim 支持该范围内的不支持判断；搜索无结果不能作为依据 |
| `unknown` | ❓ 未知 | 可没有支持 Claim；`gap.reason` 和 `gap.next_step` 必填 |

资料不完整、访问失败、版本未确认或来源冲突，不能直接转换成 `partial` 或 `absent`。先缩窄到可审计的范围，仍无法判断时使用 `unknown`。已审计 Claim 的 `partially-supported` 结果只能在按原合同限定措辞后消费，不能把未覆盖部分当作已确立。

反向信号仍记录在父级台账。`none-found` 只说明声明的搜索没有找到反例，不证明竞品缺失能力。支持状态与 Claim 审计状态是不同字段，不能彼此替代。

## 4. 阅读材料和受控渲染

直接使用 `.template-spec/plan/templates/competitive-matrix-template.md` 和 `.template-spec/plan/templates/competitive-analysis-template.md`。每文件恰有一组完整标记：

```markdown
<!-- YSS-COMPETITIVE:START -->
[由结构化比较结果生成]
<!-- YSS-COMPETITIVE:END -->
```

管理区由工具维护，禁止手填比较事实；区外保留人工定位、流程、机会和建议。矩阵管理区生成截至日期、范围、竞品版本 / 套餐 / 地区、能力定义、功能状态表及 Claim / 缺口摘要。`report` 的报告管理区包含完整对比表；`both` 的报告管理区引用同目录完整矩阵，并保留证据摘要。只选择矩阵时不生成报告。

从仓库根运行：

```bash
node .agents/skills/yss-research/scripts/render-competitive-outputs.mjs <slug>-evidence.yaml
node .agents/skills/yss-research/scripts/validate-research-package.mjs <slug>-research-brief.md <slug>-evidence.yaml
```

从技能目录运行时可使用 `node scripts/render-competitive-outputs.mjs` 和 `node scripts/validate-research-package.mjs` 的同一参数。新文件从现有模板创建；刷新已有文件仅替换唯一完整管理区，保留区外字节。旧文件无标记、标记重复或不完整时拒绝覆盖，由所有者另行安排适配；不自动把旧报告认定为当前产物。

渲染后的人工正文应消除模板占位项；每项实质结论引用 Claim / 可定位来源，观察、推断、假设和建议分开。默认不生成数字排名；用户明确要求评分时先确认量表、维度 / 权重和依据，未知写不评分，不能作为低分或零分。

## 5. 校验与收尾

校验先执行完整 JSON Schema，再检查唯一 ID、完整比较覆盖、引用、状态限定、选定文件和受控区一致性。重复或失效 ID、缺失产物、未知缺口未说明、部分支持未限定、确定状态无审计 Claim、表格漂移和不安全路径均返回非零退出码与定位诊断。机械校验不能证明来源语义、采样代表性或推断合理性。

模板正式研究按 `.template-spec/process/research-completion.md` 收尾。含竞品扩展时，研究收尾记录条件追加选定矩阵 / 报告和新增校验依赖的 `{ref, digest}`，并纳入 `evidence_refs`。接收端核验当前字节并重跑校验；附属报告、结构化结果、Schema 或渲染逻辑变化后旧验证失效。旧包和旧收尾记录保持读取兼容，不据此宣布新产物已验证。

功能矩阵与深度报告只提供研究证据。候选术语交给 `domain-modeling`；机会、MVP / 非目标、优先级和待确认问题交给 Plan、Spec 或其它对应所有者。研究不直接写入 `CONTEXT.md`、Spec、OpenAPI、架构、Ticket 状态或批准，也不设置 `ready-for-agent`。
