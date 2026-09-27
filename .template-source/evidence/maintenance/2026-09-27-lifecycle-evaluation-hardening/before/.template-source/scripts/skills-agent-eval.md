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
  --repetitions 2 --timeout 300 \
  --python-dependencies /absolute/path/to/offline-python-dependencies
```

候选换用 `--source`、`--output` 与 `--variant candidate`，其他配置保持一致。修复后仅复跑受影响场景时使用 `--scenario <id>` 和新的输出目录；保留此前失败，不覆盖或删除不满意的样本。源目录通过 `source_paths` 声明复制闭包，并以 `required_paths` 声明必须存在的来源。默认包括 `.agents`、平台技能包、`.template-spec`、适用 `.template-source` 目录、docs、scripts、CONTEXT 和仓库身份；缺少必需来源时在 Agent 启动前失败。原始 AGENTS.md 保留，仅追加标记明确且两侧相同的 fixture 隔离约束；保存原始与有效规则摘要。凭据由运行时单独使用，不复制进产物目录。

场景 JSON 为 `{"scenarios": [...]}`；每项含 `id`、`repo`（来源目录中的相对仓库路径）、`prompt`、可选 `files`（fixture 文件内容）及 `assertions`。断言支持存在/不存在、文本、JSON 字段、原文件不变、命令、最终答复、DOCX ZIP 内容及 Node 行为检查。所有产物路径必须留在 fixture 中。修正判定器应记录前后摘要、原因，证明提示和 fixture 未变，再对两侧统一重评分；不因此重跑模型挑样本。

`steps` 可声明多步场景，每步包含唯一安全 `id`、`prompt`、可选 `files` 和 `assertions`。每步使用同一 workspace 的当前字节启动新会话，测试从磁盘恢复，不冒充运行时会话续接。步骤输入支持 `${FIXTURE_ROOT}` 展开；不能覆盖 AGENTS.md、运行时配置或写到工作区外。某步失败或超时后保留结果，后续步骤列入 `unattempted_steps`；断言按步骤判断，不能用后一步成功掩盖前一步失败。临时文件留在 fixture 的 `.eval-tmp`。

需要复用现有合成合同构造器时，可声明 `setup_script`，指向由场景维护者审阅的 fixture 内 `.mjs` 文件。runner 在模型启动前以 Node 执行它，保留 `setup.log`；失败或 60 秒超时不启动模型。构造器生成的批准与回复仍为测试数据。`fixture-manifest.json` 记录复制与注入阶段输入，各步 `step-input-manifest.json` 记录 setup 和该步注入之后、模型启动之前的实际输入；符号链接只记录目标，不读取外部内容。

需要 Python 校验器的场景，应预备 `jsonschema`、PyYAML 等实际依赖闭包，并通过可选的 `--python-dependencies` 提供离线目录。runner 将它复制进每个 fixture 的 `.eval-python`，记录各文件摘要，设置仅指向此目录的 `PYTHONPATH` 并关闭 user site；不能依赖被隔离的个人 site-packages。两侧使用同一目录和解释器版本。启动付费运行前，在相同隔离环境与 shell 下验证导入及场景的实际校验命令；缺依赖属于环境失败，不能记为流程回归。

每次运行保留 `fixture-manifest.json` 和各步 `trace.jsonl`、`stderr.log`、实际 workspace、`result.json`；总目录含 `run-config.json` 与 `results.jsonl`。`automatic_result` 只代表运行与自动断言，`semantic_review` 初始始终为 `pending`。维护者还须审阅实际工具调用、文件改动、关键状态、平台映射和交付类型。摘要中的 token 为运行时提供值；完整文件读取与宿主自动加载元数据不能仅从命令路径推断。

Git、包管理器及常见网络 CLI 通过 PATH 替身记录；工作区写入受运行时 sandbox 和 fixture 指令约束。实际宿主可能仍暴露其他能力元数据，不能声称已从工具目录移除全部 MCP。部分 login shell 会重写 PATH，因此必须审阅完整工具轨迹，不能只依赖 `.eval-commands.jsonl`。本次验收没有实际提交、上传或发布调用；替身返回成功也不等于真实 Git、依赖安装、平台构建或云端交付通过。

缺凭据、运行时不可用或必须的执行能力缺失时记录未完成。场景本身测试“能力缺失时正确回退”可按其断言验收，但不得把缺失能力记成已执行成功。

运行时使用实际可用且与 code-mode host 配套的 CLI；记录路径与二进制摘要，两侧保持一致。运行时缺 host、无 completed turn 或启动错误属于环境失败，不能计成 Agent 流程错误；修复后用新输出目录重跑并保留失败证据。超时终止该步骤的进程组，不让后台操作串入后续场景。
