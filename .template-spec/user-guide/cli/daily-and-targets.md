# 日常工作与个人进度

向 Agent 提供当前目标、现有材料、业务词汇与允许修改的工程。Agent 先读取实际代码和资料，再开展授权工作。需求、设计、实现和审查按任务需要组织，提交、推送、部署及发行使用对应动作的真实授权。

## 从已有成果续办

保留同一需求的主 Spec、交互说明、原型和历史。Home 中的工程地图帮助定位关联仓，进入目标工程后核实当前工作树、局部规则和实际输入版本。上次结果中的剩余事项、模拟范围与运行资源也作为本次输入。

使用工作台时，沿用原个人数据目录读取续办要求。

```text
yss workbench request --spec-id <SpecID> --json
```

Agent 据已有材料和已保存答复继续工作。已明确的答复直接复用，语义变化或延期到期时核对受影响范围。工作成果保存后刷新原 Spec 登记。

## 查看有效进度

```text
yss workbench snapshot --json
yss workbench query --entity spec --progress-basis effective --status doing --status blocked --json
yss workbench lifecycle --spec <SpecID> --json
```

浏览器工作台按本轮目标和有效证据展示进度。八阶段为调研、分析、规格、原型、交接、实施、验证、交付。受阻、缺证和需复核分别展示。项目实际构建、联调、部署和发行结果写入对应成果与交付记录。

查询默认只看启用记录并隐藏终态。查找已完成、已取消或停用对象时使用 `query --entity spec --progress-basis effective --activity all --include-closed --json`。已登记但未设置目标时，仍可查到内容和材料。业务词汇沿用根 CONTEXT.md，命令参数见 [命令参考](command-reference.md)。
