# 技能真实 Agent 评测入口

`skills-agent-eval.py` 仅供模板维护使用。每次运行选择一个冻结来源目录和一个 variant；先串行完成基线，再以相同场景、模型、推理档位和运行时运行候选。场景必须是可丢弃的独立 fixture，不得指向真实业务目录。

```bash
python3 .template-source/scripts/skills-agent-eval.py \
  --source /absolute/path/to/frozen-baseline \
  --scenarios /absolute/path/to/scenarios.json \
  --output /absolute/path/to/baseline-results \
  --variant baseline \
  --codex /absolute/path/to/codex \
  --model <available-model> --reasoning-effort high \
  --repetitions 2 --timeout 300 --max-turns 28 --max-seconds 5400 \
  --python-dependencies /absolute/path/to/offline-python-dependencies
```

候选换用 `--source`、`--output` 与 `--variant candidate`，其他配置保持一致。示例预算只作参数演示，实际值依据已测样本登记；默认每个进程分别计数；跨版本、宿主与重试共用预算时，所有进程必须使用同一个仓库外 `--budget-ledger` 及相同的 `--max-turns` / `--max-seconds`。账本用文件锁和原子替换累计启动尝试与 Agent 实际执行秒数；启动前预占本次超时时间，异常退出留下的预占不自动退还。不得换账本或提高限额绕过批准的上限。修复后仅复跑受影响场景时使用 `--scenario <id>` 和新的输出目录；保留此前失败，不覆盖或删除不满意的样本。源目录通过 `source_paths` 声明复制闭包，并以 `required_paths` 声明必须存在的来源。默认包括 `.agents`、平台技能包、`.template-spec`、`.template-source/process` / `distribution` / `agents`、docs、根 package.json / README、scripts、CONTEXT 和仓库身份。自定义 `source_paths` 会替代默认闭包，必须检查场景实际消费的导航目标；裁剪 fixture 中的缺失文件不能当作源仓缺陷。必需来源在源目录、复制后测试目录、注入后及各步启动前分别检查；注入文件不能冒充遗漏的源文件，setup 删除必需文件同样阻止启动。原始 AGENTS.md 保留，仅追加标记明确且两侧相同的 fixture 隔离约束；保存原始与有效规则摘要。凭据由运行时单独使用，不复制进产物目录。

场景 JSON 为 `{"scenarios": [...]}`；每项含 `id`、`repo`（来源目录中的相对仓库路径）、`prompt`、可选 `files`（fixture 文件内容）及 `assertions`。断言支持存在/不存在、文本、JSON 字段、原文件不变、命令、最终答复、DOCX ZIP 内容及 Node 行为检查。所有产物路径必须留在 fixture 中。修正判定器应记录前后摘要、原因，证明提示和 fixture 未变，再对两侧统一重评分；不因此重跑模型挑样本。

`json_equal` 要求顶层为对象、字段存在且值与类型一致，`0` 不能充当 `false`。错误 JSON、非对象、不可读内容及 Node 断言超时记为失败；判分错误不丢弃已取得的运行轨迹、用量和步骤结果。

新场景应声明 `allowed_writes`：`["assessment.json"]` 只允许该文件变化，`["drafts/"]` 允许该目录下文件变化，`[]` 表示只读。只接受工作区相对路径，不支持 glob；根 AGENTS.md 和运行时目录不得作为允许目标。每步对比启动前后文件摘要和符号链接，未允许的新增、修改、删除及指向工作区外的新链接使自动检查失败。步骤声明覆盖场景声明；未声明的旧场景保持兼容，结果明确为 `write_scope.status=not-checked`，不能算写范围验证通过。

写范围检查只证明最终可观察差异，不检测“修改后还原”等瞬时操作，也不是运行时安全隔离。`.git`、`__pycache__`、`.eval-tmp` 与替身命令日志不在内容差异判定范围内；仍需运行时 sandbox 和原始轨迹复核。测试注入发生在该步输入清单之前，不计为 Agent 写入。

`steps` 可声明多步场景，每步包含唯一安全 `id`、`prompt`、可选 `files` 和 `assertions`。每步使用同一 workspace 的当前字节启动新会话，测试从磁盘恢复，不冒充运行时会话续接。步骤输入支持 `${FIXTURE_ROOT}` 展开；不能覆盖 AGENTS.md、运行时配置或写到工作区外。某步失败或超时后保留结果，后续步骤列入 `unattempted_steps`；断言按步骤判断，不能用后一步成功掩盖前一步失败。临时文件留在 fixture 的 `.eval-tmp`。

