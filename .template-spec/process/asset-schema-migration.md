# 资产 Schema 显式迁移

常规分发按 `schema-generations.json` 中的协议版本保留最新两代，不按文件名是否有版本后缀判断。Handoff v5/v4 为常驻协议，v3 仅由 CLI 的固定迁移资源及其引用闭包读取。历史交付快照不改写；只有明确声明 `draft` 状态的协议支持草稿迁移；固定为其他状态的导入回执等历史证据拒绝迁移。

迁移输入文件放在治理项目内，显式声明协议族、源文件、新草稿路径和已经确认的补充业务事实。例如：

```json
{
  "family": "strategic-design-handoff",
  "source": "docs/strategy/handoff-v3.yaml",
  "output": "docs/strategy/handoff-v5-draft.json",
  "values": {
    "consumer_routes": [],
    "ui_baseline_kind": "prototype"
  }
}
```

此例只展示输入结构。空的 `consumer_routes` 不满足目标协议，计划会列出缺失事实，不能应用；应由当前业务事实补齐，不能由迁移器猜测。

```sh
yss migrate plan --root <治理仓> --migration-kind asset-schema --input <项目内输入文件> --out <计划文件>
yss migrate apply --root <治理仓> --plan-file <计划文件>
```

规划使用执行器内固定的源/目标 Schema，保留可对应字段、拒绝未知补充字段，并将结果降为 `draft`、移除原批准与导出声明。领域策略与阶段决定 v3 的草稿可暂缺批准字段，其他状态仍要求批准；目标 schema 的条件约束也参与判断；缺少事实产生 `MIGRATION_FACT_REQUIRED` 阻断。草稿路径存在时返回冲突，不覆盖源资产或现有目标文件。

Apply 重新生成计划，核对输入、候选和执行器摘要，再使用现有事务写入与恢复机制。业务语义、引用新鲜度、批准及交付必须重新走当前流程；结构迁移成功本身不授予就绪或批准。
