# Python schema 校验诊断

在模板根运行：

```sh
node .template-source/scripts/diagnose-python-schema.mjs --output /absolute/path/to/new-directory
```

输出必须是仓库外不存在的目录，父目录须已存在。工具直接执行固定的 `lib/schema-diagnostic-fixture.mjs`，复用当前 Slice v3 合成 fixture 与公开 `inspectSliceContract`；不截取其他测试文件的源码，也不生成临时可执行脚本。依次运行未插桩与插桩入口，比较正常、缺失来源、来源摘要漂移、批准缺失及恢复后的结果和阻断信号。工具仅用于开发诊断，不批准真实合同、不修改校验器、不缓存生产结果。

报告记录八次独立公开调用：两次正常检查、来源缺失与恢复、来源变化与摘要恢复、批准缺失与恢复。所有批准与用户回复均来自现有合成机制 fixture，不能作为真实项目批准或发布证据。失败时保留已执行模式的 stdout / stderr 和 `failure.json`；不能把缺日志、非零退出、结果不等价或关键源码变化当作通过。

`report.json` 中：

- `trace.batches` 记录每次 Python 进程耗时及其 jobs；批量耗时不能重复累计到每个 job。
- `fixture.slice_schema_version` 标明当前覆盖的 Slice v3。`runs` 保留实际子命令、cwd、开始 / 结束时间、退出码和耗时；`source_bindings` 绑定诊断适配器及声明的关键依赖源码摘要，运行结束前重新核对。它不是整个仓库输入的完整依赖清单，不能替代最终 Fresh Verification。
- `trace.groups` 按独立公开调用 ID 和决定记录的 boundary 分组。非决定 schema 用 schema 文件名标识，不能理解为人工批准边界。
- `repeated_jobs` 仅是同一次操作内相同 schema、输入及选项的重复候选，不自动授予合批或缓存资格。跨公开调用和批准边界的重复必须保留。
- `python_costs` 分别记录新进程启动、带 jsonschema 导入的进程耗时，以及合成 fixture 中代表性真实 schema 的内部导入、编译与校验时间。代表 schema 使用观察时同样的本地资源闭包，`resources_sha256` 记录该闭包摘要；不取回网络资源，未知引用或重放错误保留实际 Python 退出码与 stderr 并使诊断失败。不同 wall 中位数相减不是精确阶段归因。

只记录 schema 路径、输入及源码摘要、选项与合法 boundary 标识，不写输入正文。原始 stdout / stderr 来自固定合成测试，不得改为真实用户批准资料。`baseline_scenario_wall_ms` 是未插桩公开调用场景的耗时；子进程总耗时含 fixture 初始化，trace 还包含独立 Python 测量，不能直接与 baseline 总耗时作性能对比。当前只覆盖一个合成后端 Slice v3 的指定检查场景，不能据此宣称覆盖所有 v3 合同、产品阶段流转或真实 Agent 端到端流程。
