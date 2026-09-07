---
design_id: dedicated-harness-cli-v1
version: 1.1.0
status: confirmed
repository_mode: template-source
intensity: L3
updated_at: 2026-09-07
---
# 前后端专职 Harness CLI 设计

本设计新增 `create-yss-harness-backend` 与 `create-yss-harness-frontend`，让团队通过公开 npm 创建、接入和更新专职 Harness 项目。首版管理由新 CLI 初始化或 attach 接入的实例，不兼容仓内脚本生成的旧实例；更新遇到未解决冲突时暂停整次应用。

本文是已由提问者确认的模板维护设计，不是产品 Spec、OpenAPI 或已批准的 Slice Implementation Contract。提问者已确认完整方案，并随后逐项明确 P1、P3 维持确认，P2 改为“旧实例不做兼容”。此最新决定替代原 Q3 与 Q10 的旧实例接入范围。确认范围和文档摘要见 [设计确认记录](../evidence/maintenance/dedicated-cli-design-2026-09-07/design-confirmation.json)。本轮交付设计文档，尚未执行 CLI 编码、仓库创建、Git 提交或 npm 发布。

## 1. 已确认的设计决定

来源：当前任务“提交 CLI 升级到 GitHub”中的 grilling 访谈、问答界面原始回复及最后的“确认方案”；任务 ID `01a070dc-f4b2-7520-a2f2-410e2a070576`。最终以提问者对 P1—P3 的明确回复为准；其中 P2 替代旧实例兼容决定。历史答案和覆盖关系保留在确认记录，不把旧答案当作当前范围。

| ID | 已确认决定 | 直接影响 |
|---|---|---|
| Q1 | 首版完整覆盖 init、attach、sync、update/upgrade | 同时设计受管基线、更新事务与程序升级 |
| Q2 | 公开 npm，使用两个独立包名 | 固定快照构建、包内容审查与真实 tgz 验收 |
| Q3 / P2 | 首版不兼容仓内脚本创建的旧实例；最新 P2 替代原 Q3 | 识别后拒绝写入，不实现旧 metadata 转换或基线迁移 |
| Q4 | attach 支持已有业务代码仓库和独立管理仓库 | 只接入允许清单中的治理资产，保护业务文件 |
| Q5 | 冲突时整体暂停；允许显式备份覆盖后重试 | 预检先于写入，覆盖不豁免身份和路径规则 |
| Q6 | 两个独立 CLI 仓库；构建时同步同一公共核心 | 核心归属综合模板治理工具目录，新 CLI 无核心运行时下载 |
| Q7 | 旧创建入口保留新 CLI 使用提示，停止创建新实例 | 新 CLI 可用后退役旧生成行为，保留旧项目内容但不提供接管 |
| Q8 | 各自独立版本、独立发布 | 每包分别锁模板提交和核心版本，共享变更分别验证 |
| Q9 | attach/sync 默认预览，--apply 才写入；init 仅不存在或空目录 | 两个新 CLI 使用一致的显式写入边界 |
| Q10 / P2 | 不提供任何旧实例兼容分支，无论旧基线是否完整 | 不实现旧实例自动接入、人工辅助接入或基线重建 |
| Q11 | 失败自动回滚，成功后保留备份恢复；首版无 rollback 命令 | 保留恢复材料，限制首版回退能力范围 |

Q6 的已确认边界：首版只让两个新 CLI 使用共享核心；现有三个 CLI 仅更新必要的家族兼容规则，不整体迁移核心。

## 2. 事实依据和适用规则

源码事实见 [研究简报](../evidence/maintenance/dedicated-cli-design-2026-09-07/cli-design-research-brief.md) 与相邻 evidence 文件。简报只研究第一方本地源码，不证明拟用 npm 包名可用，也不证明当前具备发布权限。

- 专职模板已经拥有独立 profile 与 metadata 文件名；新 CLI 保留它们。
- 仓内 `instantiate-harness` 依赖源仓 Git，不能原封不动作为已安装 npm 包的运行时。
- 旧专职 metadata 与 dev CLI metadata 不同；源码研究说明兼容需要额外设计。该兼容工作已被最新 P2 排除，首版仅识别并拒绝旧格式。
- 现有 CLI 采用包内固定模板快照并校验家族，初始化不在线拉取任意模板。
- 当前指定仓库范围内未发现可直接消费的共享 CLI 核心；共享核心本身是此次新增工作。

本设计已获完整确认，定向替代 [旧家族合同](cli-family-identity-contract.md) 中“专职模板只用仓内脚本、不新增 npm 包、无专职同步”的范围；保留身份隔离、禁止跨 profile 迁移、受管边界与回滚要求。原历史决定不改写为“曾批准新增 CLI”。

