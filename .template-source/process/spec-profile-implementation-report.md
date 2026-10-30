# Spec Profile 改造实施报告

日期：2026-10-29。结论：批准方案的本地实现与候选验证完成；不等同于正式发行或远程全链路验收。

## 实施结果

| 工作 | 实际交付 |
|---|---|
| 身份与最小安装 | 新 governed Spec 使用 `matt-spec-v1`；同时验证 schema、安装方式、来源、受管政策及摘要，不能仅添加字符串绕过保护。初始五项核心技能，不要求 Context、checkpoint、Plan 或 Slice。 |
| 技能树 | life 路由 → to-spec 规格方法；grilling、domain-modeling、i-have-adhd 按任务参与；research、原型、审查、设计系统按风险补装。规格聚焦目标、规则、边界、异常、验收与来源。 |
| 技术职责隔离 | 新 Spec 不提供 implement、code-review 或旧阶段/Handoff 执行入口；相关 CLI 明确返回不适用。Backend 保留自身 overlay、实施能力及保护。 |
| 初始化与就绪 | init/attach 默认 governed；doctor、inspect、技能查询与 ensure 支持无旧阶段资产的新 Spec。补装校验引用闭包，重复 ensure 无变化；不隐式覆盖漂移。 |
| Tracker | local Markdown、GitHub Issues、GitLab Issues 三选一。远程配置支持明确 repository/host/project 输入并在写入前校验；支持 rootless 远程配置的保护扫描，不放宽旧写入器。未增加 PR 或同步引擎。 |
| 审批与设计 | 按真实动作及对象复用有效批准，保留可还原批准内容；产品设计按风险决定深度，移除强制全套原型、API、Slice 和重复人工门禁。此项为技能约定，不宣称已实测模型遵循。 |
| 分发及帮助 | canonical 技能、投影、锁及帮助均按现有生成器更新；帮助使用独立 workflow 表达，不伪造阶段 ID。旧实例要求人工迁移。 |

## 执行与审查

实现位于隔离工作树：模板 `/workspace/spec-redesign-template`，CLI `/workspace/spec-redesign-cli`，分支均为 `spec-redesign`。原始 checkout 未覆盖，未 commit、push 或发行。

独立代码审查未发现 Critical，提出四项 Important：doctor 仍依赖 Context、远程初始化缺目标输入、skills 安装与新标识矛盾、设计系统仍要求旧强制流程。均已修复；代码行为补充先失败后通过的测试，文案变更由人工走查及分发检查验证。另修复新 Spec 转换到 skills 的迁移绕过、旧帮助依赖及 rootless 远程保护扫描。

## 实际验证

| 检查 | 结果 / 证据 |
|---|---|
| 候选 Bundle 全量 Go 测试 | `go test -timeout 5m ./...` 通过；使用真实 `BuildSourceState=working-tree` 和基线 BuildCommit 的 ldflags。日志 `/workspace/spec-redesign-tools/logs/verified-all.log`。CLI 包耗时 51.223 秒，未达到仓库 30 秒目标。 |
| 构建、静态检查 | `CGO_ENABLED=0 go build ./...`、`go vet -composites=false ./...` 通过；对应 `verified-build.log`、`verified-vet.log`。 |
| 帮助一致性 | `go run ./tools/helpview --check`、`go run ./tools/helpdocs --check --out docs/cli-help.md` 通过；新 Spec 0 个旧阶段，Backend 保留 8 个。 |
| 模板受影响集合 | 最终 36/36 通过，另政策/诊断相关集合 65/65 通过；日志在 `.superpowers/sdd/spec-profile-redesign/review-template-final2.log`、`final-policy.log`。 |
| 技能生成及注册 | 投影一致性、技能注册检查通过；使用既有生成器更新 canonical 的派生产物。 |
| 真实本地候选冒烟 | init 完成 156 项操作且应用后验证通过；inspect、life resolve、research 缺失→ensure→ready、重复 ensure 零变更通过；implement 和旧生命周期命令明确拒绝。 |
| 远程配置集成 | GitHub/GitLab × init/attach 四组合通过；缺目标在计划/项目写入前拒绝。未调用远程 API。 |

工具链为独立官方 Go 1.27.1，测试使用 umask 022。系统 `/usr/bin/go` 是其他程序，未替换系统工具。

## 执行裁定与边界

- Backend 已排除四个 Spec 专用技能且拥有独立 to-spec，复用现有 overlay，不增加重复生成器；工程测试夹具转用 Backend 并提供真实 business_input，不恢复已移除的 Spec 实施行为。
- 新政策是受管且来源可验证的安装资源；旧自由格式诊断明确报告“不评估”，没有将其伪装成通过旧 schema。
- 使用临时 Git index 固定候选源码树及 working-tree SourceLock；正式 `docs/source-lock.json` 未修改。候选锁、工具及日志保存在 `/workspace/spec-redesign-tools/`，候选归档不作为正式发行产物。
- 生成器冲突仅涉及本轮自己的生成副本：先与候选树逐字节核对并归档，才在隔离工作树恢复生成基线后重新生成。未重置用户 checkout。
- 云技能脚本无本地可执行副本，使用任务身份绑定的本地执行台账记录结果，没有虚构脚本调用。

## 未完成的外部验收 / 后续待办

| 待办 | 当前边界 |
|---|---|
| GitHub/GitLab 真实创建、更新与未知结果恢复 | 无指定且获授权的远程目标，未做写入。当前交付配置解析、保护及技能操作步骤；不是新增的远程 API 适配器或同步服务。 |
| 宿主技能自动发现、刷新与调用 | CLI 就绪可验证；宿主实际发现未知，不能由文件存在推断成功。 |
| AI 设计深度判断及真实人工审批 | 已走查规则，未进行真实审批实验；不得把配置或标签视作批准。 |
| 正式固定来源、完整 release 检查 | 未提交或发行。`verify-template-fast` 需要最新官方 CLI 预检，本轮未通过该完整入口；不能用候选冒充正式发布版本。 |
| CLI 测试运行时间 | 本轮全量 CLI 测试超过 30 秒目标，保留为后续性能改进，不影响本轮功能通过结论。 |

上述未覆盖项保留开放，不能将整体验收表全部标记为实测通过。详细任务和裁定见 `.superpowers/sdd/spec-profile-redesign/progress.md`；实施计划保留原始步骤并追加实际执行状态。

## 2026-10-30 TDD 验证补充

见 [TDD 验证记录](spec-profile-tdd-validation.md)：复现并修复 tracker 可选字段非字符串被静默忽略的问题；定向测试、独立审查、全量 Go 测试、构建及定向 vet 通过。CLI 包本轮 76.047 秒，性能目标仍未满足。远程及宿主未覆盖项不变。

## 正式帮助文档检查补充（2026-10-30）

先前 `helpdocs --check` 使用默认精简模式，仅证明精简输出一致；正式工件要求 `--reference`。现已用该参数重新生成并检查通过，修复精简输出造成参考文档大量丢失。原有结果不构成正式 reference 检查证据。具体发行前提见 [发行准备](spec-profile-release-readiness-2026-10-30.md)。
