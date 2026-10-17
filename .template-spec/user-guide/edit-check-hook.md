# 编辑即时校验（Claude Code hook）

让 Claude Code 每写入一个 YAML/JSON 实例资产就对它运行 `yss check`，在写错时立刻把发现交给 agent 修正，而不是等到门禁前才发现。默认不启用，由项目自行开启。

## 前提

- 固定的 `yss` 支持 `check`（`yss check --help` 能显示帮助）。不支持时 hook 静默放行，不影响编辑。
- 本项目有 `scripts/edit-hook`。

## 开启

在项目的 `.claude/settings.json` 加入（已有 `hooks` 时合并）：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/edit-hook\"", "timeout": 30 }]
      }
    ]
  }
}
```

`yss` 不在 `PATH` 时用环境变量 `YSS_BIN` 指定路径；临时关闭用 `YSS_EDIT_HOOK=off`。

## 行为

| `yss check` 结论 | hook 行为 |
|---|---|
| 失败（`CHECK_FAILED`） | 退出 2，把每条发现的位置、修复建议与复现命令交给 agent |
| 未完成（存在未评估项） | 不阻断，提示所需上下文；未评估不代表通过 |
| 通过、跳过或文件无关 | 无输出 |
| CLI 缺失或不支持 `check` | 无输出，不阻断 |

只检查刚写入的那个文件，不跑全量验证。批准记录与 checkpoint 只做结构检查；hook 结论不创建批准、不授予执行，门禁前仍按 `yss verify --gate` 等正式核验。
