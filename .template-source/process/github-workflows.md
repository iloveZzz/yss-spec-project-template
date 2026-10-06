# 本地验证与 GitHub workflow 边界

本合同区分模板源、项目实例和实现仓库的验证责任。生命周期门禁仍由 `lifecycle-registry.yaml` 定义；维护分级由 `maintenance-intensity.yaml` 和 `harness-process-tailoring.md` 定义；检查组、影响面和兼容触发路径只在 `template-verification-profiles.yaml` 维护。

## 模板源

| 入口 | 行为 | 结果边界 |
|---|---|---|
| 内循环：`scripts/verify-template-fast` | 按当前影响面执行检查；未具备当前资格时保留完整回退 | 日常维护验证 |
| 候选：`scripts/verify-template-candidate --base <完整 SHA>` | 以显式 base 计算提交差异，并合并 index、工作树和未跟踪路径 | 合并前机器检查，不宣布发布就绪 |
| main 与发布前：`scripts/verify-template` | 核验完整 baseline 与当前资格后执行全部适用风险；缺失或失效时走独立 `legacy-full` | 检查完整候选 |
| 固定版本：`verify-template-release.mjs` | 输入完整 40 位模板 commit，执行上述验证与指定 CLI 家族集成 | 产出证据，不打 tag、不创建 Release、不发布包 |

主模板、三个专职 Agent 模板和四个 CLI 仓库的根 `.github/workflows` 已移除。仓库推送、PR 和手动 Actions 入口不再自动运行这些模板检查；维护者通过上述本地入口执行并保存本轮证据。

模板验证首先要求 `template-source`。全量检查使用三个 Agent 模板源的公开 gitlink 固定子模块，不追踪上游分支；运行前须初始化所需子模块。工具依赖使用固定 pnpm 与 frozen lockfile；Node 24 为主验证环境，Python 3.12 / jsonschema 4.23.0 提供既有 schema 检查依赖。vendor 校验在临时目录重建并比较，不先覆盖受版本管理的 vendor。

本地复验应把独立 Node 24 的 bin 加入 PATH 后直接运行验证入口；不要用带 `--package` 的 `npm exec` 包住整条验证链，其包配置可能被内部 npx 继承，改变实际执行的工具。

工具兼容性仍按影响面和发布验证计划检查：Node 22 工具测试、macOS vendor 一致性及 Node 26 非阻断观察分别保留实际环境、命令、退出码和日志。运行时存储的跨平台验证仍覆盖受支持的 Node 与操作系统，以及最低版本拒绝行为；本地单一环境通过不能充当未执行平台的结果。远程 required checks / 分支保护由仓库维护者单独配置。

## 发布版本与证据

输入 SHA 与实际 HEAD 必须一致；该提交须具备本合同对应的验证脚本。发布证据绑定实际待验证提交，不再依赖 GitHub workflow 或 action 编排。

`node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --output <仓库外绝对目录> --cli-family all-four` 要求干净模板和三个 Agent 模板源与固定 gitlink 一致。显式提供 `YSS_NATIVE_BINARY`、`YSS_NATIVE_BINARY_SHA256` 和固定源码的 `YSS_NATIVE_SOURCE_ROOT`；二进制和四 Profile Bundle 必须分别绑定已提交的统一 CLI 与模板来源。生产、公开 Bundle 导出、隔离安装副本、初始化、Skill 投影/锁校验及用户 `.github` 保留检查全部通过。当前发布集合始终覆盖四 Profile，旧 npm 包只用于仓外历史恢复，不参与现役生产。

四类发行还必须提供 `YSS_LEGACY_RECOVERY_REPORT` 及 `YSS_LEGACY_RECOVERY_REPORT_SHA256`。恢复矩阵逐家族绑定固定旧包、源码 SHA、版本、实际日志摘要、当前二进制摘要和十二项必要场景；预期拒绝须核对自己的错误码。未完成项、输入漂移、错配摘要和 `fixture: true` 阻断正式发行。六平台运行验收在独立最终门禁核验。`--cli-family spec` 仅用于定向诊断，不能替代四类发行验收；CI 合成 Go fixture 仅验证算法与拒绝语义。

Go 生产用固定四源提交和 `bundle-profile.json` 声明政策，运行 `go run ./tools/bundle --source-root <模板根> --lock docs/source-lock.json --out internal/bundle/assets`，再以 `CGO_ENABLED=0` 构建。二进制、Bundle、插件摘要收录仓外生态发行清单，避免互相嵌入未来提交形成循环。模板 Node/Python 治理工具和 pnpm frozen 依赖继续保留。不会执行 publish、npm deprecated 或仓库归档。

证据保存在仓库外的新目录：候选保留计划、完整 base/head/tested commit、实际调用参数与日志；发布保留 `release-verification.json`、每条命令实际退出码、日志、模板 SHA、生成器 SHA、子模块版本与新快照摘要；兼容验证分别记录日志。失败结果及缺失证据必须保留，不能宣称通过。发布就绪要求全部适用风险、集成和阻断兼容检查均成功；Node 26 观察失败可见但不阻断。

