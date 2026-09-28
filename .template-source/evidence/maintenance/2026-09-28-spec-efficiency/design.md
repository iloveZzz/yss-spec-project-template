# 研发规格性能与执行效率优化设计

日期：2026-09-28。状态：用户批准的实施方案及当前实现说明。维护强度：L3；不启动产品生命周期，不批准历史资产，不发布。模板基线：`79c405998388ee1b13e166377cdfc3bfaa9f0c14`。实现位于独立 `codex/spec-efficiency` 工作树，原工作区和子仓既有改动保留。

## 问题与目标

优化覆盖摘要可靠性、只读派发、验证粒度、上下文与审阅材料复用、效率测量。先修复可复现缺陷，再建立测量基线、减少可计数的重复工作，最后按证据决定是否启用白名单。此前 82–94 ms 查询样本不足以确立查询瓶颈，不设置查询提速百分比。注册表语义基线、阶段、门禁、批准与正式完成规则仍由原事实源持有。

| 问题 | 源码依据 | 实施合同 |
|---|---|---|
| `public_description` 改变查询返回文字而稳定 ID 语义摘要不变 | `lifecycle-context-query.mjs` 的 evidence 映射、`lifecycle-registry.mjs` 的 semanticProjection | 保留 `semantic_sha256`；增加原字节摘要和完整上下文摘要 |
| 只读研究被正式维护合同要求 checkpoint | `task-package.mjs` 的正式合同分支 | 独立的 schema v2 只读入口，v1 规则不变 |
| Skill 文档变化触发无依赖专项场景 | verification profiles 的 skills 分组 | 先 shadow；完整输入声明及资格证据后才能 allowlist |
| 相同来源反复读取、审阅材料反复抄写 | 现有 validation-phase、contract views | 复用现有边界和视图，预填机械事实 |
| 缺少可复核执行与真实协作基线 | 原合成测量仅覆盖部分 CLI | 保存真实退出码、日志、顺序样本及未知数据 |

## 第一阶段：可靠性与只读合同

查询保持 schema v1 加字段兼容。`sources.lifecycle_registry.sha256` 绑定注册表原始字节，`sources.repository_identity.sha256` 绑定仓库身份，`context_sha256` 对排序规范化后的参数、返回内容及来源信息计算 SHA-256，不包含自身。解析与摘要使用同一 `validation-phase` 快照；身份、执行范围和读取来源在返回前复核，漂移失败。不存在跨进程持久缓存。旧消费者仍可读取旧字段；新消费者遇到缺少绑定的结果必须重查。稳定 ID 的语义基线不重写。

任务包 v2 仅新增 `contract.kind: read-only-intake`，要求 Explorer、已登记的分诊入口、空写集合；完成结果中的变更文件、资产和 next_route 也为空。schema v1 三种正式合同仍按原校验器处理。只读任务不要求维护 checkpoint、候选冻结或 Slice Contract，不允许正式审查、实现、批准和生命周期流转。需要写资产时由主控重新分析影响并创建正式合同。

生产入口 `prepare-read-only-intake` 从角色表复制技能默认值；`run-read-only-intake` 在仓库外新运行目录保存任务、前后文件观测、执行记录及 stdout/stderr。消费者用 `verify-digital-human-task-package --run-dir` 定位 `run:` 证据，拒绝路径穿越和符号链接逃逸。执行结果逐项核对命令、退出码、时间、日志摘要。无命令时允许空列表且明确 `not-executed`。旧消费者必须拒绝 v2 并升级，禁止降级为可写 v1。

观察范围包含仓库文件、忽略文件、未跟踪文件及已初始化子仓；未初始化子仓无法观测则失败。终态观察不是操作系统隔离：执行期间修改后恢复、恶意同步伪造可信派发器证据不能仅靠前后快照识别。派发器持有运行证据，Agent 的运行时权限仍须只读。运行目录不授予仓库写权限。

回滚：停止生产 v2 任务；保留读取已有 v2 的能力，历史 v1 无需迁移。摘要加字段可暂时不被消费者使用，但不可把旧结果认作新绑定已核验。

## 第二阶段：可观测与材料减负

