# 生命周期进度上报

已登记的 Spec 在工作台作业、日常 Codex/终端研发、PR/MR 与 CI 跟进中共用本方法。沿原任务或实际 Issue 保留目标、授权、验收引用和工程结果。业务规则继续由原 Spec、文件或本身作为来源的 Issue 正文维护，工作台汇总实际进展及证据。

## 定位同一 Spec 与本次目标

接手、续办或交接时，从实际启动信息、既有续办文本和登记结果核实下列身份，保留在当前任务中。

- 工作台 `dataDir` 与 `specId`。自定义数据目录沿用已核实的绝对路径，所有工作台命令使用同一 `--data-dir`。主文件改名仍接续原 Spec 身份。
- 生命周期列表用 `yss workbench query --entity spec --progress-basis effective`。按标题或路径定位已关闭及停用项时补 `--activity all --include-closed`，再核对工程根及主文件相对路径。只读核实和建议使用 `spec-status`、`lifecycle-status`、`recommend-status`。未设置目标与读取失败分别处理，纯查询不登记目标。
- 已登记目标的 `specDigest` 和 `goalVersion` 从同一 Spec 的 `lifecycle --json` 响应读取，分别位于 `result.progress.goal.specDigest` 和 `result.progress.goalVersion`。核对当前产物时读取 `result.spec.content.artifactDigest`，并记录实际采用材料的 commit、工作树摘要或读取时点。新目标采用当前产物时，也可从 `snapshot --json` 的 `result.specs` 找到 `record.id` 等于本次 `specId` 的条目，取其 `content.artifactDigest`。
- 本次目标与完成终点，使用本地实现 `local`、合并 `merged` 或环境验证 `environment` 的实际目标，附具体范围与目标引用。
- 本次适用的阶段及理由。阶段名为 `research`、`analysis`、`spec`、`prototype`、`handoff`、`implementation`、`verification`、`delivery`，按当前范围选择适用项。
- 参与工程的真实 `projectId`、角色和名称。角色为 `spec`、`backend`、`frontend`、`integration`，可包含多个 Backend、多个 Frontend 及集成工程。采用版本分别关联各工程。
- 原 FR/AC、章节、实际 task/Issue 或既有验收链接，以及仍有效的动作授权。

工程任务先核对目标仓库和实际关联仓库的规则、工程材料及验收依据。工作台操作查阅实际使用版本的 CLI 帮助和公开使用说明。专门排查 CLI 实现问题时再定位 CLI 源码。

将已核实的新目标写入 `set-goal`，核对响应的 `revision` 与 `specId`，再用 `lifecycle` 读取保存后的目标版本。目标版本由范围、终点、适用阶段、参与工程、验收引用及 Spec 摘要共同确定。重复登记当前相同目标时复用既有版本。CLI 返回 `roundId` 时，可用它区分轮次和同轮目标版本。写入始终以实际采用的 `goalVersion` 为准。开始依赖工作时核对已登记目标的采用摘要与当前产物摘要。发现候选 Spec 或共用材料变化时先核实适用性。已有交付确认继续对应其目标，明确启动新一轮后再登记新目标及采用版本。工程实际版本继续随报告证据关联。授权研发直接开始，目标与报告随实际工作补齐。

CLI 帮助列出 `progress cancel-goal`、`progress reopen-goal` 时，可以按用户授权取消目标或开启新一轮。取消保留原因与成果，已启动作业通过各自入口管理。重开保留原 `specId`，即便采用相同范围也取得独立 `goalVersion`。重试沿用原请求 ID 与原输入。收到回执后另外查询当前目标。旧作业和迟到结果沿实际绑定的 `goalVersion` 上报到原轮。引用旧报告前核对其验收、输入、实际工程版本及环境是否仍适用，并在本轮报告记录原报告身份和采用依据。

## 上报阶段进展

工作台作业和日常终端使用同一 Spec 身份上报。开始或恢复时读取当前目标，取得实质进展、遇到阻塞、验证结果变化、PR/MR 或 CI 状态变化以及达到本次终点时更新相应阶段。重复执行使用稳定请求身份，先核对上次结果再重试。

每项 `report` 绑定 `specId`、`goalVersion`、`specDigest`、阶段和参与工程，说明真实进度、摘要、阻塞、下一步、原范围引用、实际采用的工程版本及证据。进度与适用性分别填写。