需要复用现有合成合同构造器时，可声明 `setup_script`，指向由场景维护者审阅的 fixture 内 `.mjs` 文件。runner 在模型启动前以 Node 执行它，保留 `setup.log`；失败或 60 秒超时不启动模型。构造器生成的批准与回复仍为测试数据。`fixture-manifest.json` 记录复制与注入阶段输入，各步 `step-input-manifest.json` 记录 setup 和该步注入之后、模型启动之前的实际输入；符号链接只记录目标，不读取外部内容。

需要 Python 校验器的场景，应预备 `jsonschema`、PyYAML 等实际依赖闭包，并通过可选的 `--python-dependencies` 提供离线目录。runner 将它复制进每个 fixture 的 `.eval-python`，记录各文件摘要，设置仅指向此目录的 `PYTHONPATH` 并关闭 user site；不能依赖被隔离的个人 site-packages。两侧使用同一目录和解释器版本。启动付费运行前，在相同隔离环境与 shell 下验证导入及场景的实际校验命令；缺依赖属于环境失败，不能记为流程回归。

每次运行保留 `fixture-manifest.json` 和各步 `trace.jsonl`、`stderr.log`、实际 workspace、`result.json`；总目录含 `run-config.json` 与 `results.jsonl`。`automatic_result` 只代表运行与自动断言，`semantic_review` 初始始终为 `pending`。维护者还须审阅实际工具调用、文件改动、关键状态、平台映射和交付类型。摘要中的 token 为运行时提供值；完整文件读取与宿主自动加载元数据不能仅从命令路径推断。

批次另写 `summary.json`，区分 `passed`、`failed`、`incomplete`，保留未执行场景 / 步骤及原因。默认 `--exit-policy strict`：全部自动检查通过返回 **0**，批次完成但存在失败返回 **1**，预算耗尽、环境 / fixture 错误或中断造成未完成返回 **2**。兼容调用方可显式使用 `--exit-policy report-only`，仅将已完成失败批次的退出码保留为 0，汇总状态仍为 failed；未完成始终为 2。两种策略都不能以退出码 0 代替语义复核或真实交付验收。

可选 `--max-turns` 限制本进程启动 Agent 的总尝试次数；`--max-seconds` 限制批次执行窗口，并将当步 Agent 超时压到剩余时间。达到预算后不启动后续 turn，保留已完成结果；准备、判分和终止清理仍可能超出窗口，不承诺进程在精确秒数退出。省略参数表示没有该项总限额，原 `--timeout` 仍逐 turn 生效。总次数不是供应商内部请求次数，未报告用量保持未知，缓存输入属于 input 的一部分；无实际账单或可核验费率时金额为 null。

Git、包管理器及常见网络 CLI 通过 PATH 替身记录；工作区写入受运行时 sandbox 和 fixture 指令约束。实际宿主可能仍暴露其他能力元数据，不能声称已从工具目录移除全部 MCP。部分 login shell 会重写 PATH，因此必须审阅完整工具轨迹，不能只依赖 `.eval-commands.jsonl`。默认替身场景没有真实提交、上传或发布调用；后文 fixture_git 是显式隔离测试例外。替身返回成功不等于真实 Git、依赖安装、平台构建或云端交付通过。

缺凭据、运行时不可用或必须的执行能力缺失时记录未完成。场景本身测试“能力缺失时正确回退”可按其断言验收，但不得把缺失能力记成已执行成功。

运行时使用实际可用且与 code-mode host 配套的 CLI；记录路径与二进制摘要，两侧保持一致。运行时缺 host、无 completed turn 或启动错误属于环境失败，不能计成 Agent 流程错误；修复后用新输出目录重跑并保留失败证据。超时终止该步骤的进程组，不让后台操作串入后续场景。


## 宿主与发现证据

`--runtime codex|cursor|pi` 选择适配器；为兼容原入口，三端的可执行路径仍使用 `--codex` 参数。Codex 可通过 `--codex-config-source <config.toml>` 仅继承当前选定 provider 的路由声明，不加载用户 hooks、MCP、skills 或其他配置；无法完整表达的 provider 字段在启动前失败，不默默换服务商。应选择与 code-mode host 配套的 CLI，并记录实际版本及组件摘要。

