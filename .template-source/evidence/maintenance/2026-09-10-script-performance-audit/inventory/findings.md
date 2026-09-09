# scripts 全量清单与词法依赖范围

本记录只提供性能分析的清单与静态候选。没有运行源脚本，逐文件 `measurement_status` 均为 `static-only`；命中进程、网络、循环或文件树操作不等于存在性能瓶颈。

## 范围与数量

扫描本体和 `.gitmodules` 登记的 9 个子仓内全部精确名为 `scripts` 的目录，纳入目录内普通文件，包括库、测试和资料。排除 `.git`、依赖、构建和索引目录，不跟随符号链接。完整排除目录名见 `summary.json.scan_policy`。发现 0 个被跳过的 scripts 符号链接、0 个读取错误。

| 分类 | 物理文件 | 代码文件 | 唯一内容 hash | 唯一代码 hash |
|---|---:|---:|---:|---:|
| 活跃源/分发面 | 1390 | 1248 | 345 | 320 |
| 生成 Agent skill 投影 | 968 | 968 | 102 | 102 |
| 临时 staging | 397 | 378 | 152 | 133 |
| 历史审查快照 | 9 | 9 | 5 | 5 |
| scripts 全部物理文件 | 2764 | 2603 | 403 | 378 |
| 新识别目录外依赖与显式补充入口 | 56 | 56 | 19 | 19 |

全部读取文件合计 2820 个，整体按字节 SHA256 分为 421 组。各分类有重叠内容，唯一 hash 数量不能相加。活跃 scripts 代码为 JS 1179、Shell 54、Python 15。活跃文件含可执行权限 617 个、shebang 778 个；它们都不代表真实 CLI 入口总数。`verify-*-scenarios` 等入口可能同时承载测试，角色启发式未把这些全部识别为 test，不能把 `cli` 数量视为真实入口总数。

`inventory.csv/json` 逐文件记录仓库、路径、字节 hash、大小、行数、语言、分类、角色、静态特征与测量状态。`closure.csv/json` 保存目录外依赖，`unique-implementations.json` 记录内容组及所有副本。代表路径按优先本体/活跃/较短路径选取，只用于索引，**不构成权威源归属声明**。角色 `cli/library/test/fixture/wrapper` 为确定性规则分类，人工分析应校准。

## 调用依赖覆盖与局限

`dependency-edges.csv` 从活跃脚本及显式补充入口递归识别相对 import/export/require（含多行 from）、shell source 及明确 scripts/ 字面引用，共 7132 条记录：3202 个解析为仓内文件、3314 个外部模块引用、261 个未解析字面引用、355 个动态表达式。仓内记录含 5 个 `explicit-analysis-entry` 补充入口，单独标为 `declared-entrypoint-not-inferred-call`，不是由词法推导的调用关系。

新增闭包包括 backend/frontend CLI 的 `vendor/cli-core/{build,bundle,io}.mjs`、其 YAML vendor、旧 CLI 的 `src/template-hash.js`/`src/manifest.js`、Archify renderer helpers 等。所有已解析目标都在清单中且可读取。为覆盖构造路径与同步源，还显式追踪根 `.template-source/cli-core/{build,cli,scaffold}.mjs` 和两 CLI `package.json#bin`：递归包括 canonical/两份 vendor 的 `engine/identity/transaction/update` 等深层 import。来源理由记录在 `summary.json.scan_policy.supplemental_entrypoints`；canonical build 的 `CORE_PATH` 是源码同步源路径，不意味着运行时直接执行 canonical 副本。

这是词法候选图，不是完整调用图：注释、字符串和测试描述可能命中；拼接路径、变量、运行目录切换、动态导入、Python import、子进程参数、包管理器脚本和运行时分派未完整解析。`unresolved-*` 保留在边表，不能据 56 个目录外文件宣称真实依赖闭包已完全覆盖。第三方依赖目录排除，因此外部模块仅记名称。

静态 flags 同样只表示正则命中：`network` 可能只是文档 URL，`mutation` 可能只是测试夹具，`loop` 可能是普通轻量循环。禁止以 flags 自动排序“最慢脚本”。

## 分发关系与下一步

- 根 `skills-lock.json` 的 `.agents/skills` 是 canonical；六个 Agent root 是投影。
- CLI 的 `template/scripts` 与 `template/.agents/skills` 是快照；分析性能应按 hash 归并，改动时仍须核对各源仓与分发合同。
- backend/frontend CLI 的 `scripts/sync-template.mjs` 调用目录外 `vendor/cli-core/build.mjs`，不能仅检查薄包装入口。
- `create-yss-harness-dev/.template-staging-WIkaKg` 和历史审查快照单列，没有删除或改动。
- 同 hash 不保证相同运行成本：输入规模、仓库内容、工作目录、调用次数与上下游验证链都需测量。

## 复现与验证

```sh
python3 .template-source/evidence/maintenance/2026-09-10-script-performance-audit/inventory/scan.py
python3 .template-source/evidence/maintenance/2026-09-10-script-performance-audit/inventory/verify.py
```

最终扫描约 6.96 秒，仅代表此清点程序耗时。验证核对所有文件当前 SHA256、CSV/JSON 路径和行数、hash 分组完整分区、解析边目标存在性；实际命令、耗时、退出码以 `verification.json` 为准。没有修改或执行被分析源脚本，没有刷新图索引；扫描器只写本 inventory 目录。

仓库身份为 `template-source`。`context_reconciliation: not-applicable`，理由是本轮只分析模板维护脚本事实，不生成产品工作单元、产品术语、Spec 或 Ticket。本记录不设置整体任务完成、ready-for-agent 或可发布状态。