维护强度为 L3：cross-repo-contract、generation-semantics、release-semantics。没有业务 API、页面或运行时代码生成影响，产品 Spec / OpenAPI / 原型 / 产品 context_reconciliation 为 not-applicable，理由为模板源工具链维护。包内技能内容仍来自对应模板的 canonical 来源，CLI 不成为第二套技能权威。

## 3. 仓库、核心与模板的分工

| 资产 | 规划位置 | 责任 |
|---|---|---|
| 公共核心权威源码 | 综合模板 `.template-source/cli-core/` | 参数协议、身份预检、计划、基线、事务、旧格式拒绝、程序升级及共同测试 |
| 后端薄 CLI | 独立 `create-yss-harness-backend` 仓库，接入 `submodules/create-yss-harness-backend` | 后端包身份、命令入口、核心锁、模板锁、README、发布与包级测试 |
| 前端薄 CLI | 独立 `create-yss-harness-frontend` 仓库，接入 `submodules/create-yss-harness-frontend` | 前端包身份、命令入口、核心锁、模板锁、README、发布与包级测试 |
| 后端 / 前端模板 | 既有两个专职模板仓 | profile、分发清单、canonical skills、实例合同和用户手册 |

每个 CLI 的结构：

```text
bin/create-yss-harness-<side>.js
config/family.json
vendor/cli-core/                 # 按锁生成，禁止手改
cli-core.lock.json
scripts/sync-core.mjs
scripts/sync-template.mjs
src/                            # 仅保留确有家族差异的薄适配
template/                       # 固定模板快照
template.manifest.json
template.snapshot.json
tests/
package.json
README.md
```

核心分发采用构建时确定性复制：`cli-core.lock.json` 记录来源仓、完整已提交 revision、来源子目录、核心版本、协议版本、文件清单与摘要。`sync-core --check` 检测漂移；CLI 运行时只消费包内代码。核心中的必要第三方解析器如采用随包分发，必须保留版本、许可证和来源记录。

模板锁独立记录来源完整 SHA、分发清单摘要、快照摘要和确定性路径编码。核心锁不等于模板锁。发布顺序消除循环引用：先固定核心和模板来源，再构建 CLI，最后由父仓记录 CLI gitlink；源提交无需反向引用尚不存在的 CLI 提交。

实例生成和接管不运行目标工程的脚本，不要求目标已是 Git 仓库。包管理器下载 CLI 与 `update/upgrade` 可联网；init、attach、sync 处理的是当前安装包携带的固定快照，不偷偷更新 CLI 或在线拉浮动模板。

## 4. 家族身份与受管范围

| CLI | profile | metadata 文件 | 模板来源 |
|---|---|---|---|
| create-yss-harness-backend | harness.backend-delivery | .yss-harness-backend.json | yss-harness-backend-agent |
| create-yss-harness-frontend | harness.frontend-delivery | .yss-harness-frontend.json | yss-harness-frontend-agent |

模板 profile 的 `instantiation.cli_package` 与 npm 使用入口更新为对应新包名，`repository-local` 只用于识别不受支持的旧实例，不作为可接入身份。家族适配配置从已校验的模板身份产生，不另手工维护相互矛盾的 profile 定义。

init、attach、sync 共同拒绝异族、多家族、矛盾字段、未知 schema/profile、非法身份路径。通用 dev 实例不自动变成 backend/frontend；两个专职家族也不互相转换。旧三个 CLI 保持原产品行为，只更新必要识别和拒绝矩阵。`--force` 无权绕过家族或路径检查。

attach 只管理分发清单中明确允许的治理资产。不接管业务源码、package.json / 锁文件、pom.xml / Maven Wrapper、构建部署配置、.git、.gitmodules、Git 历史、远程仓以及 submodule 内容。existing AGENTS.md、README.md、CONTEXT.md 等同名文件不能因“属于治理文件”而被当作未修改模板覆盖；它们参与碰撞/冲突分析并保留本地内容。

路径按文件类型处理。仅 canonical skills 内的允许相对投影链接可恢复或物化；外部链接、身份路径链接、越界路径和受保护 gitlink 不可覆盖。npm 快照打包时采用统一的文件、mode、逻辑路径和投影处理规则；新 CLI 自己的受管基线明确记录投影表示，不从旧实例导入 symlink 基线。

## 5. 命令行为

以下统一行为已随完整设计确认。两个 CLI 同形，例子以 backend 为例。

