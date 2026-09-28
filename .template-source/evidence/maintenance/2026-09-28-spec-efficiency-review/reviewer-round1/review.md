# 研发规格效率优化独立审查（第一轮）

审查结论：changes-requested。Spec 轴发现 1 项可复现的必修缺口，当前候选不能合并。Standards 轴未发现需要修复的独立问题。实现者修复后须重新捕获候选，完成第二轮各轴复核；本报告不授予合并或发布权限。

## 固定候选与覆盖

- `review_mode: worktree`；记录模式 `focused-independent`；`review_round: 1`。
- 固定比较点：`main = 79c405998388ee1b13e166377cdfc3bfaa9f0c14`；实现 HEAD：`7031708e18a9a50b7d3da0487ad171462fe44759`。
- 候选：`../candidate-r1/candidate-manifest.yaml`；摘要：`43cb6c24fdc1ceb14ad73a6d19c3f90597dad12c571e2a3b3182d6dffee1497d`。
- Reviewer：`codex.independent.spec-efficiency-review`，`role.test-engineer` / `runtime.skill-projection`；实现者：`codex.main.spec-efficiency`。Reviewer 仅写本目录，没有修改实现、测试、锁、快照、Git 状态或原工作区。
- 已消费规范 `candidate.bin` 的 T 帧及对应 `tracked.diff`，核对 SHA-256、帧边界、无遗漏 untracked。七个子仓均逐一核对捕获 diff 的 SHA-256、base/head/tree；见 `candidate-check-initial.json`。比较命令与提交列表由 manifest 持有，提交为 `6c3f6c14`、`1f17bf55`、`7031708e`。
- 语义覆盖聚合模板的查询、读取阶段、只读生产/运行/验证、schema v1/v2 分支、选择回退与依赖闭包、执行中断/报告、合同视图与材料预填、合成测量、同步和资产闭包。三个专职 Profile 的正式消费者差异和四个 CLI 固定来源均已核对。归档原始日志用于验证证据，不逐份重复代码审查。
- 17 项 canonical/专职脚本及 schema/技能投影对应关系逐字节一致，见 `consumer-evidence.json`；其余投影、锁、分发完整性复用同候选串行完整检查的成功结果。该对应关系也说明下述视图缺口进入三个专职消费者。
- 初次及检查结束复捕获摘要一致，见 `candidate-recheck/candidate-manifest.yaml`；最后完成边界核验见 `candidate-check-final.json`。

## Standards

本轴结论：通过；findings 0，最高严重性：无。

标准源已读取：根 `AGENTS.md`、`yss-project.yaml`、`CONTEXT.md`、`harness-process-tailoring.md`、`maintaining-skills/SKILL.md`、`code-review/SKILL.md` 及其候选捕获/专项标准引用、`review-report-template.md`。根仓没有额外 `CODING_STANDARDS` 或 `CONTRIBUTING` 文件。按 `lifecycle-document-output` 使用 `i-have-adhd` 与 `document-writing.md`，仅作用于本审查产物。

### 仓库与专项覆盖

