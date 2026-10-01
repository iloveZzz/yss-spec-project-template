# SDD 执行效率隔离试点：兼容性、依赖与三方实测

## Research Scope

Profile `technical-evidence`；Mode `evidence-audited`；日期 2026-10-01（Asia/Shanghai）。承接用户确认的试点顺序与目标：代表性日常验证中位耗时减少至少20%、声明反例无漏检、p95不回退。当前仓库是 `template-source`；本轮仅隔离试验与研究资产，不切换生产验证器、路由或框架。

源固定为 `8fc0122a9e417a91c62cfe78afc1c0cb70ca56d6`，完整父仓与已初始化子仓复制到仓库外独立 Git checkout。Node 24.21.0、Python 3.12.1、pnpm 10.15.0、Nx 23.2.1、moon 2.5.6、Ajv 8.20.0、ajv-formats 3.0.1。正式试点没有改用户原工作区中的执行源码；根 CONTEXT 不新增业务术语。详细范围见 `scope.md`，版本、脚本与摘要见 `evidence/source-freshness.json`。

## Executive Read

本轮试点执行完成，**不满足整体替换执行层的验收目标**。部分热缓存路径超过20%且p95改善，但冷缓存/输入变化有明显回退；短命令尤其容易被框架自身成本抵消。Ajv 当前配置与现 API 在真实 date-time 字段上行为不同，不能直接替换。现 runner 的检查依赖缺口已通过隔离源码变异证明，优先级高于扩大缓存。

本轮没有把失败候选调成“通过”：原始 moon 输出篡改漏检、Nx 冷缓存条件错误均保留证据。前者补统一输出/输入摘要核验后重验；后者废弃首轮性能结论、固定缓存目录后全部重跑。

## Findings

### 1. 检查依赖：存在可复现的遗漏（claim-001）

固定源码计划：README仅hygiene；研究证据目录进入hygiene+tooling共5条；`json-schema.mjs`、`validation-phase.mjs`、`business-tickets.mjs`各自单独变更均只进入hygiene。registry变化则升级release，108行命令。

不仅是计划推断：在隔离副本将 Schema API 的返回值变为全部接受，现计划唯一的 `verify-governance-layout` 仍exit=0；现成的 `strict YAML and schema batching` 行为测试exit非零。恢复原字节后同一测试再次通过，前后SHA256一致。见 `evidence/dependency-mutation.json` 与日志。

该证据证明这一个变异可逃过当前单源 fast 选择；不推断完整release或所有CI都漏检，也不声称本轮已修复映射。后续应为 Schema/phase/business-ticket 的实际调用依赖补必跑集合；研究资产的宽路由应按消费依赖细化，不直接删除检查。

### 2. 测试准备：约8秒，不能独自达成20%（claim-002）

对当前 `test-with-plugin-clis.mjs` 的外部仪器化副本计量，保持clone/checkout/重建/快照断言，测试派发被记录但不执行；三次准备墙钟为 8.33, 8.64, 8.25 秒，中位数 8.33 秒。主要为 backend `sync-template.js`，约7.8–8.1秒。

复用第三次准备出的固定CLI后，单独执行同一20个测试文件，185项全部通过，测试墙钟 **242.62秒**。即使准备耗时完全消失，这次组合的理论上限也只有 **3.3%**。这是一轮分段诊断，不是完整验证重复基准：准备/测试分开执行，测试期间存在轻量试验开发活动；不能与上轮340秒直接计算性能升降。

准备缓存仍需绑定pins、CLI与template SHA、snapshot/manifest摘要、生成脚本和runtime；本轮仅保留准备目录供测试，不实现生产持久缓存或复用验收结论。

### 3. Ajv：速度潜力存在，直接兼容不通过（claim-003、claim-004）

公开 `validateJsonSchemas` 与 Ajv2020 对照：官方套件（固定commit见source-freshness）选取1190项核心、874项format，以及真实task-package的47项有限变异。原始结果分别有36、278、0项不一致（含编译失败与异常）；task-package有46项诊断字节不同。另扫51个schema，50个可直接compile，1个需先注册引用目标。完整原始结果见 `evidence/schema-audit.json`。

