# 日常交付与正式功能目标

本页是[统一 CLI 操作说明](../unified-cli.md)的一部分。

## 日常交付能力

支持日常能力的 CLI 对政策已启用的 Profile 提供两个只读接口（以下以 Spec 为例）：

```bash
yss lifecycle route --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
yss lifecycle verify-daily --profile spec --root /absolute/path/spec --task docs/task.md --implementation-root /absolute/path/implementation --base <40位完整SHA> --json
```

第一项返回 `daily / standard / governed / needs-info`、原因和必要检查（`standard` 需一页 Spec-lite 和一次生物人决定，见生命周期 `references/daily-delivery.md` 的 standard 路线；固定 CLI 不支持时按 `governed`）；第二项核验当前差异、测试、适用复核与适用 API 证据。事实与实际证据保存在同一 Markdown Ticket/PR 的证据区，不生成阶段 checkpoint、批准或 `ready-for-agent`。策略只由生命周期编排合同 `request_triage.delivery_path` 定义；格式见生命周期 `references/daily-delivery.md`。旧 CLI、Profile 未启用或缺政策时返回不支持，不能套用正式校验器的豁免开关。正式任务不可降级；无关正式资产不阻断新的日常任务。

## 正式功能的可续推目标

本节用于已登记 checkpoint 的正式功能。支持新政策的完整 Spec 默认推进到 `business-accepted`；短目标到达后停止下游写入，扩展目标后复验续推。五个目标的完成规则消费[推进目标协议](../../process/lifecycle-progression.md)及本地主控合同；操作指引按[本地用户手册索引](../用户手册索引.md)进入本端说明。日常任务仍按前节的 `daily` 政策执行。

### 1. 核对能力和当前功能

```bash
yss version --json
yss capabilities --json
yss bundle inspect --profile spec --json
yss lifecycle target --help
```