| 操作 | 建议默认行为 | 应用方式与边界 |
|---|---|---|
| 默认命令 / init | 交互或参数创建，生成前核验 | 目标不存在或为空；非空目标转 attach，不清空目录 |
| init --dry-run | 展示目标、版本和生成摘要 | 无目标写入、无备份 |
| attach | 默认展示计划 | `--apply` 显式应用；仅接入无家族工程，旧实例识别后拒绝；已有新版同家族 metadata 提示使用 sync |
| sync | 默认展示当前包与项目基线的差异 | `--apply` 显式应用，仅支持已接入的同家族实例 |
| attach/sync --dry-run | 与默认预览一致 | 只读；身份错误、未知基线或未解决冲突仍用非零退出码报告 |
| attach/sync --apply --force | 对计划中的可覆盖冲突备份后应用 | 不绕过身份、路径、业务文件或缺失必要基线 |
| update / upgrade | 仅升级 CLI 程序 | 沿用现有安装方式识别；源码/npx 模式给出安装指引，实例文件不变 |
| --help / --version | 输出用法或版本 | 不要求有效的目标家族 |

init 复用既有项目名称、业务领域、团队规模、目标目录、issue-tracker 偏好、git-init、示例文档参数；是否创建 Git 仅由 `--git-init` 决定，不创建 GitHub 仓库或发送 Tracker 消息。CI 可通过完整参数避免交互。初版通过 `--json` 提供稳定的计划/结果摘要，供自动化识别；文本默认输出中文。

写入命令统一采用有计划摘要的执行：预览展示新增、更新、保留、删除、身份登记、冲突、备份位置、CLI/模板/core 版本。执行前重新读取目标并检查计划依赖的摘要；执行期间并发变化则中止，不沿用过期预览批准。执行协议须区分“存在可应用更新”和“冲突/身份/校验失败”，不能让部分成功看起来像整体成功。

## 6. 新版 metadata 与旧实例拒绝

保留 `.yss-harness-backend.json` / `.yss-harness-frontend.json` 文件名，新 CLI 使用明确的 `metadataSchemaVersion: 2` 格式。仓内脚本的 `schema_version: 1` 是旧格式，仅用于识别并返回不支持错误，不提供字段转换或兼容读取后写入。

新版记录至少覆盖家族、CLI 版本、模板提交/快照摘要、核心版本/摘要、分发清单摘要、项目变量、每个受管文件的来源基线与最后应用状态、文件类型和 mode、上次事务 ID。基线由新 CLI 的 init 或 attach 建立；后续 sync 仅消费该格式下明确的同家族基线。

按最新 P2，以下规则适用于首版：

1. 仓内脚本创建的旧实例一律不接管，即便家族一致、来源已提交且摘要完整。
2. init 不覆盖旧实例目录；attach / sync 在预检中识别旧 metadata 或 repository-local profile，返回非零退出码和不支持说明，不创建备份、不改文件、不转换身份。
3. `--force`、`--apply` 和 `--dry-run` 不能绕过旧格式拒绝。旧 metadata 缺失但 repository-local profile 仍在时，同样拒绝；不建议通过删除身份文件伪装成普通工程接入。
4. 新 CLI 自身 metadata 损坏、schema 未支持或基线缺失时也不重新猜测所有权。仅报告诊断和恢复说明；首版无基线重建流程。
5. 普通已有业务代码仓库和独立管理仓库在无 Harness 家族身份时仍可 attach，符合 Q4；不是“旧实例迁移”。已有新版同家族 metadata 使用 sync，不重复 attach。
6. 错误说明可以指向新 CLI 的全新目录创建方法，但不自动搬迁业务产物、不转译旧基线、不将旧实例记录为已升级。

本节只限定两个新 CLI。既有 spec/dev/design CLI 的原有历史兼容范围不因 P2 被删去；它们继续保持自身行为和跨家族隔离。

## 7. sync 差异规则和恢复

不使用 LLM 自动语义合并合同、CONTEXT 或技能规则。以来源基线、本地内容、新模板内容做确定性分类：

| 情况 | 计划 |
|---|---|
| 本地等于基线，新模板变化 | 更新 |
| 本地变化，新模板仍等于基线 | 保留本地修改，记录未与模板相同 |
| 两边都变化且内容不同 | 冲突；整次暂停 |
| 两边变化后内容相同 | 对齐记录，避免假冲突 |
| 新增模板路径已被本地不同内容占用 | 冲突，不抢占所有权 |
| 新模板删除旧受管文件，本地未修改 | 显式列为删除，备份后随事务处理 |
| 新模板删除文件，但本地修改过 | 冲突，不静默删除 |
| 无可信可解释基线、未知类型或路径越界 | 停止并给出恢复说明 |

每次应用创建持久事务日志与备份。位置为 `.yss-harness-state/<family>/transactions/<id>/`，作为本地工具状态，不进入模板分发面；目标已有同名未知目录时不覆盖。日志记录计划摘要、原文件和 mode、创建项、删除项及 metadata 更新次序。

