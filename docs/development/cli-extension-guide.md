# CLI 扩展开发指南

本文档面向维护者，说明如何在 Python core + TypeScript interactive shell 架构下新增命令。当前原则是：Python 负责能力，TS shell 负责交互体验。

## 架构边界

```text
React + Ink TS shell
  packages/hermes-cli-ts
  - command
  - view
  - shell brand

JSON RPC bridge
  python -m hermes_lifecycle.rpc

Python core
  hermes_lifecycle.commands
  ysscomet_lifecycle.*
```

不要在 TS shell 中复制业务逻辑。TS command 应只做参数解析、调用 RPC、渲染结果。

## 新增 Python core command

1. 在 `hermes_lifecycle/commands/` 下新增文件，例如：

   ```python
   # hermes_lifecycle/commands/status.py
   from __future__ import annotations

   from pathlib import Path
   from typing import Any

   from ysscomet_lifecycle.inspector import collect_pipeline_snapshot


   def status(root: str, pipeline: str, state: str = ".comet.yaml") -> dict[str, Any]:
       root_path = Path(root).resolve()
       state_path = Path(state)
       if not state_path.is_absolute():
           state_path = root_path / state_path
       return collect_pipeline_snapshot(root_path, state_path, pipeline)
   ```

2. command 函数应返回 JSON 可序列化对象。
3. command 函数不直接打印 stdout，也不读取交互输入。
4. 路径参数优先接收字符串，在函数内部转换为 `Path`。

## 暴露 RPC method

在 `hermes_lifecycle/rpc.py` 中注册 method：

```python
from hermes_lifecycle.commands.status import status


def _status(params: dict[str, Any]) -> dict[str, Any]:
    return status(
        root=params["root"],
        pipeline=params["pipeline"],
        state=params.get("state", ".comet.yaml"),
    )


METHODS: dict[str, RpcMethod] = {
    "doctor": _doctor,
    "status": _status,
}
```

RPC 约定：

```json
{"id":"1","method":"status","params":{"root":".","pipeline":"demo-feature"}}
```

成功：

```json
{"id":"1","ok":true,"result":{}}
```

失败：

```json
{"id":"1","ok":false,"error":{"code":"ValueError","message":"..."}}
```

## 新增 TS shell command

1. 在 `packages/hermes-cli-ts/src/commands/` 新增命令文件。需要 JSX 时使用 `.tsx`。

   ```tsx
   import { Command } from "commander"
   import { render } from "ink"

   import { callPython } from "../bridge/pythonBridge.js"
   import type { ShellBrand } from "../shellBrand.js"
   import { StatusView } from "../ui/StatusView.js"

   export function createStatusCommand(shellBrand: ShellBrand) {
     return new Command("status")
       .argument("<pipeline>")
       .option("--json", "print raw JSON")
       .action(async (pipeline: string, options: { json?: boolean }) => {
         const root = process.env.INIT_CWD ?? process.cwd()
         const result = await callPython("status", { root, pipeline })
         if (options.json) {
           console.log(JSON.stringify(result, null, 2))
           return
         }
         render(<StatusView shellBrand={shellBrand} result={result} />)
       })
   }
   ```

2. 在 `packages/hermes-cli-ts/src/ui/` 新增 Ink view。
3. 在 `packages/hermes-cli-ts/src/index.ts` 注册：

   ```ts
   program.addCommand(createStatusCommand(shellBrand))
   ```

4. 保留 `--json` 纯 stdout，避免 Ink 输出影响脚本和 CI。

## 多入口品牌化

`hermes`、`codex`、`trae` 三个 bin 共享同一个 `dist/index.js`。品牌识别集中在 `shellBrand.ts`：

```ts
export type ShellBrandName = "hermes" | "codex" | "trae"
```

新增命令时：

- 不要为不同品牌复制 command。
- command factory 接收 `shellBrand`。
- Ink view 可以使用 `shellBrand.label` 显示标题。
- RPC method 不关心品牌，除非业务确实需要区分。

## 测试要求

新增命令至少覆盖：

1. Python RPC 测试：

   ```bash
   python3 -m unittest tests.test_lifecycle
   ```

   测试应验证 RPC method 能返回结构化结果，并能处理错误输入。

2. TS 类型检查：

   ```bash
   npm --prefix packages/hermes-cli-ts run typecheck
   ```

3. TS build：

   ```bash
   npm --prefix packages/hermes-cli-ts run build
   ```

4. CLI smoke test：

   ```bash
   npm --prefix packages/hermes-cli-ts run dev -- <command> --json
   ```

5. 如果命令影响现有 Python CLI 行为，也要补 `scripts/ysscomet` 对应用例。

## 开发注意事项

- 不要让 TS shell 修改 `.comet.yaml`；状态推进仍通过 Python core 和现有 driver。
- 不要让 Agent 或 harness 直接推进 `current_stage`。
- 新增后端时先更新 `ysscomet_lifecycle.harness.BACKENDS`，再补 `doctor` 检查和文档。
- 文档中只写当前已实现能力；roadmap 能列，但不能写成可用命令。
