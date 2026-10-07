# 研发工作包布局

`tracker.root`（`.template-spec/agents/issue-tracker.md` frontmatter）是唯一功能包根。新初始化默认 `.work`；已有实例的 attach、sync 和模板升级保留配置与资产。没有配置或配置非法时先修复诊断，不根据目录存在情况选根，不提供环境变量或逐命令覆盖。

目录职责：

| 目录 | 内容与留存 |
|---|---|
| 配置根下的 `<feature>/` | Plan、Spec、设计、API、Ticket、合同、checkpoint、批准和正式证据；项目实例纳入 Git |
| `docs/` | 稳定说明与成果入口；通过引用或派生阅读视图展示当前 Spec |
| `.template-spec/` | 分发流程、Schema、模板与治理规则 |
| `.yss/` | 安装 metadata、事务、备份、迁移回执与恢复材料 |
| 仓外 runtime | 普通日志、缓存、运行历史和可重建材料 |

功能包内部阶段目录保持现有结构。推进时按需创建文件；分发不创建虚构功能包或空阶段占位。根目录 `.scratch`、`docs/requirements/tickets` 只作历史诊断入口。`docs/.scratch` 对配置为该根的旧实例仍是当前写入位置；迁移后的旧根只作历史定位。

模板工具使用 `scripts/lib/work-layout.mjs`；原生 CLI 使用 `internal/worklayout`。两者使用共享路径用例，分别提供配置读取、功能包路径与 checkpoint/Ticket 识别、当前与历史扫描根。写入必须属于当前配置根，并继续执行具体消费者的写范围、安全路径和事务合同；扩大只读扫描不能扩大写权限。正式任务检测同时扫描历史根和相关 Git 历史，目录切换不能获得日常任务资格。

启用新根前，消费者核验 `yss capabilities --json` 的 `work-layout-v1` 能力。历史固定执行器只用于已声明的恢复范围。模板源仓库的本地试验 `.work` 忽略规则在实例分发时排除；实例不能整体忽略持久工作包。临时目录只存可重建文件，批准、原始用户决定和正式证据不得进入忽略目录。

## 显式目录迁移

本版只自动迁移配置为 `docs/.scratch` 的完整根到 `.work`。其他历史布局只读诊断。目录迁移不升级模板，不转换 YAML/JSON，不推进阶段、不批准资产。

```sh
yss migrate plan --root /项目绝对目录 --migration-kind work-layout \
  --out /仓外/布局计划.json --review-out /仓外/布局审阅
yss migrate apply --root /项目绝对目录 --plan-file /仓外/布局计划.json
yss migrate status --root /项目绝对目录
yss migrate recover --root /项目绝对目录
yss migrate rollback --root /项目绝对目录
```

计划绑定身份、配置、完整输入、CLI 摘要、Git HEAD/index 与状态，列出映射、引用差异、权限、冲突和阻断。候选在完整副本中执行 Context、配置根、引用闭包及适用治理校验。未知动态/外部引用、缺失引用、目标已存在、未完成事务或批准重绑定缺失时不可应用。

批准、冻结材料、原始用户决定和历史验证保留原字节。路径或依据字节改变时，使用现行决定与独立会签流程取得新的当前证据，再重新规划；不能把旧记录改写成当前 `approved`。迁移回执和原件备份存入唯一原生 `.yss/transactions` 事务。资产事务未结束时先恢复它，不能并发切根。

审阅包包含逐文件候选、引用差异、目录权限与映射，冲突目录保留原件。明确的新当前材料可通过原生 `--resolution-file` 的 `use-merged` 决议提供；决议必须绑定原始计划摘要、原件摘要、候选摘要及审阅材料。先由现行决定、会签及验证流程形成新证据，再用 `migrate plan --migration-kind work-layout --plan-file <原计划> --resolution-file <决议>` 生成重新核验的计划。原始消息正文不能以此改写；只改路径或摘要的旧批准会被拒绝。缺引用、目标冲突、被忽略的持久资产需先修复并重新规划，不能用决议静默绕过。

回执的 `mapping` 和 `bindings` 保存源/目标位置、前后字节摘要、文件与目录权限，以及原件相对于该事务备份目录的 `objects/<摘要>` 位置。原始执行日志和用户原文按历史材料保留字节，不能据此宣称新路径上的验证已通过。

apply 重验计划输入，并在同一事务内写目标、更新配置及 metadata、退役源文件、保存映射与结果。退出码非零或中断后先检查 status/recover；恢复沿用原生事务的前后字节与权限预检。rollback 先检查完整备份及所有当前目标；迁移后人工修改会阻断覆盖并保留现场。过程不提交、不清理，也不修改 Git index 或 HEAD。

实施结果默认是 `implementation-ready`。候选、集成和发布仍消费各自验证 Profile 与最终固定源码证据；具体真实实例原地迁移按该项目授权执行。