程序能力清单应包含 `lifecycle-target-v1`，实例主控合同也须包含受支持的 `progression_target` 政策。帮助可以离线阅读，但不能证明实例能力或批准已经就绪。旧程序需取得支持能力的固定版本；旧原生实例另外审阅并应用 `sync` 计划，具体操作见[升级与回退](install-and-verify.md#升级与回退)。未发布开发候选和本机旧 `1.3.2` 不能仅凭版本号视为新策略已可用，来源和能力须实际核对。

从当前 checkpoint 读取 `feature_id`，核对 Tracker 的 `tracker.root` 和唯一 `map.md` 中的 `checkpoint_ref`。示例假设实际登记为 `feature.example` 和 `.work/example/checkpoint.json`，必须替换成当前值；checkpoint 可以使用实例当前合法扩展名，不能凭目录名新造功能身份。

```bash
yss lifecycle target --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --json
```

该查询只读核验已有意图与当前证据；没有意图文件时读取政策默认目标，不补写历史配置。

### 2. 保存目标输入并规划

本地继续使用 `consumers: []`。把以下 JSON 保存到当前功能包已有临时目录中的 `target-input.json`。同一 Git 根同时承载治理与实现时，先核对临时目录已被项目现有规则忽略，避免输入草稿成为源码候选变化；工具不会自动新增忽略规则。

```json
{
  "schema_version": 1,
  "kind": "lifecycle-progression-target",
  "feature_id": "feature.example",
  "checkpoint_ref": ".work/example/checkpoint.json",
  "target": "spec-approved",
  "intent_source": "用户本次指令：先完成 Spec 批准",
  "consumers": []
}
```

```bash
yss lifecycle target --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --input .work/example/tmp/target-input.json --plan --out /absolute/path/target-plan.json --json
```

目标只能填写 `spec-approved`、`product-design-completed`、`backend-deliverable` 或 `business-accepted`。`intent_source` 保存原始用户指令来源，不填自报批准或完成状态。`plan-to-backend` 的永久职责只允许前三项；专职 Profile 的只读 `profile-terminal` 不能写入此 JSON。

保存计划放在治理工程外的新路径，保留输入草稿直到 apply 完成。核对计划中的功能、输入摘要、目标和实际写入范围；设置目标不更改阶段、批准、冻结合同、交接包或 Receipt。

### 3. 应用目标，再读取当前完成依据

```bash
yss lifecycle target --root /absolute/path/spec --apply --plan-file /absolute/path/target-plan.json --json
yss lifecycle status --root /absolute/path/spec --checkpoint .work/example/checkpoint.json --json
```

apply 重新编译并核验原输入，拒绝输入漂移和篡改计划；成功计划可幂等重试。事务只写功能包 `progression-target.json` 及必要事务材料，目标文件不进入批准或交接证据闭包。apply 退出 0 只表示目标配置成功；实际工作仍由生命周期技能核验准入后推进。

成功 envelope 的 `result` 中：

| 字段 | 读法 |
|---|---|
| `progression.target`、`target_source`、`intent_source` | 本次目标及默认／显式来源 |
| `progression.status`、`reached`、`reason` | 当前证据核验结论及原因；`pending` 为待核验，`blocked` 为阻塞，`not-applicable` 必须有有效依据 |
| `progression.completion.milestone`、`.profile`、`.business` | 分别查看本次目标、本端职责和整体业务；不能用短目标达到替代整体业务完成 |
| `coordination` | 显式绑定消费者的 checkpoint、当前输入、交付和版本依据 |
| `next_action` | 承接 Profile、治理根、工作单元及继续／等待／复验／目标已达原因 |

只读查询消费当前证据，不启动实现、构建、回归或批准。目标已达时 `next_action.kind` 为 `target-reached`，仍保留 checkpoint 的真实 `next_work_unit`；这时 Agent 停止派发下游写任务。

### 4. 从 Spec 继续设计，再继续业务交付

同一功能后续要完成设计时，保留 `feature_id`、`checkpoint_ref` 和消费者绑定，将原输入中的 `target` 改为 `product-design-completed`，`intent_source` 改为新的原始用户指令。重新运行第 2、3 步，使用新的仓外计划路径。再由 `yss-product-lifecycle` 复验现有批准，完成适用设计和业务 Ticket 正式化。

要继续整个功能时，同样把目标改为 `business-accepted`，重新规划、应用并复验。有效批准和稳定 Ticket ID 沿用原记录；真实资产或批准依据变化仍按现行规则使受影响证据失效。CLI 没有执行生命周期的推进引擎，修改目标不会自动写实现代码。业务验收完成后，提交、推送、合并与发布继续按各自实际授权处理。

### 5. 需要独立专职消费者时

默认本地主线直接消费批准资产，代码写入已登记实现仓，不创建另外三个治理工程或自导自入。用户明确选择独立工程时，在同一输入中替换 `consumers`，例如：

```json
"consumers": [
  {"profile": "design", "root": "/absolute/path/design", "checkpoint_ref": ".work/example/checkpoint.json"},
  {"profile": "backend", "root": "/absolute/path/backend", "checkpoint_ref": ".work/example/checkpoint.json"}
]
```

此处展示 JSON 对象的成员片段，需放回完整输入；每个 checkpoint 使用接收方实际登记，属于同一 `feature_id`，每种 Profile 最多一项。尚未创建的消费者可先登记明确意图，但在身份、checkpoint、Receipt 和 Context 对账核验前保持待核验。一个工程有多个功能时只汇总这里显式绑定的记录，不从相邻目录或完成标签猜消费者。

设置消费者不导出、导入或批准资产。Spec → Design 通过原生 SpecBaseline 导出、导入和 Receipt 核验继续设计；独立 Backend 接收同一冻结战略基线。操作见 `yss handoff export --help`、`yss handoff import --help`、`yss handoff verify --help` ；交接步骤按[本地用户手册索引](../用户手册索引.md)进入本端说明。版本失配、过期 Receipt、Context 冲突或缺适用证据不能汇总为业务完成。

### 6. 失败、恢复与回退

| 现象 | 下一动作 |
|---|---|
| 缺能力／旧政策 | 核对固定程序及 Bundle；取得支持版本后另行审阅实例同步计划，不手补政策 |
| 身份、功能绑定或职责不符 | 重新核对当前登记和授权范围，不能通过改目标扩大职责 |
| 输入漂移／计划失配 | 保留现场，核对原输入，重新规划；不编辑保存计划绕过核验 |
| 配置已应用，但目标仍待核验 | 按 `reason` 与 `next_action` 补齐当前合法工作单元的证据 |
| Context、版本或 Receipt 冲突 | 在对应来源或接收方解决冲突，再核验当前记录与主控汇总 |

目标事务使用现有项目恢复入口；没有独立的 `lifecycle target recover` 或 `rollback` 子命令。先只读检查，确认实际事务和已有恢复授权后再显式应用：

```bash
yss recover --root /absolute/path/spec --json
yss recover --root /absolute/path/spec --apply --json
yss rollback --root /absolute/path/spec --json
yss rollback --root /absolute/path/spec --apply --json
```

`rollback` 处理最近成功项目事务；不要用它随意选择历史目标。只想继续或改终点时，正常重新规划目标即可；恢复冲突按原事务保护处理，不能覆盖后续用户修改。

## Context 校验与快照

运行 `yss context check --root /absolute/path/project --json`；按需要追加 `--allowed-context-ids ComplianceReview,Reporting` 和 `--term-refs Global/Customer,ComplianceReview/AdmissionDecision`。原生参数使用逗号分隔，成功快照在 envelope 的 `result.context_snapshot`；未选择术语时返回空引用集合及其摘要。旧重复参数仅由冻结历史检查的显式映射转换。

合法 `template-source` 可只读执行 Context check/verify/query，不要求实例 metadata；项目实例仍须通过原有身份校验。缺二进制、快照能力、错误协议、实际非零退出或摘要漂移均阻断，需显式取得正确版本；不得回退旧校验入口。校验不创建批准或执行授权。

## 正式路径中的 Ticket 边界

当前 Spec 模板在 Spec 中起草业务 Ticket，产品设计校准后完成业务正式化，再进入系统 / 数据架构与工程契约；无产品设计影响时从 Spec 直接进入业务正式化。工程契约和实现仓库准备闭合后，进入“实现切片拆分与合同准入”（`stage.ticket-formalization`），由生命周期批准当前 Slice 合同并复算就绪条件。业务 Ticket 不授予实现资格。

阶段名称和条件见[生命周期派生地图](../../process/lifecycle-artifact-map.md)，工作单元依赖见[业务票协议](../../process/business-tickets.md)。以下离线帮助消费 CLI 的固定 Bundle；新模板展示进入下一固定来源构建后，CLI 的来源摘要和阶段名称才相应更新。

<!-- YSS_CLI_HELP_START -->
<!-- Generated by go run ./tools/helpdocs; edit command metadata and fixed help views. -->
# YSS CLI 离线帮助与案例

终端默认中文摘要；管道和重定向保留原结果。`--human` 强制中文，`--json` 保持 outputVersion=1 / protocolVersion=1，二者互斥。`--json --diagnostics` 仅在失败时附加顶层诊断，不改变 `result`。帮助优先处理并始终为文本；它不读取项目、写入文件或访问网络。

诊断区分已确认原因、可能原因和待核验事项；处理命令标记只读、写入或联网。版本要求没有可核验记录时显示‘尚未登记’；远程确认使用 `yss upgrade --check`。
