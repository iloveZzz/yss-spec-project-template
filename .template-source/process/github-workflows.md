# 本地验证与 GitHub workflow 边界

本合同区分模板源、项目实例和实现仓库的验证责任。生命周期门禁仍由 `lifecycle-registry.yaml` 定义；维护分级由 `maintenance-intensity.yaml` 和 `harness-process-tailoring.md` 定义；检查组、影响面和兼容触发路径只在 `template-verification-profiles.yaml` 维护。

## 模板源

| 入口 | 行为 | 结果边界 |
|---|---|---|
| 内循环：`scripts/verify-template-fast` | 按当前影响面执行检查；核心或未映射路径升级全量 | 日常维护验证 |
| 候选：`scripts/verify-template-candidate --base <SHA>` | 以显式 base SHA 计算影响面 | 合并前机器检查，不宣布发布就绪 |
| main 与发布前：`scripts/verify-template` | 执行不可裁剪的全量检查 | 检查完整候选 |
| 固定版本：`verify-template-release.mjs` | 输入完整 40 位模板 commit，执行全量验证与生成器集成 | 产出证据，不打 tag、不创建 Release、不发布包 |

主模板、三个专职 Agent 模板和四个 CLI 仓库的根 `.github/workflows` 已移除。仓库推送、PR 和手动 Actions 入口不再自动运行这些模板检查；维护者通过上述本地入口执行并保存本轮证据。

模板验证首先要求 `template-source`。全量检查使用实际依赖的公开 gitlink 固定子模块，不追踪上游分支；运行前须初始化所需子模块。工具依赖使用固定 pnpm 与 frozen lockfile；Node 24 为主验证环境，Python 3.12 / jsonschema 4.23.0 提供既有 schema 检查依赖。vendor 校验在临时目录重建并比较，不先覆盖受版本管理的 vendor。

本地复验应把独立 Node 24 的 bin 加入 PATH 后直接运行验证入口；不要用带 `--package` 的 `npm exec` 包住整条验证链，其包配置可能被内部 npx 继承，改变实际执行的工具。

工具兼容性仍按影响面和发布验证计划检查：Node 22 工具测试、macOS vendor 一致性及 Node 26 非阻断观察分别保留实际环境、命令、退出码和日志。运行时存储的跨平台验证仍覆盖受支持的 Node 与操作系统，以及最低版本拒绝行为；本地单一环境通过不能充当未执行平台的结果。远程 required checks / 分支保护由仓库维护者单独配置。

## 发布版本与证据

输入 SHA 与实际 HEAD 必须一致；该提交须具备本合同对应的验证脚本。发布证据绑定实际待验证提交，不再依赖 GitHub workflow 或 action 编排。

`node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --output <仓库外绝对目录>` 要求干净的模板工作树、所有必需子模块已初始化且与 gitlink 一致。全量验证后，从 gitlink 对应的 `create-yss-spec` commit 创建隔离副本，用待发布模板重建快照；打包、干净安装、初始化、Skill 投影/锁校验，以及同步前后用户 `.github` 保留检查必须通过。不会改原始生成器工作树。既有其他专职生成器场景继续由全量 profile 执行。

生成器消费者验收使用 `npm pack --ignore-scripts` 和本地 tarball 安装，属于包格式验证的受控工具例外；模板工具测试仍用 pnpm。不会执行 npm publish，也不使用浮动生成器版本或 latest 包。

证据保存在仓库外的新目录：候选保留计划、base/head/tested commit 与日志；发布保留 `release-verification.json`、每条命令实际退出码、日志、模板 SHA、生成器 SHA、子模块版本与新快照摘要；兼容验证分别记录日志。失败结果及缺失证据必须保留，不能宣称通过。发布就绪仍要求全量、集成和适用的阻断兼容检查均成功；Node 26 观察失败可见但不阻断。

正式发布前仍须对实际待发布提交运行以上入口，由维护者明确发起实际发布。

## 项目实例 CI 合同

本轮仅定义合同，不安装实例 CI。现有生成器继续排除 `.github`；升级同步不得接管已有工作流。自动安装将作为独立能力处理。

实例 CI 的后续实现须遵循：

- 先验证根 `yss-project.yaml` 的 `project-instance` 身份，以及根 `CONTEXT.md` 合同。
- 只检查已有流程资产的 schema、引用、摘要与状态真实性。Plan、Spec、设计和契约草案允许合入；不存在的未来阶段产物不是失败。
- 对声称批准或正在流转的工作单元，按生命周期注册表检查其实际门禁、用户决定、当前资产和证据；不能以“草案允许合入”绕过流转条件。
- 不运行上游技能分发、上游同步、模板生成器回归或模板发布检查，也不要求 `.template-source`、模板子模块或模板维护 checkpoint。
- 业务构建、单元测试和交付验收归属已登记的实现仓库；按其接入合同引用证据，不在治理实例中猜测业务构建命令。