| 检查输入 | 结论及具体依据 |
|---|---|
| 仓库身份、L3、canonical/投影/锁 | pass；显式 template-source；不生成产品阶段资产；共享实现按同步工具传播并保持专职差异；完整验证与对应关系证据可读。 |
| 候选范围和独立性 | pass；固定候选流、七个 gitlink、空 untracked inventory 均核验；Reviewer 没有写实现。 |
| Slice 批准、正式执行、TDD 工作单元、Build Architecture Checklist | not-applicable；本次是模板工具维护，没有产品 Slice 或正式业务实现合同。模板工具行为由本轮实际 Node 回归证明，不虚构产品批准。 |
| Common / Contract / Cross-repo 子合同表 | 产品子合同 not-applicable；未改变业务 API。实际工具 schema、读写边界、分发顺序与固定来源按本方案及七个子仓证据核对。 |
| `yss-domain`、`yss-application` | not-applicable；候选没有 Java Domain/Application、事务或聚合实现。 |
| `yss-repository` | not-applicable；没有 PO、Repository、Convertor、GatewayImpl 或 MVC repository 业务结构变化。 |
| `yss-mybatis` | not-applicable；没有 Mapper/XML、SQL、分页、批量、扫描、数据源或组件 API 行为变更，无需 MyBatis source index。 |
| `yss-web-controller`、`yss-dto` | not-applicable；没有 Controller、CMD/Query/VO 或 Result 包装实现。 |
| `mapstruct`、`lombok`、`alibaba-java-code-style` | not-applicable；没有 Java 类型、映射、注解处理器或 Maven 配置改动。 |
| Backend Wrapper / Maven、后端 smoke/分层压力场景 | not-applicable；没有登记的运行时后端工程属于此候选；不得借模板专职 Profile 名称推导需要 Maven 构建。 |
| `yss-ui`、`yss-design-system`、`yss-ui-business-page-generation`、Formily/表格/主题/API 页面技能 | not-applicable；没有页面、Vue 组件、原型、状态矩阵或视觉变化。 |
| 前端 `pnpm lint/type-check`、页面 smoke | not-applicable；候选没有前端应用。模板工具的 `pnpm --dir .template-source/tooling/node test` 已在完整门禁实际通过。 |
| 文档、词汇、context reconciliation | 中文输出；metadata 原样保留。模板源只核验模板合同，不登记虚构业务词、不推进产品阶段，产品 context reconciliation 不适用。 |

### Fowler baseline 判断

下表均为判断性启发，不形成额外硬门禁；自动工具已检查的事项不重复报告。

| 启发 | 判断 |
|---|---|
| Mysterious Name | 没有需要报告的命名缺陷；prepare、observe、validate 和 selection/report 职责可辨。 |
| Duplicated Code | 专职消费者的少量接线有各自正式合同语义；共享只读逻辑已提到 read-only-intake，生成投影不视作手写重复。 |
| Feature Envy | 路径、观测、选择与报告逻辑分别靠近其所拥有的数据。 |
| Data Clumps | root/runDir 与执行结果作为选项/记录传递，无需为当前有限数据再添类型层。 |
| Primitive Obsession | schema 和既有稳定 ID 定义字符串规则；未发现值得引入新值对象的缺陷。 |
| Repeated Switches | kind/profile 分派属于既有读取适配器边界，未发现同一新增业务决策散落分派。 |
| Shotgun Surgery | 共享源经既有工具同步各分发面；专职差异有意保留，没有新增多权威源。 |
| Divergent Change | 报告、选择、观测与材料预填分别落在相应模块，职责没有无关混入。 |
| Speculative Generality | 当前抽象均对应本轮已要求的入口，没有跨进程缓存或新进度系统。 |
| Message Chains | 未发现调用者依赖过深内部导航而形成可报告缺陷。 |
| Middle Man | 兼容 CLI/专职分支有参数和权限检查，不是可无损删除的无语义代理。 |
| Refused Bequest | 此候选没有新增继承层级；不适用。 |

## Spec

本轴结论：changes-requested；findings 1，最高严重性：medium；分类 `violation`，状态 `open`。

**SPEC-1（medium）：默认 review 视图丢失合法的全局审阅约束。** 定位 `scripts/lib/contract-views.mjs:75`（同段 72–77）：`reviewKnown` 将整个 `scope`/`common` 排除，但实际只提取工程、允许写入和 forbidden_patterns。有效 v3 的 `scope.human_review_points`、`scope.full_reroute_triggers`、`scope.doubt_driven_review` 内未知约束均没有出现在 review 输出；原始 v2 的 `common` 同样遗漏。原 `full` 视图保留全部值，当前 `review.blockers=[]`，因此默认只读审阅者会在无缺口提示时漏掉人工会签、重新分析触发条件和未分类限制。

