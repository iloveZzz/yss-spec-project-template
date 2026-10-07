# 项目治理 CI 与恢复预检

此入口适用于 `project-instance`。初始化、同步仅分发工具，不自动写 `.github`；业务构建仍使用实现仓库的工作流。远端分支保护由维护者配置，不由本工具更改。

```sh
node scripts/project-ci plan --provider github --root . --branch main > /tmp/yss-ci-plan.json
node scripts/project-ci apply --root . --plan /tmp/yss-ci-plan.json
node scripts/project-ci check --root . --json
node scripts/project-ci check --root . --base <PR基线的40位提交> --json
node scripts/lifecycle-status --root . --checkpoint .work/feature/checkpoint.yaml --preflight
```

计划列出目标分支、范围、文件内容、输入摘要和冲突。仅显式 apply 写入独立工作流、接入配置和托管凭据；保留其他工作流。输出文件已被手工修改、计划过期或同名文件未托管时拒绝覆盖。中断后执行 `node scripts/project-ci apply --root . --recover`，按事务日志恢复旧字节；遇到后续人工修改时停止并保留现场。重复 apply 无变化；tracker 或工具输入变化后须重新 plan。

范围来自 `.template-spec/agents/issue-tracker.md` 的 `tracker.root`，可用重复的 `--additional-path <根相对路径>` 显式补充。接入配置只登记范围与分支，不复制阶段状态。完整检查范围内已登记记录及其本地引用闭包；草案允许缺少未来阶段产物。当前批准、完成、流转和 `ready-for-agent` 声明必须具有可校验的依据。当前流转由 `stage_trace.completed_work_unit` 与 `next_work_unit` 交给现有流转校验器核验。只安装当前阶段能力即可；命中未来阶段检查但工具尚未安装时报告能力缺失，显式补齐后重验。

报告包含实际校验命令、输入引用及摘要、退出码、耗时、日志、未知资产和诊断。命令来自固定校验入口；不会执行 checkpoint/合同中自由填写的业务命令。普通状态查询仍只读状态；只有 `--preflight` 执行当前校验。运行中、失败或未知任务不能当成完成或自动重复派发；任务结果确认后由主控恢复。

GitHub 工作流运行于 PR、计划中目标分支 push、手动执行，固定汇总检查名 `YSS governance`，日志以 artifact 保留。PR 对照目标基线检查范围缩小、checkpoint 删除和批准依据删除。删除或归档必须先形成可审阅的显式处置，不能靠删除记录使检查变绿。维护者可在远端将 `YSS governance` 设为 required check；本地通过不代表远端已配置。

`project-ci` 与恢复预检：0=适用检查通过或计划/应用成功；1=检查失败或计划冲突；2=输入、能力或执行异常。JSON 的 `status` 和诊断必须一起读取。查询工具的 0 只表示诊断执行完成，不能替代批准、执行授权或发布结论。`--history` 仅供历史记录只读兼容，CI、当前流转和恢复预检不使用历史结果放行。
