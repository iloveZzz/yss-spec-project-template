# Python schema 校验诊断

在模板根运行：

```sh
node .template-source/scripts/diagnose-python-schema.mjs --output /absolute/path/to/new-directory
```

输出必须是仓库外不存在的目录，父目录须已存在。工具复用当前流转场景的合成 fixture，依次运行未插桩与插桩的公开入口，比较正常、缺失依据、输入变更和恢复后的返回值及阻断信号。fixture 源码边界变化时停止，不静默猜测。工具仅用于开发诊断，不批准合同、不修改校验器、不缓存生产结果。

`report.json` 中：

- `trace.batches` 记录每次 Python 进程耗时及其 jobs；批量耗时不能重复累计到每个 job。
- `trace.groups` 按独立公开调用 ID 和决定记录的 boundary 分组。非决定 schema 用 schema 文件名标识，不能理解为人工批准边界。
- `repeated_jobs` 仅是同一次操作内相同 schema、输入及选项的重复候选，不自动授予合批或缓存资格。跨公开调用和批准边界的重复必须保留。
- `python_costs` 分别记录新进程启动、带 jsonschema 导入的进程耗时，以及合成 fixture 中代表性真实 schema 的内部导入、编译与校验时间。外部引用不重放。不同 wall 中位数相减不是精确阶段归因。

只记录 schema 路径、输入及源码摘要、选项与合法 boundary 标识，不写输入正文。原始 stdout/stderr 来自本工具生成的合成测试，不得改为真实用户批准资料。插桩耗时不能混入无插桩性能基线。当前 fixture 含旧形状 Slice，不能据此宣称覆盖所有 v3 合同或真实 Agent 端到端流程。