| 字段 | 含义 |
| --- | --- |
| `progress` | `unmarked` 未标记，`todo` 待开始，`doing` 进行中，`blocked` 阻塞，`done` 已完成，`skipped` 本次跳过 |
| `validity` | `current` 对当前版本有效，`unverified` 待核实，`needsSync` 待同步，`needsReview` 待复核 |
| `versions` | 按 `projectId` 关联实际参与工程，采用当前 `lifecycle` 返回的 `result.progress.currentVersions` 中对应的 `commit` 与 `workingTreeDigest` |
| `evidence` | 实际文件、产物、命令、测试、合并、环境或验收引用，并附实际结果 |

后台依据已保存目标、报告、确认和当前产物确定性汇总阶段与整体进展。Agent 判断业务覆盖、验收含义、变更影响或环境结果时，在摘要中说明判断依据并附可核对证据。缺失凭据、材料不可读或检查结果未知时使用待核实，并写明具体缺口。核实时间取实际读取或执行时间，无法取得时保留未知。

证据应足以恢复结果及其适用版本。

- 本地实现关联真实工程与受影响路径、采用版本、实际命令及结果。未提交内容可用实际工作树摘要关联。当前程序支持时，执行检查前运行 `yss workbench progress observe-inputs --project <实际工程ID> --path <工程相对文件或目录> --json`，可重复指定 `--path`。登记检查采用的完整输入，包含共享代码、配置和生成输入。核实检查前后采用的是同一份输入，将原结果的 `inputs` 和 `version` 分别纳入报告的 `inputPaths` 和 `versions`。保存时比对原 `observedDigest`，输入变化后重新检查。
- PR/MR 关联实际候选 SHA、目标版本、run/pipeline ID、attempt/job、实际检出或测试的提交组合及必要检查结果。源提交、临时合并提交和队列组合沿平台事实记录。
- 联调与环境验证关联各参与工程的实际版本组合、契约或配置版本、环境及执行结果。分仓检查和组合检查分别保留实际证据。
- 失败、跳过、取消、允许失败、模拟验证及访问不完整保留真实含义。原验收中仍未验证的范围继续展示。

PR/MR 的持续处理沿项目已有跟进方法执行。达到本地实现、合并或环境验证中的本次指定终点后，按原验收报告实际结果及剩余范围。任务完成可使用已有阶段证据，后续新目标由用户触发。

## 用户确认与版本变化

关键需求确认、业务验收和最终交付确认使用用户明确表达的决定，关联实际展示的范围、`goalVersion`、`evidenceDigest` 与原始答复来源。先通过 `lifecycle` 读取当前汇总，从 `result.progress.evidenceDigest` 取得本次展示的证据摘要，再按真实答复保存 `confirm` 或 `reject`。确认阶段分别使用 `spec`、`verification`、`delivery`。当前接口确认整个目标范围，`scope` 与当前目标逐字一致。用户仅确认部分范围时在原任务保留真实决定，按用户明确范围调整相应目标，展示对应范围与证据后关联确认。Agent 的内容就绪判断、代码完成、CI 通过或合并结果各自保留其证据与含义。

确认保存后，后台在决定记录中生成 `stageEvidenceDigest`，用于核对后续变化对该阶段确认的影响。`lifecycle` 的 `result.progressHistory.decisions` 保留这一记录及实际确认输入，提交确认时填写当前整体 `evidenceDigest`。

当前版本内的用户手工更正优先用于展示，保留更正原因和版本。后续 Agent 报告接续该决定并处理实际冲突。用户撤销更正后按现有证据重新汇总。

Spec、目标、参与工程、代码、配置或环境变化后运行 `reconcile` 并核对影响。旧版本成果、报告和确认保留原范围与版本，受影响项标记待同步或待复核，未受影响的成果按实际依据复用。旧确认的适用范围由对应用户决定及版本证据确定。

共享材料待核实时，对照本 Spec 的已确认材料、当前可观察的变更及原 FR/AC。核实既有确认材料仍适用时，将该材料的关联目标路径写入 `keepConfirmed`。确需采用本轮最新版时，将当前实际可读材料的关联目标路径写入 `adoptLatest`。在 `reason` 中记录已核实的版本、变更、受影响范围和采用依据。普通核实省略 `bindings`，沿用已有绑定。经核实确需调整绑定时才传入完整显式绑定列表，绑定或来源变化后重新读取并核实。该操作记录影响及材料采用依据，用户通过工作台确认就绪的新版内容。

