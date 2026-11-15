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

安装先区分三种职责与范围：spec 承载业务规格、产品设计和产品 Home 入口，backend/frontend 承载专业工程；project 为新安装默认范围，skills 安装技能、宿主入口及必要引用，二者都不生成应用源码。sync 沿用原 Profile 和范围，只有显式 installation 才改变范围。

支持 nextSteps 的开发构建在 init/attach 或 scaffold 成功后提供后续指引；旧版以实际帮助为准。指引不自动执行命令或创建仓库地图；dry-run、sync 和 skills ensure 不给新仓成功建议。command 使用独立 args 数组，由 Agent 沿用本次已核验的程序路径，不拼接 shell 或重新选用 PATH 旧版。

在线升级指定 `upgrade --to <版本> --tool-root <工具目录>`；离线升级指定 `upgrade --artifact <归档> --sha256 <摘要> --tool-root <工具目录>`。不要将两组来源混用。恢复操作按 `recover --help` 选择实际支持的项目或工具目录参数。

此接口不提供旧 plan/apply、生命周期、合同、证据、门禁、插件或脚本执行入口。

CLI 3.0.3 起，在线升级默认 GitHub `iloveZzz/yss-cli`，GitLab 为次级选择：先确认 `upgrade --help` 支持 `--source`，再用 `upgrade --source gitlab --to <版本> --tool-root <目录>` 显式选择，并提供该来源要求的 CA 与鉴权。来源失败不自动切换；离线归档不与 `--source` 混用。旧程序不会随模板文档自动获得这些行为。

`scaffold frontend --project-name <kebab-case> --output-dir <已有父目录>` 从 CLI 3.3.0 起支持，仅生成工程，`--dry-run` 也要求父目录存在；空目标目录同样拒绝。不由 Profile 支持版本推断命令能力；旧 CLI 缺少时说明能力缺口。

工作台接口以 `workbench --help`、`workbench register --help` 和 `workbench request --help` 为准，不能把新源码能力当作已安装版本能力。支持时使用 `workbench register --root <项目绝对路径> --source <主Spec项目相对路径> --json`，从一个主文件的 `yss-spec` JSON 元数据读取范围、关联资源和问题；更新复用同一登记。`workbench request --spec-id <实际ID> --json` 只读输出交给 Agent 的续办上下文。登记失败不删除源文件，修复具体错误后重试同一主文件；登记、答复保存、内容就绪和用户确认是不同结果。

刷新或再次 `register` 已登记的主 Spec 时，保留用户设置的启用／停用状态（`active`）。新需求无约定时使用固定创建日期与具体英文主题组成 key，主文件为 `docs/spec/<key>/<key>-spec.md`。支持新命名识别的 CLI 只归并同目录同 key、无自身元数据且被主文档 resources 明确本地引用的 `<key>-interaction.md`（kind=interaction）或 `<key>-design.md`（kind=supplement/other）。旧 `spec.md + interaction.md` 的无元数据推断保留；旧主文件有元数据时须明确本地引用交互说明，兼容原 kind。自身有效元数据保持独立，其他参考文件不因引用而停用；个人资源和正文链接不代表新附件归属，资源模型没有 owner。主文件 register/refresh 才停用符合条件的旧附件记录，单独刷新附件不合并；发现错误会告警并跳过候选。上述兼容性须用实际程序核验，模板更新和同名命令帮助不会使旧二进制获得新行为。

已有路径继续维护，不自动迁移。明确改名时，先核实原数据目录、Spec ID 和新路径是否被启用/停用记录占用；安全改名并更新正文链接、来源与个人资源后，先编辑原 Spec 的“主规格相对路径”，再 register 新路径并核对仍为原 ID。不能先新建登记再合并，停用不释放路径；改路径指向已归属附件会被拒绝。答复与历史保留，但路径参与摘要，纯改名后仍须重新核对确认；中途失败修复同一记录，不覆盖并发改动或创建补偿 Spec。

先从已有启动信息或续办文本核实工作台数据目录；使用自定义目录时，所有命令均以 `workbench --data-dir <已核实的绝对路径> ...` 执行，只有确认使用默认目录时才省略，不能在默认库另建登记。当前 web 资源会阻塞确认，需将相应资源项替换为已核验的项目内本地快照（`targetType: "local"`）；原链接可保留在正文来源中，同时保留 web 资源项仍会阻塞。

先查 `workbench respond --help`。支持时，答复使用 `respond --spec-id <ID> --question-id <原问题ID> --question-digest <当前摘要> --kind answer --answer <实际答复> --json`；延期使用 `--kind defer --reason <原因> --impact <影响> --excluded-scope <排除范围>`，并提供 `--review-at YYYY-MM-DD --review-utc-offset-minutes <当地UTC偏移分钟>`（中国为 `480`）或 `--review-when <复查条件>`。`request` 的 `data.text` 中问题 JSON 数组通过每项的 `question.id` 识别原问题，当前摘要和已保存答复 ID 分别在该项的 `digest`、`response.id`；实际答复 ID 也由 `respond` 的 `data.responseId` 返回。不要猜测 ID 或把旧答复应用到已变化问题。延期回写须在原问题同时写入 `status: "deferred"`、说明延期依据的非空 `resolution` 和本次真实延期答复 ID 对应的 `appliedDecisionId`；缺一仍为待回写，不能改成 resolved。用户原文须安全传参，保存答复不会自动回写规格或解决问题。
