# 功能资产受控整理

目标是移除可重建缓存、归档未引用的旧草稿。不会批准合同、推进阶段、改写 checkpoint 或重算业务状态。父 Ticket 保留五态、业务说明与资产 / 会签入口，阶段、阻塞和下一工作单元引用实际 checkpoint 并按需查询；阅读包保持显式启用、默认 `manual`。

## 命令

```sh
scripts/feature-assets inspect --root <项目绝对路径> --checkpoint docs/.scratch/<feature>/checkpoint.yaml --json
scripts/feature-assets plan --root <项目绝对路径> --checkpoint docs/.scratch/<feature>/checkpoint.yaml \
  --candidate docs/.scratch/<feature>/verification/prototype-evidence-draft.yaml \
  --archive-dir <项目外全新归档绝对路径> > <项目外计划.json>
scripts/feature-assets apply --root <项目绝对路径> --plan <项目外计划.json>
scripts/feature-assets restore --root <项目绝对路径> --receipt <归档绝对路径>/receipt.json
```

路径必须显式给出，候选使用根相对路径。inspect / plan 只输出 JSON，不写项目。计划展示删除、归档、保留、理由、引用和内容 / 权限摘要，绑定项目身份、工具实现与引用扫描输入。apply 重新生成判定并检查输入；漂移后重新计划，不强行继续。退出码 0 为操作完成，1 为缓存占用或不可判定而部分保留，2 为输入 / 冲突 / 执行错误。

## 分类与引用

- 仅登记 `verification/browser/.chrome-profile` 与 `.chrome-baseline-profile` 两种可重建测试缓存允许删除；`ps` 或 `lsof` 不可用、诊断异常、占用信息出现时保留，不终止进程。
- `verification/prototype-evidence-draft.yaml` 已有正式对应资产、`plan/stage-items.yaml` 已有 checkpoint 工作项、`verification/browser/summary.json` 已有详细结果时可作为归档候选。
- `gates/captures/*-question.yaml` 仅全为数字人提问、具有 message ID 且无决定字段时可作为归档候选；原始人工回复保持保护。
- 合同、批准、任务包、正式验证、迁移回执、冻结交接及未知类别默认保留。重复字节只是统计信息，不是删除依据。
- 按文件名、根相对路径、提问 message ID 扫描引用，直接写入摘要的语句只记生产者。可识别但无法确定的动态消费、符号链接和过大文本会阻止候选处理；无引用本身不构成许可。扫描范围与边界见下节。

## 执行与恢复

归档按“复制 → 校验 SHA-256、大小和权限 → 移除原件”执行。外部目录内统一 `receipt.json` 保存逐项执行态，不为项目资产增加 sidecar。中断后用同一计划继续：复制结果先复核；删除缓存仅接受原树的未改变剩余子集。已处理计划返回原结果，不重复操作。不要将归档目录放进被扫描项目。

restore 先校验所有备份和目标，再逐项恢复；目标已有不同内容或权限则拒绝覆盖。缓存不参与恢复。来源父目录保留，恢复文件内容与权限。执行期间避免其他进程编辑同一功能包；再次检测到输入漂移即停止，已完成项由回执恢复，不覆盖后续人工修改。

旧父 Ticket 只对明确指定文件制作迁移差异，保存完整原文；状态冲突同时列出父票与 checkpoint 原值，保持冲突待处理，不改变 checkpoint、批准记录、Ticket 五态或执行权限。批准 / 冻结摘要绑定父 Ticket 时，先报告引用并保留原件，不能当作普通阅读页改写。

## 扫描边界

本工具用于受控的本地功能包，不证明任意外部系统或动态程序不存在引用。扫描项目内文本资产及本地脚本，排除版本控制、依赖、图索引、运行时投影及已登记浏览器缓存。模板 / canonical Skill / 工具文件仅在与安装元数据摘要一致时按通用框架跳过引用解释；本地新增或修改内容继续扫描。整理工具自身与本文不作为功能消费方，仍绑定其摘要。外部 tracker、运行中的 Agent 上下文、任意反射或网络引用需要操作者确认；已知动态来源不能解析时保留候选。不要在未知引用环境自动批量 apply。

首次实例迁移在完整副本验证，正式执行前保存项目外完整备份。对相同门禁做前后验证，正式资产摘要保持一致；既有失败原样报告，整理完成不代表阶段通过。
