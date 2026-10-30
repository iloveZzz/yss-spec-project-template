# Matt Skills v1.3.1：Spec、任务与 PR 逻辑调研

日期：2026-10-29。状态：调研与方案建议；不是已批准设计，不修改现行流程。范围为用户正在澄清的非技术 Spec Profile、本地 Markdown 与远程 PR 协作。

## 结论

值得借鉴技能职责小、引用原材料、按需分支和本地/远程承载适配的方法，但不能把 Matt v1.3.1 描述成 PR 优先系统。它的规划载体是 Issue，PR 是实现产出的审查入口。用户所需“创建 Spec 自动产生 PR、本地 Markdown 为源并同步远程、人工批准状态统一”需要另行设计，上游没有现成实现。

## 固定基线与证据范围

本次通过 GitHub connector 直接读取 commit `24fe0ef7737efae15c87225755e9f6f5965e4888` 的源码，package.json 声明版本 `1.3.1`：[版本](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/package.json)。没有使用 main 或本地适配技能替代该版本。此前 CLI 仓研究报告仅作线索，不继承其政策建议。没有执行上游流程，也未创建远程 PR。

## 上游实际主线

`grill-with-docs →（必要时 prototype）→ to-spec → to-tickets → implement / implement-spec → code-review → PR → retro`。单会话小任务允许直接 implement；并非每次都建立 Spec 和 tickets。[ask-matt](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/ask-matt/SKILL.md)

| 技能或资料 | 实际职责 | 对当前设计的意义 |
|---|---|---|
| setup-matt-pocock-skills | 通过提示词探索、确认并写入 tracker、标签和领域文档约定；不是确定性安装器 | 可借鉴配置集中管理；不等于自动初始化和加载已实现 |
| to-spec | 综合已讨论材料、不重新访谈；核对测试 seam 后发布 Spec 到 tracker，标记 ready-for-agent | 规格综合与需求访谈分离值得借鉴；其技术范围和状态不能直接照搬 |
| to-tickets | 将范围切成垂直实现切片，表达 blocker 图；用户确认拆分后发布 | 应归用户所说的下游 Profile，不进入非技术 Spec |
| implement-spec | 按 ticket 图调度实现，集成到一个分支；首次实现合入后条件创建 Draft PR | 实现 PR 与前期 Spec 是不同对象，不能说上游创建 Spec 就开 PR |
| pr | 规定 Summary、Before/After Evidence、Merge Danger 的正文模板 | 不负责 PR 创建、状态、批准或同步 |

来源：[setup](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/setup-matt-pocock-skills/SKILL.md)、[to-spec](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/to-spec/SKILL.md)、[to-tickets](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/to-tickets/SKILL.md)、[implement-spec](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/implement-spec/SKILL.md)、[pr](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/pr/SKILL.md)。

## 三种 tracker 支持不等于三种 PR 或自动同步

上游明确支持 GitHub Issues、GitLab Issues、本地 Markdown tracker。配置选择一个 tracker，技能按同一业务操作发布到所选载体。

- 本地：`.scratch/<feature>/spec.md`；实现票为 `issues/NN-slug.md`，状态写在文件顶部，评论追加到 `## Comments`。这是本地 Issue/Spec 表示，不是本地 Git PR。
- GitHub：发布 Spec/ticket 意味着创建 Issue；PR 作为外部请求进入 triage 默认关闭。
- GitLab：同样发布到 Issue；MR 是 Git PR 的对应名称，作为请求进入 triage 也默认关闭。

在已读的这些消费者与模板中，没有“Markdown 为源自动同步远程 PR/MR”、跨平台冲突解决或本地 PR 审批模型。

来源：[local 模板](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md)、[GitHub 模板](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md)、[GitLab 模板](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md)。

## 非技术边界、调用与交接

to-spec 模板包含 Implementation Decisions（模块、架构、schema、API）及 Testing Decisions。用户已明确这些归下游，因此只能借鉴 Problem、Solution、User Stories、Out of Scope 等结构；Spec 只记录用户可观察验收，技术测试 seam 留给下游。

上游区分 user-invoked 与 model-invoked，禁止技能间隐式调用 user-only 技能。setup、to-spec、to-tickets、implement-spec 均 user-only，不能原样拼成自动流水线。[调用合同](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/.agents/invocation.md)

ask-matt 将 handoff 限于换宿主、换目录、交给同事或中途分支等上下文可携带场景，并不强制每个阶段都建交接包。这支持取消固定重复交接，但不代表删除跨仓可读输入和来源版本。[ask-matt](https://github.com/mattpocock/skills/blob/24fe0ef7737efae15c87225755e9f6f5965e4888/skills/engineering/ask-matt/SKILL.md)

## 对前述方案的调整建议（非上游事实、尚待用户确认）

1. 采用“文档变更 PR”：本地 Markdown PR 对应一个真实规格变更，包含来源/目标分支、变更文件及可审阅 diff；远程 PR/MR 承载相同文档变更。不要仅把普通需求文件重命名成 PR。
2. Spec PR 只持有业务规格及适用产品设计；下游以关联实现 PR 承载技术产物和代码，不在一个长期 PR 中混合规格批准与实现完成。规格批准不能自动批准或合并下游生产代码。
3. Markdown 作为规格内容事实源，真实人工审查作为批准事实来源；回流保留操作者、内容版本和来源，不能让可编辑的 status 字段自行产生批准。
4. 区分 draft/open/merged/closed、审查批准、同步状态；平台 PR 生命周期与规格批准不是同一维度。批准必须绑定当前规格版本，后续修改按影响使其待复核。
5. 用少量声明式项目配置驱动 local/GitHub/GitLab 适配，稳定 ID 关联远程对象，重试更新同一个 PR；单向发布内容、回收审查事件，远程直接改文档时显式检测冲突，不做静默覆盖。
6. 保留一个初始化入口并按任务加载技能，不复制上游逐个手动启动流程；如需要自动调用，应先明确本项目技能的调用政策，而不是绕过已有 user-only 标记。

## 尚需澄清

- Spec PR 的人工批准后，是合并文档并让下游消费已合并版本，还是保持 PR 打开供下游读取？建议前者，形成清晰稳定输入。
- 本地无远程时，是否也要求 Git 分支与提交形成实际 diff？建议要求 Git 支持本地 PR；纯文件模式应明确其能力边界。
- 远程批准回流如何认证批准主体；本地批准采用明确用户原始回复还是其他可核验身份？
- 当前授权的自动流程配置需要明确目标仓、分支策略和允许动作，避免初始化中的一次配置被误解为任意未来外部动作的无限授权。

本次未核验 GitHub/GitLab 平台 API 的完整审批语义；具体映射和适配实现应继续查官方文档。上游没有提供所需自动同步实现，不能据此承诺平台特性完全等价。
