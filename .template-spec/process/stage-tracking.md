# Plan / Spec / Design 阶段工作追踪

本合同由主 tracker 与生命周期编排器消费。阶段、注册工作单元及父 Ticket 创建时点以生命周期注册表为准；工作项结构以 `schemas/stage-tracking.schema.json` 为准。

## 启用与职责

`.template-spec/agents/issue-tracker.md` 的 `tracker.lifecycle_tracking_version: 1` 表示项目已启用。新初始化默认启用；attach / sync 保留已有配置，未声明的旧项目不自动启用。只读检查不修改项目；旧项目先 plan 再显式 apply。模板源只维护机制，不在模板根生成产品工作项。

完整研发从 Plan（或接入的最近可信阶段）建立唯一父 Ticket。Design 继续使用 checkpoint / map，不创建工程父 Ticket。Backend / Frontend 只消费已交接资产，不因本协议取得 Plan、Spec 或产品设计的编写权限。Dev 消费主模板的同一协议。

checkpoint 的 `stage_tracking` 是阶段工作项当前进度的唯一机器状态源。父 Ticket、map、远程镜像只引用它。业务 Ticket 与工程切片仍由现有 tracker 管理；本协议不替代 Ticket 五态、业务批准、工作单元结果或实现合同。

## 工作项

同一负责人可连续完成的小工作以内联项记录。不同负责人、独立验收、阻塞其他工作或跨阶段延期时创建 `work-items/<id>.md`，类型为 `stage-work-item`。`issues/` 继续承载各 profile 的业务 Ticket / 实现切片。

工作项包含 ID、标题、阶段、注册工作单元、负责人、范围、验收条件、依赖、源资产摘要、进度和验收证据；独立说明文件不保存 `Status` 或进度。相同 ID 恢复时复用；同 ID 不同定义返回冲突。每项 `source_refs` 绑定实际消费的输入；`completion` 逐条将验收条件关联到可读取且当前的证据摘要，不能以文件存在代替验收。

进度为 `pending / running / blocked / completed / cancelled`。取消要有理由；延期保留未完成进度，并记录风险、负责人、解决时点、接收方、后续引用、验证计划和既有决定引用。延期不绕过原有门禁或风险接受规则。完成要求所有依赖已完成、逐条验收有证据且来源未漂移。阶段工作项不得出现 `ready-for-agent`，也不能绑定为 Slice 的实现 Ticket。

## 推进与恢复

1. 正式写入阶段资产前，先建立 checkpoint 与当前工作项；缺负责人 / 范围 / 验收时保留缺口，不推断历史完成。
2. 进入当前阶段前检查 `scripts/stage-tracking check`；恢复时同样执行。阻塞、责任变化、资产批准和阶段退出必须回写，普通编辑仍集中记录。
3. `Workflow Execution Result.checkpoint_ref` 引用当前持久 checkpoint。流转验证读取真实 checkpoint，拒绝仅在结果中自述追踪已完成。
4. 上游或验收证据摘要变化时，用 `plan --refresh` 生成受影响项回到 pending / recheck_required 的差异，再 apply；旧摘要与证据原样保留。复验后由主控更新源摘要及验收映射，清除 recheck_required。
5. 流转要求当前工作单元的必需项完成或按原规则延期；跨阶段检查当前阶段。无依赖工作可继续，延期并不使依赖它的工作可执行。
6. 完成工作项只代表其验收通过，不能替代 Spec、Design 或工程合同批准。

## 公共命令

```sh
scripts/stage-tracking check --root <项目> --checkpoint docs/.scratch/<feature>/checkpoint.yaml
scripts/stage-tracking plan --root <项目> --checkpoint docs/.scratch/<feature>/checkpoint.yaml --items <工作项数组.yaml> > <plan.json>
scripts/stage-tracking apply --root <项目> --plan <plan.json>
scripts/stage-tracking plan --root <项目> --checkpoint docs/.scratch/<feature>/checkpoint.yaml --refresh > <refresh-plan.json>
```

check / plan 不写项目。首次 checkpoint 不存在时，plan 从本项目 checkpoint 模板形成草稿。没有明确工作项时输出 gaps，apply 拒绝。items 只登记 pending 项，不把历史产物推断为完成，也不覆盖已有同 ID 项。

apply 复验项目身份、计划摘要、全部观察文件及源证据摘要，备份后写入。写入失败恢复本次已写内容；若检测到后续并发修改，保留文件并报告恢复冲突。备份和失败清单保存在功能包 verification/stage-tracking-migrations 内；不得删除后续执行证据。相同成功计划再次应用返回 unchanged。

远程 tracker 不可用时，父票保留 publication: pending 和 pending_publication_to；本工具不访问远程平台。下游正式化业务票 / 切片时关联本阶段资产与工作项引用，不将已完成设计工作项改写为开发切片。

首次登记的工作项数组示例（路径、负责人、范围与验收按真实任务填写）：

```yaml
- id: clarify-scope
  title: 明确本轮范围
  stage: stage.plan
  work_unit: work-unit.plan-requirements
  owner: 当前需求负责人
  scope: 明确本轮包含与排除的业务行为
  acceptance:
    - 范围及至少一个边界例子可供审阅
  dependencies: []
  source_refs:
    - docs/.scratch/example/plan/input.md
  split_reasons: []
```

不同负责人和被其他项依赖的工作会自动拆分；独立验收使用 `split_reasons: [independent-acceptance]`。登记只创建 pending 项，不能把输入文件当成已通过的验收证据。启用项目缺少 checkpoint 时，check 返回非零退出码；先审阅并应用登记计划，再进入阶段写入。
