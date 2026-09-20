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
  --repetitions 2 --timeout 300
```

候选换用 `--source`、`--output` 与 `--variant candidate`，其他配置保持一致。修复后仅复跑受影响场景时使用 `--scenario <id>` 和新的输出目录；保留此前失败，不覆盖或删除不满意的样本。源目录至少提供场景所需 `.agents`、平台技能包、docs、scripts、CONTEXT 和仓库身份。凭据由运行时单独使用，不复制进产物目录。

场景 JSON 为 `{"scenarios": [...]}`；每项含 `id`、`repo`（来源目录中的相对仓库路径）、`prompt`、可选 `files`（fixture 文件内容）及 `assertions`。断言支持存在/不存在、文本、JSON 字段、原文件不变、命令、最终答复、DOCX ZIP 内容及 Node 行为检查。所有产物路径必须留在 fixture 中。修正判定器应记录前后摘要、原因，证明提示和 fixture 未变，再对两侧统一重评分；不因此重跑模型挑样本。

每次运行保留 `trace.jsonl`、`stderr.log`、实际 workspace、`result.json`；总目录含 `run-config.json` 与 `results.jsonl`。`automatic_result` 只代表运行与自动断言，`semantic_review` 初始始终为 `pending`。维护者还须审阅实际工具调用、文件改动、关键状态、平台映射和交付类型。摘要中的 token 为运行时提供值；完整文件读取与宿主自动加载元数据不能仅从命令路径推断。

Git、包管理器及常见网络 CLI 通过 PATH 替身记录；工作区写入受运行时 sandbox 和 fixture 指令约束。实际宿主可能仍暴露其他能力元数据，不能声称已从工具目录移除全部 MCP。部分 login shell 会重写 PATH，因此必须审阅完整工具轨迹，不能只依赖 `.eval-commands.jsonl`。本次验收没有实际提交、上传或发布调用；替身返回成功也不等于真实 Git、依赖安装、平台构建或云端交付通过。

缺凭据、运行时不可用或必须的执行能力缺失时记录未完成。场景本身测试“能力缺失时正确回退”可按其断言验收，但不得把缺失能力记成已执行成功。
