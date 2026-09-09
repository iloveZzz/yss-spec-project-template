# 测量方法与复现

本目录仅是分析工具和证据，不接入产品验证或模板分发。`runs.jsonl` 和各 plan JSON 保存实际 argv、cwd、样本数、trace开关、时间、退出码及 stdout/stderr；失败、路径准备错误和timeout不能与成功路径合并统计。

本轮在同一机器上顺序运行被测命令，静态分析与用户其他应用可能并存。便宜命令3次，慢场景1次；第一次不等于受控cold cache。没有清空文件缓存、调整系统设置或推算p95。CPU统计包含已退出子进程；后台服务和其父进程寿命不能重复相加。

复现时先保存新的输出目录，避免覆盖本次证据：

```sh
python3 prepare-isolation.py /absolute/path/to/yss-spec-project-template --output /absolute/path/to/new-evidence
```

准备器复制当前工作树（保留symlink），排除Git元数据、依赖/构建、图索引、历史证据及staging；补入canonical cli-core、维护脚本和tooling。两个专职CLI复制为独立包；三个旧CLI只复制运行同步所需代码与metadata。准备器输出物理路径，避免macOS `/var` symlink被正确的路径保护拒绝。它不冻结Git提交，需使用 inventory/verify.py 和原始hash判断是否仍是同一源码。

复制 `measure.py`、`probe.cjs` 和合适的 plan JSON 到新输出目录，将计划中的 cwd/target-dir 替换为新 isolation.json 的目录。Plan API实验还需将 `plan-entry-driver.mjs` 复制到新root的 `.perf-plan-entry.mjs`。执行顺序：

```sh
python3 measure.py baseline-plan.json
python3 measure.py isolation-plan.json
python3 measure.py cli-plan.json
python3 measure.py legacy-sync-plan.json
```

本次原始 `cli-plan.json` 的4个init使用 `/var` 路径被拒绝，纠正后的成功配置在 `cli-init-plan.json`。新运行应一次性使用物理路径和全新目标，不重复这个准备错误。

旧CLI的sync计划通过显式环境变量绑定本地源仓；仅对源仓读取文件/Git信息，生成目录与快照写入临时CLI包。未测试远程clone、fetch和发布。退出时删除的目录仅限本次准备器返回的临时base；不要使用源码目录作为清理目标。

`probe-v1.cjs` 用于Plan与交接场景追踪；后续 `probe.cjs` 增加fsync/open/close/rename计数，用于init。preload通过Node内置模块导出同步包装获得操作计数与耗时，不捕获文档内容。记录按进程分开，fs嵌套调用的时间不能全部相加。默认基线不带追踪；追踪额外开销和磁盘波动意味着两者不是优化前/后对照。

批量schema可行性实验：

```sh
python3 schema-batch-experiment.py /absolute/path/to/docs/process/schemas/context-reconciliation.schema.json
```

它使用相同Python引擎、真实schema和20个相同的合成输入（10合法/10非法），比较20个进程与1个进程的诊断输出；没有实现生产替代，不包含文件扫描、授权和新鲜度验证。

`summarize.py` 生成统计；`map-coverage.py` 将入口/API实验映射回清单。`same-content-as-measured-entry`仅表示代码相同，不能证明其他上下文已执行。测量计划依赖这次工具发现和输入选择，不是“无参数执行所有scripts”的通用脚本。