当前 Agent 会话或作业继续原已授权工作，处理本次范围内的反馈、验证和可恢复失败。范围扩大、额外终点或新的业务取舍交由用户明确决定。续办文本保留尚在执行的操作及下一步，宿主实际停止后的执行情况按可取得事实说明。

## CLI 能力与保存顺序

先查看实际安装版本及子命令帮助，再采用支持的接口。

```sh
yss version
yss workbench --help
yss workbench snapshot --help
yss workbench lifecycle --help
yss workbench progress --help
yss workbench progress set-goal --help
yss workbench progress report --help
yss workbench progress confirm --help
yss workbench progress reconcile --help
yss workbench review-materials --help
```

本方法随模板分发，具体命令以正在运行的 CLI 为准。工作台回写缺少接口、权限或执行失败时，在原任务结果记录实际命令、CLI 版本、错误和待同步项，继续本次已授权且具备业务依据的工作和验收。恢复回写能力后，读取同一数据目录和 Spec，核对当前版本及已保存结果，再补报。

主 Spec、交互说明或原型保存/更新后，继续通过已有 `workbench register` 接口登记同一主 Spec，再读取真实摘要和进度。`set-goal` 保存目标，`report` 保存阶段证据，`confirm` 保存真实用户决定，`reconcile` 重新核对现有事实，`review-materials` 保存材料核实结果。除 `reconcile` 外，上述四项写入使用 `--input <文件路径|->` 读取 JSON。各次写入均使用稳定 `--request-id` 和 `--json` 返回，保留真实响应。输入文件属于本次临时命令材料，原任务、原验收和业务来源持续沿用。

### JSON 输入与命令示例

以下为字段示例。将占位文本替换为当前工作台、原任务与实际执行取得的值，`stages` 按本次范围选择至少一项，`participants` 只列真实工程。新目标采用当前产物时，`specDigest` 取当前 SpecView 的 `content.artifactDigest`。保存或续办目标后，通过 `lifecycle` 读取 `result.progress.goalVersion` 和 `result.progress.goal.specDigest`，确认前取 `result.progress.evidenceDigest`。

`goal.json` 保存本次目标。

```json
{
  "specId": "<实际Spec ID>",
  "scope": "<本次已授权范围原文>",
  "target": {"kind": "local", "label": "<本次本地实现终点>"},
  "stages": [
    {"stage": "implementation", "applicable": true, "reason": "<适用依据>"},
    {"stage": "verification", "applicable": true, "reason": "<适用依据>"}
  ],
  "participants": [
    {"projectId": "<实际后端工程ID>", "role": "backend", "label": "<工程名称>"}
  ],
  "acceptanceRefs": ["<原任务或FR/AC的实际引用>"],
  "specDigest": "<当前实际Spec摘要>"
}
```

`report.json` 保存一次实际观察。`id` 为本次观察分配稳定身份，相同内容重试沿用该 ID，新观察使用新 ID。`versions` 从 `result.progress.currentVersions` 选择本次实际参与工程并保留 `projectId`、`commit`、`workingTreeDigest`，版本缺失时标明待核实。证据 `kind` 使用 `document`、`artifact`、`command`、`test`、`merge`、`environment`、`acceptance` 或 `other`，`outcome` 使用 `passed`、`failed` 或 `observed`。

```json
{
  "id": "<本次观察的稳定ID>",
  "specId": "<同一实际Spec ID>",
  "goalVersion": "<lifecycle的result.progress.goalVersion>",
  "specDigest": "<lifecycle的result.progress.goal.specDigest>",
  "stage": "implementation",
  "projectId": "<实际后端工程ID>",
  "role": "backend",
  "progress": "doing",
  "validity": "current",
  "summary": "<已取得的实际进展>",
  "blocker": "<实际阻塞，无则空字符串>",
  "nextAction": "<本次范围内的下一步>",
  "scopeRefs": ["<原FR/AC或验收章节>"],
  "versions": [{"projectId": "<实际后端工程ID>", "commit": "<currentVersions中的实际提交>", "workingTreeDigest": "<currentVersions中的实际工作树摘要>"}],
  "evidence": [{"kind": "command", "label": "<实际命令及结果>", "reference": "<可核对的实际日志或任务引用>", "outcome": "observed"}]
}
```

`confirmation.json` 只填用户已明确表达的实际决定，`source` 指向确认人及原始答复出处。按具体确认事项选择适用 `stage`，决定值为 `confirm` 或 `reject`。

