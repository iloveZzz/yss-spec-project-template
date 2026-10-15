# 本地验证与 GitHub workflow 边界

本合同区分模板源、项目实例和实现仓库的验证责任。生命周期门禁仍由 `lifecycle-registry.yaml` 定义；维护分级由 `maintenance-intensity.yaml` 和 `harness-process-tailoring.md` 定义；检查组、影响面和兼容触发路径只在 `template-verification-profiles.yaml` 维护。

## 模板源

| 入口 | 行为 | 结果边界 |
|---|---|---|
| 日常交付：`scripts/verify-template-fast` | 先看 `--plan`；按检查输入、变化行为及消费者选择必要集合，缺映射或非法依赖先修正，不自动运行全量 | `implementation-ready`，报告 `limited`，记录实际覆盖及未覆盖边界 |
| 合入检查：`scripts/ci-gate --mode pr --base <完整 SHA>` / `--mode push` | 平台无关；PR、MR 与主分支推送由 `template-gate` 调用，详见下文“合入检查” | 合并前机器检查，不替代发布验证 |
| main 集成验证与正式发布：`scripts/verify-template` | 按当前策略执行全部适用检查、前后置与固定来源准备；要求已提交来源 | 检查完整候选；当前分支为 main 不单独触发 |
| 固定版本：`verify-template-release.mjs` | 输入完整 40 位模板 commit，执行上述验证与指定 CLI 家族集成 | 产出证据，不打 tag、不创建 Release、不发布包 |

主模板源提供两个薄适配器：`.github/workflows/template-gate.yml`（GitHub Actions）与 `.gitlab-ci.yml`（GitLab CI），检查名均为 `template-gate`，在 PR / MR 与主分支推送时运行，并登记为 PR / MR 必需检查。三个专职 Agent 模板和四个 CLI 仓库不设根 `.github/workflows`，它们的检查通过各自仓库的本地入口执行；手动 Actions 入口不再提供。正式发布仍由维护者通过上述本地入口执行并保存本轮证据。

日常交付不自动追加 release，不因维护等级、交付措辞 自动升级为正式发布验证。定向选择依据、命令、退出码与未覆盖风险必须可读；未知影响先调查。发布及已采纳 mandatory CI 命中后仍执行其完整适用集合，不能通过删计划项或改报告声明绕过。

模板验证首先要求 `template-source`。日常预检仅要求所选任务使用的工具、子模块或固定 CLI 输入，不准备未选制品或消费者。全量检查使用实际依赖的公开 gitlink 固定子模块，不追踪上游分支；运行前须初始化所需子模块。工具依赖使用固定 pnpm 与 frozen lockfile；Node 24 为验证运行器环境，Python 3.12（验证预检要求恰为该版本）与固定的 jsonschema 4.23.0 提供既有 schema 检查依赖；目标版本以 `scripts/ci-setup --print-versions` 为准。运行器缺少 Python 3.12 或所需 Go 时，`scripts/ci-setup` 只在 CI 的 root 容器内补装：Python 经固定版本的 uv，Go 取自固定 yss-cli 源码 `go.mod` 指定的版本并校验 go.dev 公布的 sha256；其它环境须由镜像自带。vendor 校验在临时目录重建并比较，不先覆盖受版本管理的 vendor。

本机没有固定 yss 时，运行 `eval "$(node .template-source/scripts/ensure-native-yss.mjs)"`：按 `yss-cli-pin.json` 的提交在缓存目录（默认 `~/.yss-harness/pinned-yss`，可用 `YSS_PIN_CACHE` 改）构建一次并导出 `YSS_NATIVE_BINARY`、`YSS_NATIVE_BINARY_SHA256`、`YSS_NATIVE_SOURCE_ROOT`；之后复用，摘要必须等于固定文件登记值，本机 Go 必须等于固定的 `go_version`。