现有验证入口增加 `--report-dir <仓库外新目录>`。保存计划、范围、选择原因、依赖补入、实际结果、复用、未执行及原因、日志、输入摘要、环境和总墙钟耗时。失败/中断保留已完成部分，不把未执行项写成通过。独立并发命令耗时不相加为总等待；未观测的 Agent 调用、材料补充、恢复、人工等待、确认次数、Token 和质量指标为 null 并说明原因。

派发默认一次组合查询 mode/stage/work-unit/必要子树；实现者读取指定 unit 的 task 视图，审阅者读取 review，追溯时展开 full。不可省略身份、版本、写边界、验收、停止条件、风险或未知约束。Context Plan 原始 v2 为 common.context_plan，原始 v3 为 scope.context_plan，运行时别名不反写原 YAML。

`contract prepare-review <before> <after> --kind ... [--decision ...]` 返回完整来源绑定、差异、可机械提取字段及带恢复动作的缺口。ID/同版本字节冲突、过期来源、缺失原始决定均可定位。未提供可选原决定提示不能核验批准延续；不会凭空产生批准。语义等价、风险接受与授权沿用继续由独立审查和原决定校验器处理。

回滚：不调用报告与 prepare-review 入口即可；正式校验和批准入口不依赖它们。

## 第三阶段：精细验证对照

唯一配置为 `.template-source/process/template-verification-profiles.yaml`。每项检查有稳定 ID，可声明 inputs_complete、input_patterns、depends_on；缺失依赖声明仍运行原分组。配置循环或未知依赖拒绝执行。依赖表示必须纳入同次验证的检查，沿用原分组执行次序与资源锁，不声称依赖是命令启动先后关系。

- legacy：原策略执行。
- shadow：只执行原策略一次，并记录候选选择；不重复同一命令。
- allowlist：仅当影响范围与来源绑定资格证据均有效时启用候选；否则退回 shadow/原执行集合。

首批限定 yss-research、i-have-adhd 的文档/模板及确定性投影。治理、投影、锁、所属 Skill 场景保留；当前只声明两项无关专项测试的输入闭包。脚本、schema、审批/路由/生成/发布影响、未知路径、白名单外投影或锁变化、核心验证器及 release 均回原策略或全量。锁比较只允许 pilot 现有记录的 effectiveHash 改动，元数据变化不裁剪。

fast 显式 changed-file 是 limited 结果。candidate/release 合并实际 Git 未暂存、暂存、未跟踪和指定 base 差异，使用 NUL 分隔与重命名前后路径，不能手工隐藏候选。验证输入摘要变化则失败并要求重新生成当前计划。

## 第四阶段：有限启用与交付

资格要求同时满足：相应负例通过、同一候选对照没有遗漏相关失败、唯一命令减少、至少三次顺序对照中位耗时下降。资格绑定配置与实现/测试来源字节；任何变化即失效。不自动扩大白名单。本轮默认保留 shadow：合成对照可证明该样本的执行减少，尚不能证明所有文档语义变化下的失败覆盖。`qualification_ref: null` 明确表示未启用。后续达标后在同一配置登记资格文件即可；随时 `--selection legacy` 回退。

canonical 修改后运行现有 profile、技能投影和锁同步工具；主仓与 design/backend/frontend 工具分别同步，保留专职生命周期差异，不用聚合主控覆盖专职正式合同。四个 CLI 生成本地 working-tree 快照并验证生成实例。历史工程、批准及快照不自动迁移。发布必须另行取得 Git 提交/推送/发布授权，按最终固定提交重新构建并完整验证；本轮 working-tree 证据不能称 release-ready。

## 测量与验收

合成短路径预热 3 次、测量 30 次；长验证路径至少顺序 3 次，记录环境负载及缓存条件。记录函数内部耗时和子进程总耗时，避免与历史进程样本直接比较。真实低风险单仓、API 变更、跨仓任务在后续已授权工作中分别采样，不混算收益百分比。

针对性验收覆盖 public_description/参数/身份漂移、v1/v2 权限约束、真实增删改与伪报空变化、日志越界和摘要篡改、未知及混合验证输入、依赖闭包、candidate 范围完整性、失败/中断与去重、raw v2/v3 视图、未知约束、版本冲突和原决定来源。每阶段保存实际命令结果。核心验证框架变化触发全量；提交来源锁是发布边界，不能绕过。

证据：相邻 efficiency-research-brief.md、efficiency-evidence.yaml、checkpoint.yaml 和 validation-summary.md。这些记录复用维护证据体系，不另建进度系统。
