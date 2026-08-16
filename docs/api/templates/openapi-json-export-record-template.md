---
pipeline: <feature-id>
stage: openapi-json-export
status: draft
owner: ai
---

# <功能名称> OpenAPI JSON 派生记录

> 适用场景：冻结的 OpenAPI YAML 通过锁定的 Redocly CLI 派生 JSON，作为下游既有前端客户端生成流程的输入。
> YAML 是唯一权威；本记录和 JSON 都不能反向替代或修改 YAML。

## 1. 输入与冻结基线

| 项目 | 值 |
|---|---|
| 冻结 YAML | `docs/.scratch/<feature>/api/<feature>.yaml` |
| YAML SHA-256 |  |
| OAS 版本 | 3.1.0 |
| OpenAPI Freeze 记录 |  |
| Git ref（如适用） |  |

## 2. 受控工具链

| 项目 | 值 |
|---|---|
| 包管理器 / lockfile |  |
| `@redocly/cli` 固定版本 |  |
| 执行脚本或完整命令 | `pnpm exec redocly bundle ... --ext json ...` |
| `$ref` 策略 / 批准例外 |  |
| bundle metafile |  |

## 3. 派生 JSON 与校验

| 项目 | 值 |
|---|---|
| 输出 JSON | `docs/.scratch/<feature>/api/<feature>.json` |
| JSON SHA-256 |  |
| 受控交接 JSON | `<frontend>/openapi/openapi.json` |
| 交接后 SHA-256 | 必须与输出 JSON 相同 |
| JSON 解析 / lint 命令 |  |
| 校验结果 | 通过 / 阻断 |
| 组件重名 / `$ref` 结果 |  |

## 4. 下游前端交接

| 项目 | 值 |
|---|---|
| 下游既有输入路径 | `<frontend>/openapi/openapi.json` |
| 交接方式 / 项目脚本 |  |
| 交接后 SHA-256 | 必须与输出 JSON 相同 |
| 目标前端项目的手动代码生成命令 | 仅记录，不在本模板执行 |
| 模板边界 | 不修改前端生成配置；不把生成动作加入 CI |

## 5. 结论与不可变约束

- 结论：Exported / Blocked
- JSON 是否由手工编辑：否；若无法确认则阻断。
- 后续 API 变更：回到 YAML Draft、评审和 Freeze，再重新派生 JSON。
- 阻断项：
