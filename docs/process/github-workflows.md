# GitHub CI 与发布前验证

本合同区分模板源、项目实例和实现仓库的验证责任。生命周期门禁仍由 `lifecycle-registry.yaml` 定义；维护分级由 `maintenance-intensity.yaml` 和 `harness-process-tailoring.md` 定义；检查组、影响面和兼容触发路径只在 `template-verification-profiles.yaml` 维护。

## 模板源

| 入口 | 行为 | 结果边界 |
|---|---|---|
| PR：Template CI | 对合成 merge commit 执行 candidate；以事件 base SHA 计算影响面；核心或未映射路径升级全量 | 合并前机器检查，不宣布发布就绪 |
| main push：Template CI | Node 24 全量 `scripts/verify-template` | 检查合并后的完整主干 |
| Template compatibility | 工具影响 PR、main 全量及发布前执行 Node 22 工具测试、macOS vendor 一致性、Node 26 非阻断观察 | 独立于 Node 24 主验证，不再重复主验证中的工具测试 |
| 手动：Template release verification | 输入完整 40 位模板 commit，精确检出；全量验证、生成器集成与兼容矩阵 | 产出证据，不打 tag、不创建 Release、不发布包 |

模板工作流首先要求 `template-source`。全量检查递归初始化 gitlink 固定的子模块，不追踪上游分支。工具依赖使用固定 pnpm 与 frozen lockfile；Node 24 为主验证环境，Python 3.12 / jsonschema 4.23.0 提供既有 schema 检查依赖。vendor 校验在临时目录重建并比较，不先覆盖受版本管理的 vendor。

本地复验应把独立 Node 24 的 bin 加入 PATH 后直接运行验证入口；不要用带 `--package` 的 `npm exec` 包住整条验证链，其包配置可能被内部 npx 继承，改变实际执行的工具。

PR 无工作流级 paths 过滤，始终产生 `Template checks` 汇总结果；兼容检查只有在计划要求时才能跳过。PR 同号的新运行取消旧运行；main 和发布前运行用 run ID 隔离。远程 required checks / 分支保护由仓库维护者配置，本轮不修改远程设置。

## 发布版本与证据

`Template release verification` 必须先存在于默认分支。输入 SHA 与实际 HEAD 必须一致；该提交也必须具备本合同对应的脚本和 action。调用工作流的版本与待验证 SHA 可能不同，Actions run 保留编排版本，报告记录被验证版本。

`node .template-source/scripts/verify-template-release.mjs --commit <40位SHA> --output <仓库外绝对目录>` 要求干净的模板工作树、已初始化且与 gitlink 一致的子模块。全量验证后，从 gitlink 对应的 `create-yss-spec` commit 创建隔离副本，用待发布模板重建快照；打包、干净安装、初始化、Skill 投影/锁校验，以及同步前后用户 `.github` 保留检查必须通过。不会改原始生成器工作树。既有其他专职生成器场景继续由全量 profile 执行。

生成器消费者验收使用 `npm pack --ignore-scripts` 和本地 tarball 安装，属于包格式验证的受控工具例外；模板工具测试仍用 pnpm。不会执行 npm publish，也不使用浮动生成器版本或 latest 包。

证据保存在 runner 临时目录，通过 artifact 上传：PR 保留计划、base/head/tested commit 与日志；发布保留 `release-verification.json`、每条命令实际退出码、日志、模板 SHA、生成器 SHA、子模块版本与新快照摘要；兼容 job 分别上传日志。失败时也尝试上传，准备阶段失败或 runner 丢失造成证据缺失时不得宣称通过。最终通过要求全量、集成和阻断兼容 job 均成功；Node 26 观察失败可见但不阻断。

本地实现验证不等同于已执行 GitHub Actions。正式发布前仍须对实际待发布提交运行以上入口，由维护者明确发起实际发布。

## 项目实例 CI 合同

本轮仅定义合同，不安装实例 CI。现有生成器继续排除 `.github`；升级同步不得接管已有工作流。自动安装将作为独立能力处理。

实例 CI 的后续实现须遵循：

- 先验证根 `yss-project.yaml` 的 `project-instance` 身份，以及根 `CONTEXT.md` 合同。
- 只检查已有流程资产的 schema、引用、摘要与状态真实性。Plan、Spec、设计和契约草案允许合入；不存在的未来阶段产物不是失败。
- 对声称批准或正在流转的工作单元，按生命周期注册表检查其实际门禁、用户决定、当前资产和证据；不能以“草案允许合入”绕过流转条件。
- 不运行上游技能分发、上游同步、模板生成器回归或模板发布检查，也不要求 `.template-source`、模板子模块或模板维护 checkpoint。
- 业务构建、单元测试和交付验收归属已登记的实现仓库；按其接入合同引用证据，不在治理实例中猜测业务构建命令。

## 平台事实依据

- [GitHub 事件与 PR merge / workflow_dispatch 语义](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [checkout 的 ref 和子模块选项](https://github.com/actions/checkout#usage)
- [job outputs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs)
- [并发控制](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)
- [失败后 artifact 上传及隐藏路径规则](https://github.com/actions/upload-artifact/blob/v4/README.md)

以上平台语义于 2026-09-10 使用 yss-research technical-evidence / quick 查阅官方文档；验证责任与裁剪策略来自本轮用户确认。