```json
{
  "specId": "<同一实际Spec ID>",
  "goalVersion": "<当前目标版本>",
  "stage": "verification",
  "scope": "<与当前goal.scope逐字相同的已展示范围>",
  "evidenceDigest": "<用户本次核对的result.progress.evidenceDigest>",
  "source": "<实际用户答复出处>",
  "decision": "confirm"
}
```

`material-review.json` 记录一次材料核实。先从同一 `dataDir` 和 `specId` 的 `lifecycle` 响应读取 `result.spec.content.materialReviewDigest`，填入 `observedDigest`。摘要缺失时记录材料核实待同步。示例沿用已确认材料，需要采用当前可读版本时，将 `keepConfirmed` 改为 `adoptLatest`，填入本次采用的实际关联目标路径并更新理由。

```json
{
  "specId": "<同一实际Spec ID>",
  "observedDigest": "<lifecycle的result.spec.content.materialReviewDigest>",
  "reason": "<已核实的材料版本、当前变更、对应FR/AC及采用依据>",
  "keepConfirmed": ["<已核实仍适用的实际关联材料目标路径>"]
}
```

命令中的 `YSS_PROGRESS_DATA_DIR`、`YSS_PROGRESS_SPEC_ID` 和各请求 ID 变量取自本次已核实上下文。以下命令分别用于对应操作，执行 `confirm` 前先核对适用阶段的真实证据、当前摘要和用户答复。每个操作使用各自稳定的请求 ID，相同请求重试沿用原 ID 和原载荷。相同 ID 配不同内容会冲突，响应未知时先核实已有结果。材料来源、绑定或采用结论变化时，重新读取摘要，核实后用新请求 ID 提交。

```sh
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" snapshot --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" progress set-goal --input goal.json --request-id "$YSS_PROGRESS_GOAL_REQUEST_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" lifecycle --spec "$YSS_PROGRESS_SPEC_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" progress report --input report.json --request-id "$YSS_PROGRESS_REPORT_REQUEST_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" lifecycle --spec "$YSS_PROGRESS_SPEC_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" progress confirm --input confirmation.json --request-id "$YSS_PROGRESS_CONFIRM_REQUEST_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" progress reconcile --spec-id "$YSS_PROGRESS_SPEC_ID" --request-id "$YSS_PROGRESS_RECONCILE_REQUEST_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" lifecycle --spec "$YSS_PROGRESS_SPEC_ID" --json
yss workbench --data-dir "$YSS_PROGRESS_DATA_DIR" review-materials --input material-review.json --request-id "$YSS_PROGRESS_MATERIAL_REVIEW_REQUEST_ID" --json
```

## 交接与 Agent 续办请求

Spec 交接先核实同一 `dataDir` 和 `specId`，附实际采用的主 Spec、关联产物、工程版本、原验收、完成终点及当前缺口。自定义目录放在受控续办上下文中，分发模板使用占位项。

查询范围限于本次已知的工作台数据目录，使用默认工作台时也要核对记录对应的工程根及主文件。没有匹配记录和其他可信目录依据时，说明记录缺口并用当前工程材料继续。Pi 中按工作区映射核对隔离稿与原工程的对应关系。纯进度询问按只读查询处理，在会话反馈结果。

终端 `request` 和工作台可复制续办文本将主文件的「来源摘要」与生命周期上报上下文分开。续办已登记目标时，沿同一 `dataDir` 和 `specId` 用 `lifecycle` 核对 `result.progress.goalVersion` 及 `result.progress.goal.specDigest`，用于阶段上报。用 `result.spec.content.artifactDigest` 核对当前产物。Pi 的隔离作业通过工作台关联实际进度，绑定目标时会附本次运行的目标版本和摘要。

接收方先核对主文件及关联原型、交互说明。主文件来源摘要相同也要检查关联材料：有 `materialChanges` 时结合已确认版本、当前可观察版本和实际可读文件定位差异，有缺项时按可用的 `snapshot` 或 `lifecycle` 只读核实。共享材料可能继续采用已确认快照，此时分别写明当前采用版本和可观察的新版。Pi 隔离续办同时核对隔离稿实际带入的文件，原工程的版本线索只能证明原工程的状态。正文或材料无法读取时，指出具体缺口和受影响的判断。

明确受影响的 FR/AC、还需复核的检查及仍可沿用的依据。按已确认的范围和版本复用工作台记录及真实用户答复，再在本次授权内继续。保存或修改产物后仍登记原主 Spec，阶段报告继续写回同一数据目录及 Spec。