这些数字是**当前配置兼容性诊断，不是库的标准符合率**：非fragment引用组被排除；自定义 `$schema` 元Schema未加载导致部分compile失败；Python异常被现API包装为false；Ajv未知format被忽略；两种原始错误表示天然不同。仓库样本47项没有独立expected oracle，不以其expected-mismatch=0宣称全部正确。编译清单也不证明运行兼容。

决定迁移的具体反例已补在两个真实仓库Schema：user-decision的`responses[].responded_at`与maintenance-review-record的`reviewed_at`。原始合法数据双方通过；改为`not-a-timestamp`或非法日历时间，当前Python API仍通过、Ajv拒绝。当前环境的Generic FormatChecker未注册date-time等可选格式；不能扩大为Python库缺陷，也未证明上层业务验证器没有另外校验。测试只改隔离复制的数据；user-decision使用仓库标明test-only的fixture，不生成真实批准。

因此下一步是明确format依赖与兼容策略、诊断适配、引用注册和超时/取消边界。上一轮单Schema standalone快68.4%的数据不能覆盖本轮行为差异。当前不接入Ajv生产路径。[Python format依赖](https://python-jsonschema.readthedocs.io/en/stable/validate/#validating-formats)、[Ajv formats](https://ajv.js.org/guide/formats.html)、[Ajv ownProperties](https://ajv.js.org/options.html#ownproperties)。

### 4. 三方正确性：先暴露问题，再加共同核验（claim-005）

三个实际任务形成 `schema → query → checks`：Schema调用当前Python公开seam并消费本地外部引用；query执行真实生命周期查询；checks执行真实verification-selection与phase测试。所有方案调用相同task脚本；现有runner直接使用当前`runGroups`。共同包装层包含输出落盘、输入摘要和失败记录；计时不等于原始单独CLI的时间。

原始48项试验中，moon在输出内容篡改但路径仍存在时继续成功，审计捕获1项失败。加入所有方案共同的输出manifest SHA256、当前输入集合/摘要、mode核验后，48项全部通过；摘要不符返回86，拒绝旧结果，而不是伪造重新验证成功。

矩阵覆盖无变化、数据、Schema、外部引用、脚本、lock、runtime指纹、环境、ignored文件变化/删除、输出删除/篡改、连续失败、恢复及无关README。后续依赖只在前序成功后执行，连续失败均真实重跑。Nx显式`NX_CACHE_FAILURES=false`；ignored文件用runtime哈希，moon显式file输入。该“无漏检”只限声明的16类×3方案，不覆盖全仓/跨平台/远端副作用。缓存结果不是Fresh Verification。[Nx inputs](https://nx.dev/docs/reference/inputs)、[moon cache](https://moonrepo.dev/docs/concepts/cache)。

### 5. 378个正式性能样本与验收（claim-006）

tiny是Schema+真实查询，daily另加真实局部回归。它们是本轮预先选定的日常工作负载候选，不代表真实用户频率分布。每个工作负载×缓存状态×方案21次，2次预热，串行随机方案次序；p95为nearest-rank第20项。Node/Python新进程，文件系统热；冷缓存只清框架任务/工作区缓存，不清OS页缓存。关Nx daemon、远程缓存和telemetry；包括外层CLI启动及共同摘要核验。`input-change`性能档实际每轮修改`PILOT_MODE`，使全部任务失效；未测源码局部变更的选择性失效性能。正确性矩阵中的文件变异不代替这项性能测量。

每行单位ms；正百分比为变慢，负值为减少耗时。

| 工作负载 / 缓存情况 | 现 runner median / p95 | Nx median / p95 | moon median / p95 | Nx / moon 中位耗时变化 |
|---|---:|---:|---:|---:|
| tiny / cold-cache | 274.6 / 287.1 | 568.6 / 590.0 | 481.6 / 490.3 | +107.0% / +75.4% |
| tiny / hot-cache | 270.8 / 289.9 | 326.4 / 339.0 | 156.4 / 270.5 | +20.6% / -42.2% |
| tiny / input-change | 275.1 / 281.4 | 565.5 / 582.3 | 479.7 / 489.4 | +105.5% / +74.3% |
| daily / cold-cache | 509.1 / 533.0 | 814.1 / 842.3 | 700.5 / 706.4 | +59.9% / +37.6% |
| daily / hot-cache | 509.2 / 545.0 | 336.4 / 343.8 | 157.0 / 265.4 | -33.9% / -69.2% |
| daily / input-change | 511.5 / 535.9 | 815.0 / 831.6 | 700.0 / 708.2 | +59.3% / +36.9% |


热路径只在相应行同时通过“中位数≥20%减少、p95不回退”时合格；详见 `evidence/acceptance.json`。冷和变更路径的退化阻止整体默认切换。没有用任意权重掩盖退化，没有把热命中当作当前实际执行。不能从本轮百分比推断整个SDD周期提速。

首轮发现Nx23默认将task cache置于用户级共享目录，清`.nx/cache`后实际执行数仍0；所以首轮所谓Nx冷样本无效。原始记录另存attempt1，不用于上述表。修正为显式`.nx/cache`，并断言cold/change每任务真实执行、hot不执行；正式378项全过计数检查。框架本体缓存不能取代这项观测。

## Counter-Signals

- Ajv更严格的日期拒绝是行为改变，不应以“校验更好”为理由跳过兼容决策；现Python缺format依赖也应单独修复验证。
- 输出路径存在、命令exit0、框架显示cached都不足以证明内容正确；本轮用执行计数、输出摘要与输入摘要交叉检查。
- 同一Schema配置未覆盖所有draft、数字精度、远程引用、超时/取消、长期内存及跨平台。原始差异不等同于标准缺陷。
- 16类有限反例全过不抵消当前源依赖映射的已复现漏检；二者是不同范围。
- 全套工具链测试仍是分钟级；本轮框架性能只覆盖短任务和局部回归，不证明迁移全部185项后仍有同等收益。
- Nx daemon关闭属于本轮条件；没有评估其长驻模式、远程缓存、CI多机或moon跨独立运行进程的全局锁。

## Source Map

沿用上一轮Google/GitHub研究线索，按本轮配置补官方文档与源码，不再用搜索排名判工具优劣。主控复核官方JSON Schema Test Suite、Python格式依赖、Ajv选项、Nx输入和moon缓存；独立Explorer只读核验映射与实验口径，主控执行全部计时及反例。Explorer无命令执行证据，不将其身份当通过证明。

所有本地结论可定位到 `evidence/`；可复现脚本和版本lock见 `reproduce/`。上游测试套件通过固定Git SHA定位，未冒充完整套件通过。研究台账列出访问来源、失败条件、当前测量和结论边界。

## Decision Handoff

本轮建议保留现runner默认入口。优先在后续模板维护中修复已经复现的检查依赖覆盖，再从整个测试组中剖析真实慢项；准备缓存单独不足20%。Ajv继续兼容策略试验，moon保留为高命中热路径候选，Nx不作为短查询默认外壳。正式采纳必须按实际影响面同步分发和重验，不能靠本研究结束授予release-ready。

用户已授权的隔离试点完成；研究以`work-unit.maintenance-research`收尾、`next_route:null`。验收结论是“有限热路径可用，整体默认替换不通过”，不是停止在未执行计划，也不是强行降低用户目标。

## Evidence Limitations

- 单机macOS ARM，正式性能为378样本；未量化Agent/human等待或真实工作负载命中率，p95为样本统计而非稳定生产承诺。
- 只新增本目录资产，未改生产依赖、Skill/投影/锁/快照，也没有在用户仓库提交、推送或发布。隔离fixture为让moon识别HEAD创建过一次测试Git commit，不是项目交付提交。
- frozen source保持固定SHA与跟踪源码无改动；性能基准阶段node_modules采用本机已安装工具链只读链接，非完全hermetic构建；最终fast另在固定副本独立按锁文件安装依赖后通过。两种执行条件分别留证，最终fast不是第二次性能基准。每次复现应核验lock和实际runtime。
- 本报告由本轮相关实测与研究包校验支撑；后续归档和闭包文字不被描述为又一次完整运行。最终验证边界与记录单列。