## 验证策略资格与恢复

覆盖合同、影响依赖、执行前置、旧检查映射及资格输入仅在 `template-verification-profiles.yaml` 维护。G01–G20 是展示编号，机器检查保留 `check.*`；内部任务、语法检查和终检不能因合并展示而消失。旧完整参考使用冻结清单和独立执行器，不经过新选择器裁剪。

发布影响选择必须绑定已接受的完整验证 baseline，核验报告摘要、完整 SHA、祖先关系、来源清单、策略及实际完整执行证据。锁差异与路径差异使用同一 baseline。参数不完整、错误摘要、非祖先 baseline、未知路径或依赖配置错误在计划阶段失败；缺 baseline、资格缺失 / 过期、核心策略变化或未审计依赖执行 `legacy-full`。首次策略切换提交本身必须通过旧完整验证，建立初始 baseline。

常规全量回退保留冻结清单的全部覆盖，并由当前监督入口与依赖调度器执行；普通失败阻断下游，独立项继续。显式 `scripts/run-template-verification --profile legacy-full` 是独立旧参考入口，其 `legacy-reference` 计划使用冻结执行器，供新旧覆盖和性能对照，不消费新选择器的裁剪结果。两者均记录实际执行参数；Node 批量测试显式限制文件并发，`--concurrency 1` 不依赖环境变量间接约束。

四 Profile 的固定二进制、Bundle 导出和安装副本属于可见准备任务。旧两项源码检查的稳定覆盖 ID 显式映射 `tests/cli-retirement.test.mjs` 的公开行为检查；历史冻结清单原样保留用于追溯，不继续 require 退役 gitlink。新检查覆盖版本化 envelope、真实退出码、bytes/mode 来源、四 Profile 初始化/同步、预演无写入、幂等、保护路径和针对预期码的拒绝。旧实例恢复矩阵单独执行仓外固定旧执行器，不将原生新建实例冒充旧实例迁移。

固定来源本机报告使用 `verification_scope: local-template-and-cli` 与 `release_readiness: not-evaluated`。本机通过只闭合本机源码和 CLI 风险；整体可发布结论还须核验本节既有适用 Node / 平台合同及当前 SHA 的真实证据，缺项保持未就绪。

资格绑定策略、选择器、执行器、报告验证器、旧清单、适配器、fixture 和反例摘要。至少五组同一固定代表候选的新旧成对测量交替执行顺序；每次包含预检、准备、构建、安装、迁移、执行、终检及清理。新策略中位耗时至少下降 20%，最大耗时不超过旧策略最大耗时，同时所有适用风险及拒绝场景闭合，才允许切换。资格报告必须包含实际配对结果和可读取报告；成功布尔值不能代替证据。中位 12 分钟、最长 18 分钟属于后续目标。

新报告 v2 保留原始结果，独立消费者根据实际调用上下文及锁定合同重新计算期望集合；选中而未执行才进入 `unexecuted`，不适用任务单独登记。监督入口在 worker 关闭后记录观察到的退出；缺日志、缺结果、不可观察退出或输入漂移均拒绝。历史 v1 只读，不补造 v2 字段。

环境或来源错误在昂贵任务前停止。普通失败阻断依赖下游，继续独立检查；超时和取消停止相应启动，保留退出码、信号、日志及终止失败。工具测试继续按单文件 / 准备任务计时，不把整套累计耗时作为单文件超时。已有内层两路并发时外层 tooling 独占；`--concurrency 1` 限制所有层级。

切换后记录连续五个独立候选的适用集合、耗时、失败及回退原因。发现漏检、输入漂移或证据失真时，恢复选择器、执行器、profile、消费者及治理合同的兼容版本，并对回滚后的当前候选重新完整验证。未达到性能或覆盖标准时保持旧发布策略；日常实现交付仍为 `implementation-ready`。

正式发布前仍须对实际待发布提交运行以上入口，由维护者明确发起实际发布。

## 项目实例 CI 合同

本轮仅定义合同，不安装实例 CI。原生 Bundle 继续排除 `.github`；升级同步不得接管已有工作流。自动安装将作为独立能力处理。

实例 CI 的后续实现须遵循：

- 先验证根 `yss-project.yaml` 的 `project-instance` 身份，以及根 `CONTEXT.md` 合同。
- 只检查已有流程资产的 schema、引用、摘要与状态真实性。Plan、Spec、设计和契约草案允许合入；不存在的未来阶段产物不是失败。
- 对声称批准或正在流转的工作单元，按生命周期注册表检查其实际门禁、用户决定、当前资产和证据；不能以“草案允许合入”绕过流转条件。
- 不运行上游技能分发、上游同步、模板生成器回归或模板发布检查，也不要求 `.template-source`、模板子模块或模板维护 checkpoint。
- 业务构建、单元测试和交付验收归属已登记的实现仓库；按其接入合同引用证据，不在治理实例中猜测业务构建命令。
