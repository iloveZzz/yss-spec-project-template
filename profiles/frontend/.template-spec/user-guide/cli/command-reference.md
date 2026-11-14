# 命令参考

命令支持以所装版本帮助为准。先运行 `yss version` 和 `yss help`，仅使用该版本实际支持的命令；模板更新不改变旧二进制能力，也不代表当前程序是最新发行。

| 命令 | 用途 |
|---|---|
| `init` | 初始化项目入口与所选资产 |
| `attach` | 接管已有工程，保护用户文件 |
| `sync` | 同步受管资产；安装方式转换用该版本帮助列出的开关 |
| `skills list` / `skills ensure` | 列举或补装所选技能与依赖资源 |
| `scaffold catalog` | 查看 Java 平台及 frontend 环境声明和参数 |
| `scaffold ddd` / `scaffold mvc` | 在全新目标目录生成后端骨架 |
| `scaffold frontend` | 在全新目标目录生成最小 Vue 工程；CLI 3.3.0 起支持，先查实际帮助 |
| `upgrade` | 在线或离线升级 CLI |
| `doctor` | 诊断受管文件、冲突与安装状态 |
| `workbench register` | 支持该子命令的版本中，登记或更新一个主 Spec 及其关联产物、问题；先查实际帮助 |
| `workbench request` | 支持该子命令的版本中，读取 Spec 续办上下文与已有答复，不自动启动 Agent |
| `workbench respond` | 支持该子命令的版本中，保存实际答复或延期，返回供 Agent 回写关联的答复 ID |
| `recover` | 恢复未完成事务，保护后续用户修改 |
| `version` / `help` | 查看实际版本、来源与帮助 |

CLI 3.2.0 的项目选择支持 `--profile spec|backend|frontend`、`--installation project|skills`。frontend 需要对应 Bundle，3.1.4 及以前不支持；先确认实际版本与帮助。`init`、`attach`、`sync`、`skills ensure`、`scaffold` 和 `upgrade` 使用 `--dry-run` 预览；实际参数以对应帮助为准。前端接入见 [Frontend](tutorial-frontend.md)。

在线升级指定 `upgrade --to <版本> --tool-root <工具目录>`；离线升级指定 `upgrade --artifact <归档> --sha256 <摘要> --tool-root <工具目录>`。不要将两组来源混用。恢复操作按 `recover --help` 选择实际支持的项目或工具目录参数。

此接口不提供旧 plan/apply、生命周期、合同、证据、门禁、插件或脚本执行入口。

CLI 3.0.3 起，在线升级默认 GitHub `iloveZzz/yss-cli`，GitLab 为次级选择：先确认 `upgrade --help` 支持 `--source`，再用 `upgrade --source gitlab --to <版本> --tool-root <目录>` 显式选择，并提供该来源要求的 CA 与鉴权。来源失败不自动切换；离线归档不与 `--source` 混用。旧程序不会随模板文档自动获得这些行为。

`scaffold frontend --project-name <kebab-case> --output-dir <已有父目录>` 从 CLI 3.3.0 起支持，仅生成工程，`--dry-run` 也要求父目录存在；空目标目录同样拒绝。不由 Profile 支持版本推断命令能力；旧 CLI 缺少时说明能力缺口。

工作台接口以 `workbench --help`、`workbench register --help` 和 `workbench request --help` 为准，不能把新源码能力当作已安装版本能力。支持时使用 `workbench register --root <项目绝对路径> --source <主Spec项目相对路径> --json`，从一个主文件的 `yss-spec` JSON 元数据读取范围、关联资源和问题；更新复用同一登记。`workbench request --spec-id <实际ID> --json` 只读输出交给 Agent 的续办上下文。登记失败不删除源文件，修复具体错误后重试同一主文件；登记、答复保存、内容就绪和用户确认是不同结果。

刷新或再次 `register` 已登记的主 Spec 时，保留用户设置的启用／停用状态（`active`）。自动合并停用仅限主 Spec 同目录、且没有独立 `yss-spec` 元数据的 `interaction.md`；其他关联或参考文档正常作为资源展示，不因被引用而停用其独立 Spec。资源模型没有 `owner`，不能据此猜测文档归属。

先从已有启动信息或续办文本核实工作台数据目录；使用自定义目录时，所有命令均以 `workbench --data-dir <已核实的绝对路径> ...` 执行，只有确认使用默认目录时才省略，不能在默认库另建登记。当前 web 资源会阻塞确认，需将相应资源项替换为已核验的项目内本地快照（`targetType: "local"`）；原链接可保留在正文来源中，同时保留 web 资源项仍会阻塞。

先查 `workbench respond --help`。支持时，答复使用 `respond --spec-id <ID> --question-id <原问题ID> --question-digest <当前摘要> --kind answer --answer <实际答复> --json`；延期使用 `--kind defer --reason <原因> --impact <影响> --excluded-scope <排除范围>`，并提供 `--review-at YYYY-MM-DD --review-utc-offset-minutes <当地UTC偏移分钟>`（中国为 `480`）或 `--review-when <复查条件>`。`request` 的 `data.text` 中问题 JSON 数组通过每项的 `question.id` 识别原问题，当前摘要和已保存答复 ID 分别在该项的 `digest`、`response.id`；实际答复 ID 也由 `respond` 的 `data.responseId` 返回。不要猜测 ID 或把旧答复应用到已变化问题。延期回写须在原问题同时写入 `status: "deferred"`、说明延期依据的非空 `resolution` 和本次真实延期答复 ID 对应的 `appliedDecisionId`；缺一仍为待回写，不能改成 resolved。用户原文须安全传参，保存答复不会自动回写规格或解决问题。