执行流程为 `preflight → plan → backup → apply → verify → commit`。普通失败自动恢复原文件、mode 与 metadata；中断恢复按事务日志识别。回滚失败保留恢复材料并清楚报告未恢复路径，不声称项目干净。成功后的撤销保留备份和恢复清单，依据 Q11，首版不增加独立 rollback 命令。目标中的项目验证脚本不作为自动执行来源；校验逻辑来自 CLI 包内的受信任快照。

## 8. 发布与旧入口退役

两包从 `0.1.0` 起，各自独立版本；拟用版本、npm 名称、维护者权限、Node 支持范围及实际发布渠道能力在实施预检中核实，当前不假定已可用。Node 支持范围应与核心及模板实际依赖取交集并通过 CI，不凭当前机器版本宣称支持。

正式分发按以下有序步骤形成证据：

1. 固定并验证公共核心；固定两个模板的 profile、分发清单和必要兼容调整。
2. 更新已有三个 CLI 的必要身份兼容，并执行五家族拒绝矩阵，保留原有能力。
3. 两个新 CLI 分别锁定已可获取的核心与模板完整提交，构建快照，执行回归。
4. 在回归结束后构建实际 tgz；核验包内容、摘要、许可证/来源及干净目录安装和初始化。会临时修改快照的测试不得与快照验收同时运行。
5. GitHub 子仓交付后更新父仓 gitlinks；每包 npm 发布单独执行既有发布授权流程，Q2 只是分发渠道决定，不是已经完成发布。
6. 确认新 CLI 可安装并完成 smoke test 后，旧仓内入口才切换为非零退出的退役提示，指向固定可用的新包版本与使用说明；旧实例不删除。源仓后续提交和文档同步另留可追溯记录。

新 npm 包的实例分发清单不包含仓内旧创建工具，避免让实例继续产生嵌套实例入口。旧入口退役属于源仓使用方式变化，不要求把尚未验证的来源提交写入已经构建的 npm 快照。

## 9. 实施顺序与可观察验收

以使用者可完成的路径安排工作，不仅按仓库或技术层横拆。各步都先有最小公开 CLI seam 和失败案例，再形成可验证实现。

| 步骤 | 可交付行为 | 关键验收 |
|---|---|---|
| A | 两包从固定模板创建新项目 | 无源仓 .git 可初始化；profile/metadata 正确；非法目标无写入；两包参数同形 |
| B | 业务代码仓与管理仓 attach | 预览只读、源码构建文件不变、同名治理文件不强占、身份混合拒绝 |
| C | 新 CLI 同家族实例首次 sync 与旧实例拒绝 | 新基线可消费；旧实例无论是否干净、摘要完整都拒绝且零写入；force 不绕过 |
| D | 同家族版本更新 | 三方差异与删除矩阵、冲突零写入、显式备份覆盖、并发修改、注入失败与中断恢复 |
| E | 程序升级与 npm 分发 | 更新程序不改实例；实际 tgz 安装、版本/摘要、源码不在场；两个 CLI 各自完整验证 |
| F | 生态兼容与退役 | 现有三个 CLI 无能力退化、五家族隔离、旧入口提示、新用户手册与包名一致 |

测试包含路径穿越、外部符号链接、gitlink、损坏/矛盾 metadata、未知 schema、旧实例格式/旧 profile、丢失基线、手改受管文件、备份失败、写入失败、验证失败、恢复失败和并发执行。只读命令须证明零写入；失败不能留下成功版本 metadata。真实包验收应覆盖前后端两种生成实例，必要的接力链路使用现有合成 fixture。

公共核心拥有共同测试；两个薄包各运行契约及真实包测试。前后端默认使用 pnpm 执行 Node 工具测试，npm pack 用于验证实际 npm 分发格式并记录具体命令和退出码。本次不运行产品 Maven 构建，也不把前后端业务覆盖率门槛误用于 CLI。

## 10. 确认状态与实施前置检查

设计 v1.1.0 依据“确认方案”及随后 P1—P3 的明确回复定稿；P2“旧实例不做兼容”覆盖早先 Q3 / Q10 的兼容决定。其余已确认范围及本文实现细节形成当前设计依据。grilling 的设计决策树已收敛，没有待用户回答的范围分支；不重复请求同版本、同范围确认。

实施前仍须完成工程事实核验：实际仓库位置与分支、CI、回滚点、npm 名称和权限、初始版本是否可用、Node 支持范围及源码来源新鲜度。这些是尚未执行的检查，不记录为已经通过，也不作为伪造基线的理由。若发现与设计冲突的事实，记录影响并只重新确认受影响决定。

本轮仅定稿设计、源码研究证据和用户确认记录。后续依第 9 节 A—F 顺序实施；设计确认不等于已经编码、测试、提交或发布。源码事实或已确认范围变化会使受影响部分需要更新版本和重新核对确认范围。
