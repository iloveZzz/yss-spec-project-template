# 战略门禁强制迁移

`0.8.0` 将活动战略门禁收敛为 Plan、Spec、条件性产品设计和战略交接四个聚合边界。仍需继续推进的旧实例必须先迁移；`docs/deliveries/**` 中已冻结交付保持不变，只作为历史证据读取。

先生成零写入计划：

```bash
scripts/migrate-strategic-gates --root <project> --feature <slug> --plan /tmp/<slug>-migration.json
```

计划采用 `strategic-gate-migration-plan-v1`，记录所有输入摘要、旧新 ID 映射、历史证据、重新确认清单、阻塞项和确定性输出。审阅并清除阻塞后应用：

```bash
scripts/migrate-strategic-gates --root <project> --apply /tmp/<slug>-migration.json
scripts/verify-strategic-gate-migration --root <project>
```

应用前会重新核对全部输入摘要；任一漂移、未知 gate、重复目标或不可解析文件都会在写入前阻断。写入使用同目录暂存与回滚，重复应用同一计划返回 `already-applied`。旧批准不继承为当前批准，Plan、Spec 和适用的产品设计均进入 `ready-for-human`；交接进入 `stale`，待重新确认上游聚合资产后生成新版本并重新 finalize。