Pi 使用 `--pi-provider`、`--pi-models-source` 指向现有配置。仅选中 provider 写入权限受限、运行后清理的私有临时目录，不进入 fixture 或证据归档。Pi 默认仅开放 read/grep/find/ls，关闭扩展、提示模板、主题和默认技能来源，显式加载 fixture 的 `.pi/skills`；场景可显式选择后文的隔离写能力。Cursor 默认使用隔离 HOME 和 ask 模式；认证不可用时记录未完成，不复用个人技能或改变登录配置。

原始 `trace.jsonl` 始终保留，另存 `normalized-events.json`。Pi 的 input 不含缓存，归一化时加上 cacheRead/cacheWrite；Codex input 已含缓存，不能再次相加。Cursor 未核实的 usage 只保留原始字段，不填零。宿主的成功终止事件、执行错误、写范围、产物断言及语义复核分别处理。宿主适配器的单元测试不是该宿主真实运行通过。

只读目录观察可使用 `scripts/inspect-skill-discovery --runtime codex --binary <配套CLI>`。Pi 另给 `--pi-loader <已安装的core/skills.js>` 和 `--pi-agent-dir <现有目录>`；该方式只观察原生默认目录 loader，不冒充扩展或包解析后的完整会话。Cursor 未验证到无模型目录接口时返回 unknown。输出区分磁盘资源、宿主发现、实际选择和未知截断；目录发现本身不能证明选中了正确来源。`--required id1,id2` 要求选择证据，缺失时阻断；相同资源的重复告警仍不证明依赖和生效策略相同。

## 授权、恢复与宿主准备

场景可用 `runtime_capabilities: fixture-write` 在 Pi 开放 bash/edit/write；默认仍仅只读工具。Cursor 对应原生 agent 模式，默认仍是 ask。这个字段不授予真实仓库操作权，模型只能执行场景 prompt 已授权且在 `allowed_writes` 范围内的动作。声明 capability 不能替代实际运行证据。

`fixture_git` 显式提供 `baseline_files`、`changes` 与可选 `staged_paths`。runner 只在新建 workspace 初始化无远端的真实临时 Git 仓库；禁用个人 Git 配置，以测试身份提交指定基线文件，随后制造待测差异。源仓库与个人暂存区不进入此仓库。Git 记录器将本地命令转发给真实 Git，拒绝网络命令；包管理与网络工具仍是替身。Codex 对这类场景使用官方 `--approve-for-me`，保留 workspace-write 沙箱并将额外权限请求交给自动审批，不使用 bypass 或关闭沙箱。审批拒绝、沙箱拒绝和未执行须保留为未完成，不能改写技能掩盖环境限制。

每步保存 `git_audit` 的前后 HEAD、状态、实际新提交与提交路径。`git_commit_count`、`git_committed_paths`、`git_status_contains` 断言验证真实临时历史，`unchanged` 仍检查无关文件内容。Git 断言必须有 observed 审计，不能把未检查当作零提交。它们不证明真实源码仓已获提交授权，也不覆盖远端交付。

`skill_read` / `skill_not_read` 仅对成功的工具读取记录判定，不把最终答复、搜索结果中的名称或失败读取当作选中证据。shell 读取参数经过分词，`echo 'cat .../SKILL.md'` 不算读取；Pi 根据 toolCallId 关联实际 read 参数与完成事件。记录可以是局部读取，不能证明全文消费。显式入口若由宿主直接注入正文而没有读取工具，需要单独的原生调用证据和语义复核，不能凭工具记录缺失直接判为没调用。

Cursor 的 `--cursor-auth-from-keychain` 只在 macOS 读取已有账号的明确 access/refresh 凭据，放入权限 0600 的私有临时文件存储，隔离 HOME、配置、数据、个人技能与扩展；值不进入命令行、fixture 或证据包。`status` 的 isAuthenticated 只能说明凭据存在，过期令牌仍可能被模型入口拒绝。真实运行失败时停止该环境的批量评测，等待用户完成原生登录；不得绕过认证或改用未经选择的服务商。Cursor usage 未映射和实际读取证据未核实时继续标记未知。

生命周期恢复用 `steps` 的同一持久化 workspace 和独立新会话验证：当前来源、已完成工作项、待批准门禁须分别判断；后一步改变上游输入时保留旧摘要和验收，要求实际校验识别 drift。仅创建合成文件或跑离线校验不算真实 Agent 恢复通过。

`real_pnpm_commands` 仅能在真实 Git fixture 中白名单开放既有 pnpm 的 test、run test/lint/build；不开放 install、dlx 或任意命令。它执行 fixture 已声明的本地脚本并返回真实退出码。未白名单开放的 pnpm 与其他包管理器一律返回不可用，不能用“替身通过”伪装真实测试。