方案 D 明确要求“身份、版本、写边界、验收、停止条件和未知约束必须保留”；测试要求 raw v2/v3、风险和未知约束不遗漏。新 `.template-spec/process/contract-reading.md:52` 也规定默认 review 保留这些信息。v3 schema 的 scope 合法声明了上述三个字段，不是给非法合同添加随机字段。复现使用仓库现有合法 `pilotFixture` 与 `approvedFixture`，只向这些字段放入区分文本；`reproduce-review-scope.mjs`、`scope-gap.stdout` 保留完整复现。输出对两版均显示三项 `in_review=false, in_full=true`，不存在来源或 schema blocker。

建议在 review 中保留未已呈现的 scope/common 约束，包括嵌套未知字段；或以有绑定且默认展开的约束部分表达，避免只处理顶层未知字段。补 raw v2/v3 行为回归，验证 review 仍携带上述内容，然后用同步工具更新三个专职消费者与四个 CLI 固定快照。该项是原方案未完成的要求，不是审查期间新增偏好。

其余方案方向：A 的 public_description/参数确定性和漂移拒绝，B 的权限/证据路径/增删改/伪报拒绝，C 的 legacy/shadow/qualification/完整候选回退，D 的 prepare-review 不批准且可定位缺口，E 的实测日志/null 遥测与独立分布均有对应实现及回归。当前 qualification_ref 为空，白名单保持 shadow；局部合成收益没有被当作整体研发收益。终态只读观察不等同 OS 沙箱，设计明确其限制。本次没有发现其他需要新增的阻断。

UI fidelity：not-applicable；没有用户页面、交互、视觉或原型变更，不能以模板里的 frontend 名称推导 UI 影响。

## 实际机器检查与证据

| 命令 / 检查 | 实际结果 | 证据 |
|---|---|---|
| `git diff --check main` | exit 0；2026-09-28T07:25:48Z | `check-0.stdout`、`check-0.stderr`、`verification-results.json` |
| 任务包声明的六文件 Node 回归（完整命令见记录） | exit 0；27/27 通过；2026-09-28T07:25:48Z；2.34 s | `check-1.stdout`、`check-1.stderr` |
| `node .../reviewer-round1/reproduce-review-scope.mjs` | exit 0 表示已复现缺口，不能当验收通过；v2/v3 各三项遗漏 | `scope-gap.stdout`、`scope-gap.stderr`、`verification-results.json` |
| `scripts/verify-template --concurrency 1 --report-dir ...`（主控同候选实际执行，本轮复用） | passed；205 条结果 / 204 条唯一命令 / 1 条复用；无未执行；input_drift=false；656977 ms；2026-09-28T07:12:57Z 至 07:23:54Z | `../full-verification/report.json` 及所有 logs；归档日志引用完整性见 `consumer-evidence.json` |
| 初次并行全量尝试 | 原始结果保留：plugin-build 中 source.state 临时不同导致 2 个断言失败；不能把该次写为通过。后续独立插件及完整串行复验通过；本次结论只复用串行结果，不宣称并发隔离已改进。 | `../parallel-attempt/` 与主控完整报告 |
| 候选复捕获、七子仓 HEAD/tree/diff | 当前候选摘要与初始摘要一致；固定子仓没有漂移 | `candidate-recheck/`、`candidate-check-final.json` |

未运行不相干 Maven 或页面测试，也没有真实低风险/API/跨仓业务任务、付费 Agent 或 Token 收益证据。局部测量只作为范围受限的合成证据。上述机器通过不能覆盖 SPEC-1 的实际缺失；不能用全量绿灯关闭该 finding。

Standards：0 项，最高严重性无；Spec：1 项，最高严重性 medium；UI fidelity 不适用。由实现者修复 SPEC-1，再对新候选进入第二轮。
