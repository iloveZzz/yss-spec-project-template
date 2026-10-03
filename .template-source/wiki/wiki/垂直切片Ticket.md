# 垂直切片Ticket

垂直切片 Ticket 描述贯穿所有受影响层、可独立验证的窄功能行为。冻结需求保留版本与原始字节，当前状态、验收结果和执行记录由主 tracker 与任务包承载。

## 父 Ticket、业务票与切片

每个功能先建功能父 Ticket，汇总阶段资产、审查、阻塞和证据；业务 Ticket 在 Spec 起草、Design 校准阶段形成，不授予实现资格。OpenAPI Freeze 或无 API 影响记录后再拆窄切片，禁止仅按技术层横拆。

`work-unit.ticket-decomposition` 输入已正式化业务 Ticket、冻结 Spec、设计、契约、当前实现仓库准备和阻塞关系，更新既有父 Ticket 并形成垂直切片和批准的 Slice Implementation Contract；生命周期复算后才能进入 `ready-for-agent`。

## 需求正文与冻结边界

现行切片模板的 frontmatter 默认 `status: ready-for-human`，保存业务 Ticket 集、业务票和验收引用及需求版本。正文写用户操作与交付结果、上游 Spec 规则和版本、切片边界、OpenAPI 影响、验收标准、测试 seam、合同引用与阻塞解除条件。

新切片使用 Slice v3。Ticket 保存行为、验收、测试 seam 和合同引用；工作单元、Skill、写范围与验证命令在权威 YAML 保存一次。编译与批准、任务进度和 Execution Result 在现有 checkpoint、tracker 或任务包维护，不回写冻结 Ticket。

冻结后 frontmatter 只代表冻结时状态，不能从它读取当前执行状态；也不能回写状态、验收勾选或执行结果。需求变化另存新版本，重新编译、审查与批准，旧文件和批准不会自动迁移。

## Tracker 与实现就绪

Ticket 五态为 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。`ready-for-agent` 只用于必要门禁通过、阻塞边清除、可直接实现的垂直切片；Spec、设计和契约草案仍使用 `ready-for-human`。

主 tracker 由 `.template-spec/agents/issue-tracker.md` 显式配置，模板默认 `local-markdown` 与 `docs/.scratch/`；Git remote 不能替代该选择。远程平台暂不可用时保留目标平台并生成待发布草案。Slice v3 的当前状态、验收与执行记录继续进入主 tracker，不改冻结需求。

实现合同编译器不能批准合同或设置 `ready-for-agent`。生命周期核验并持久化当前合同、清除阻塞边，再在主 tracker 推进执行状态。UI 切片还需已校验的前端实现计划，实际项目绑定见 [[实现仓库与跨仓库契约]]。

## 执行与完成证据

业务行为使用 `behavior-tdd`；`controlled-generation` 只适用于机械生成，并保留例外与验证。`drift`、`violation` 或非空 `new_impacts` 出现时暂停受影响工作单元，重新路由，不能先完成代码再补合同。

完成检查进入 tracker 或任务包：实现与适用测试通过、调试或原型代码移除、合同和全部工作单元执行结果已核验、实际文件在允许路径内、证据完整、验证含执行时间、重路由结论明确且合同未 `stale`。需求来源见 [[Spec基线]] 与 [[OpenAPI契约]]，执行边界见 [[切片实现合同]]。

## 来源

- `.template-spec/templates/vertical-slice-ticket-template.md`：第 12、1–7、18–22、28–85、56–75、63–67、75、87–99、121–133 行。

- `CONTEXT.md`：第 63 行。

- `AGENTS.md`：第 48、55、65 行。

- `.template-spec/agents/issue-tracker.md`：第 15–39 行。

- `.template-spec/agents/triage-labels.md`：第 3–11 行。

- `.template-spec/process/lifecycle-registry.yaml`：第 462–467 行。