两档均在执行前及结束时观察输入，失败和中断同样保留最终观测；漂移使本轮失败。fast 可按[运行内摘要复用规则](../../.template-spec/process/subagent-collaboration.md#只读分诊任务包-v2)减少未变化文件的重复字节读取，报告 `input_observation_metrics`；有效 profile 为 release 或显式传入 `--fresh-inputs` 时前后均完整读取字节。摘要、文件覆盖范围和漂移判定不变，普通问答不因此新增全仓验证要求。

本地复验应把独立 Node 24 的 bin 加入 PATH 后直接运行验证入口；不要用带 `--package` 的 `npm exec` 包住整条验证链，其包配置可能被内部 npx 继承，改变实际执行的工具。

工具兼容性仍按影响面和发布验证计划检查：Node 22 工具测试、macOS vendor 一致性及 Node 26 非阻断观察分别保留实际环境、命令、退出码和日志。运行时存储的跨平台验证仍覆盖受支持的 Node 与操作系统，以及最低版本拒绝行为；本地单一环境通过不能充当未执行平台的结果。远程 required checks / 分支保护由仓库维护者单独配置：GitHub 与 GitLab 都要把 `template-gate` 设为必需检查，这是仓库设置，不在代码中。

## 合入检查

`template-gate` 的两个适配器只做三件事：选择模式、调用 `scripts/ci-setup` 准备环境、调用 `scripts/ci-gate`。它们不含检查逻辑，所以同一提交在两个平台执行相同的步骤、命令与退出码。步骤清单只在 `scripts/lib/ci-gate.mjs` 的一个数组里维护，本文不复述；环境版本只在 `scripts/ci-setup` 里维护，GitHub 的 `setup-template` 通过 `--print-versions` 读取，GitLab 的镜像主版本由测试与之核对。

| 事件 | 模式 | base |
|---|---|---|
| GitHub `pull_request` | `--mode pr` | `github.event.pull_request.base.sha` |
| GitLab `merge_request_event` | `--mode pr` | `CI_MERGE_REQUEST_DIFF_BASE_SHA` |
| 主分支推送 | `--mode push` | 脚本取 `HEAD^`（合并提交的第一亲本即上一个主分支顶点） |

两个平台都用完整历史检出，PR / MR 与主分支推送均执行阻断的 `verify-template-fast`。PR / MR 传入完整 base SHA；推送使用 `HEAD^`，仅首个提交没有上一提交时不带 `--base`。其它干净检出若不带范围基准，变更文件数为 0，只会空过。candidate 验证入口已退役；正式发布继续消费完整发布证据。

fast 选中的部分检查需要原生 `yss` 二进制，所以两个平台都用 `scripts/ci-setup --yss-commit pin`：取 `.template-source/distribution/yss-cli-pin.json` 固定的提交，按固定的 Go 版本、用 yss-cli 的 `tools/build-candidate.mjs` 构建，核对当前平台的 SHA-256 与固定文件一致后导出 `YSS_NATIVE_BINARY`；摘要不符即失败，CI 里也不接受 `YSS_NATIVE_BINARY_OVERRIDE`。yss-cli 不再是 submodule。环境准备依赖的子模组都是公开仓库，匿名可读，GitLab runner 不需要令牌或镜像。拉取子模组失败时 `scripts/ci-setup` 以非零退出，`template-gate` 失败并在日志中给出原因，不得跳过该步骤后报告通过。

Linux runner 上的两个测试曾因对 macOS 行为的隐性假设而失败，已修复：超时测试显式 `exec`，使忽略 `SIGTERM` 的进程成为 `sh -c` 的直接子进程；发布的“旧运行时残留”后置检查改用 `.template-source/scripts/lib/legacy-runtime-scan.mjs`，不再依赖外部 ripgrep。`yss-cli` 的原生验证仍只对 darwin/arm64 做资格。

报告与日志写在仓外的 `/tmp/ci-gate`，两个平台都作为构建产物保留；两份报告的步骤名单、各步命令与退出码应一致。检查期间仓库出现任何新增改动都会使本轮失败。

## 轻量模板发布（默认）

只发布模板、不同时发布 CLI 时，使用这条路径；它不要求恢复矩阵、原生装配、平台运行证据或 CLI Bundle 绑定本次模板提交。

1. 变更经 PR 合入 main，`template-gate` 必须通过。
2. 在合入后的 main 提交上执行 `scripts/verify-template-fast --base <上一正式发行完整 SHA> --report-dir <仓库外新目录>`，保存 `limited` 范围的报告。
3. 平台验收由维护者人工完成并自行记录（Mac、Windows、Linux 各自的安装、初始化与回滚）；发行说明写明「平台验收：人工，不在 CI 或发布门禁内」，不声称任何平台已验收。
4. 在该提交上打 `vX.Y.Z` tag 并创建 GitHub Release，附上 fast 报告与 `SHA256SUMS`。发行说明列出配套 CLI 版本和本次未覆盖的范围。

上面 1–4 步由 `.template-source/scripts/release-template.mjs` 分两步完成：

```sh
# 准备：核对前置（template-source、干净 main、与 origin/main 一致、base 是祖先、tag 未占用、版本递增），
# 跑 fast，生成证据与发行说明；不改动远端
node .template-source/scripts/release-template.mjs --version X.Y.Z --base <上一正式发行完整SHA> --summary <维护者摘要文件> --output <仓库外新绝对目录>
# 发布：确认发行说明后，重新核对前置，打 tag、推送、创建 Release，并回读附件摘要与 tag 提交
node .template-source/scripts/release-template.mjs --version X.Y.Z --base <上一正式发行完整SHA> --publish-from <准备目录>
```

发行说明的验证部分由脚本按证据生成：只写已执行的 fast 与其范围，固定写明「平台验收：人工」，不接受自述。

需要核对固定 CLI 的初始化、迁移、回滚集成时，才使用下文的 `verify-template-release.mjs`；它同样不要求恢复矩阵、原生装配或 Bundle 绑定本次模板。

## 发布版本与证据

输入 SHA 与实际 HEAD 必须一致；该提交须具备本合同对应的验证脚本。发布证据绑定实际待验证提交，不再依赖 GitHub workflow 或 action 编排。

`node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --base <上一正式发行完整SHA> --output <仓库外绝对目录> --cli-family all-four` 要求干净模板、同仓三个 Profile 及固定 CLI 来源一致。显式提供 `YSS_NATIVE_BINARY`、`YSS_NATIVE_BINARY_SHA256` 和固定源码的 `YSS_NATIVE_SOURCE_ROOT`；二进制必须是 `yss-cli-pin.json` 固定的那一份，三 Profile Bundle 必须来自已提交的模板来源，但**不要求 Bundle 绑定本次待发布的模板提交**。生产、公开 Bundle 导出、隔离安装副本、初始化、Skill 投影/锁校验及用户 `.github` 保留检查全部通过。当前发布集合始终覆盖三 Profile。`--cli-family spec` 仅用于定向诊断。

旧实例恢复矩阵、原生装配 native input 和平台范围声明已从发布门禁移除：这些平台验收由维护者人工处理并自行记录，发行说明写明「平台验收：人工」，门禁不检查、也不替任何平台背书。

Go 生产用固定四源提交和 `bundle-profile.json` 声明政策，运行 `go run ./tools/bundle --source-root <模板根> --lock docs/source-lock.json --out internal/bundle/assets`，再以 `CGO_ENABLED=0` 构建。二进制、Bundle、插件摘要收录仓外生态发行清单，避免互相嵌入未来提交形成循环。模板 Node/Python 治理工具和 pnpm frozen 依赖继续保留。不会执行 publish、npm deprecated 或仓库归档。

证据保存在仓库外的新目录：候选保留计划、完整 base/head/tested commit、实际调用参数与日志；发布保留 `release-verification.json`、每条命令实际退出码、日志、模板 SHA、生成器 SHA、同仓 Profile 来源与新快照摘要；兼容验证分别记录日志。失败结果及缺失证据必须保留，不能宣称通过。发布就绪要求全部适用风险、集成和阻断兼容检查均成功；Node 26 观察失败可见但不阻断。

## 验证两档与证据恢复

当前仅有 fast 与 release。fast 按输入与依赖选择必要检查；release 基于上一正式发行的完整差异与当前输入选择受影响检查、依赖及必需来源/安装/恢复检查，未知输入拒绝，显式路径只能扩大范围。检查定义、影响依赖、执行前置与风险归属只在 `template-verification-profiles.yaml` 维护。Gxx 是既有展示编号，退役项保留编号空位，机器检查保留 `check.*`；内部任务、语法检查和终检仍逐项记录。失去对象的检查随对象退役，现存验证责任直接绑定当前行为检查。

candidate、legacy-full 执行入口、legacy_coverage 记账、资格配对计时与策略激活层已退役。base 或 baseline 报告不能缩小 release 集合；显式提供报告时仍检查完整 SHA、祖先关系、报告摘要、来源与真实执行证据。参数不完整、错误摘要、非祖先 baseline、未知路径或依赖配置错误在昂贵任务前失败。

历史报告从其绑定提交读取策略与清单，只读编译期望台账；不运行历史执行器，不让历史 qualified-gates 自述恢复当前资格或缩减检查。无法独立验证的历史记录保持可追溯，但不能作为当前有效 baseline。旧候选快照、审查记录与证据 kind 不因验证档退役而删除。

三 Profile 的固定二进制、Bundle 导出和安装副本属于可见准备任务。旧两项源码检查的稳定覆盖 ID 映射 `tests/cli-retirement.test.mjs` 的公开行为检查，不继续 require 退役 gitlink。检查覆盖版本化 envelope、真实退出码、bytes/mode 来源、三 Profile 初始化/同步、预演无写入、幂等、保护路径和预期错误码。旧实例恢复矩阵单独执行仓外固定旧执行器，不将原生新建实例冒充旧实例迁移。

固定来源本机报告使用 `verification_scope: local-template-and-cli` 与 `release_readiness: not-evaluated`。本机通过只闭合本机源码和 CLI 风险；整体可发布结论还须核验既有适用 Node / 平台合同及当前 SHA 的真实证据，缺项保持未就绪。

新报告 v2 保留原始结果，独立消费者根据实际调用上下文及固定策略重新计算完整期望集合，核对 task/check ID、依赖、Gate、来源 tuple、实际 file/argv/cwd/env、日志边界及摘要。同轮复用仍须来自真实成功退出且执行输入等价；选中而未执行进入 `unexecuted`，不适用任务单独登记。监督入口在 worker 关闭后记录实际退出；缺日志、缺结果、不可观察退出或输入漂移均拒绝。历史 v1 只读，不补造 v2 字段，fast limited 报告不能成为发布证据。

环境或来源错误在昂贵任务前停止。普通失败阻断依赖下游，继续独立检查；超时和取消停止相应启动，保留退出码、信号、日志及终止失败。制品准备与清理仍是实际任务。release 保持串行执行条件，Node 批量测试显式限制文件并发；工具测试按单文件 / 准备任务计时，不把整套累计耗时作为单文件超时。fast 既有受控并行不因此改变，`--concurrency 1` 限制所有层级。

发现漏检、输入漂移或证据失真时，恢复相互兼容的选择器、执行器、profile 与消费者，并对恢复后的当前输入重新验证受影响行为。正式发布前仍须对实际待发布提交运行 release 与固定版本集成，由维护者明确发起实际发布。

## 项目实例 CI 合同

本轮仅定义合同，不安装实例 CI。原生 Bundle 继续排除 `.github`；升级同步不得接管已有工作流。自动安装将作为独立能力处理。

实例 CI 的后续实现须遵循：

- 先验证根 `yss-project.yaml` 的 `project-instance` 身份，以及根 `CONTEXT.md` 合同。
- 只检查已有流程资产的 schema、引用、摘要与状态真实性。Plan、Spec、设计和契约草案允许合入；不存在的未来阶段产物不是失败。
- 对声称批准或正在流转的工作单元，按生命周期注册表检查其实际门禁、用户决定、当前资产和证据；不能以“草案允许合入”绕过流转条件。
- 不运行上游技能分发、上游同步、模板生成器回归或模板发布检查，也不要求 `.template-source`、模板子模块或模板维护 checkpoint。
- 业务构建、单元测试和交付验收归属已登记的实现仓库；按其接入合同引用证据，不在治理实例中猜测业务构建命令。
