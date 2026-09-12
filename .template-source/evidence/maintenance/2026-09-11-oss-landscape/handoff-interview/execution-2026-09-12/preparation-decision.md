# 真实交付试验前置补齐：具体待决定范围

日期：2026-09-12。状态：前置核查与可执行准备已完成，真实试验尚未运行；本文件请求处理 Q12 指定的接入、契约与探针缺口，不重复确认已接受的 13 项试验范围。

## 已执行的工作

已经在临时隔离区建立两份独立 Git 副本，分支均为 `codex/target-preview-pilot`：

| 副本 | 固定提交 | 已核验状态 |
|---|---|---|
| backend | `714fd4223d202b29c410d4d5533913e44874b3f1` | 干净，未纳入原工作区改动 |
| frontend | `76f2d1627f797d5b12a99c48cf49125544933b18` | 干净，未纳入原工作区改动 |

真实路径由 [isolated-checkouts.json](isolated-checkouts.json) 的 `physical_checkout_root` 给出，父目录为 `/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-preview-pilot-20260912-0k_x_zmm`。它是临时目录，若系统清理，只能依据两个固定 SHA 重建，不能换用变化后的工作区。

33 个预览相关文件与提交字节一致；已有源码支持 `CURRENT/ALL`。当前约束来自接入、批准与部署证据，不需要为了证明候选存在而混入上传整改。详见 [baseline.md](baseline.md)。

现有模板场景 `scripts/verify-frontend-delivery-scenarios` 已运行：9 tests，9 pass，0 fail，退出码 0。[日志](template-delivery-baseline.log)对应 Synthetic Supplier 维护用例，不能算成真实预览试验的 S0–S6。

## R1：创建独立治理目录，登记隔离源码

**建议批准的动作**：仅在上述临时隔离区创建 `strategy-governance`、`backend-governance`、`frontend-governance` 三个项目实例治理目录，并将 `backend`、`frontend` 两份源码副本作为现有 `external-repository` 登记。不生成业务脚手架，不改变既有架构，不将产品资产放入当前 template-source 仓库。

选择这一布局有实际预览依据：

- backend 直接 attach dry-run 退出 1，冲突为 `.gitignore`、`README.md`；已有 CONTEXT 被保留。
- frontend 直接 attach dry-run 退出 1，拒绝 `.claude/skills/component-selection-imports/.git` 的符号链接。
- 改为独立空目录 init dry-run：三套 CLI 均退出 0，目录没有被创建。后端预览 4001 个新增受管文件，前端 4868 个；不是两三行身份修改。
- 首次使用 `/var` 路径因 macOS 符号链接被 CLI 拒绝，改为真实 `/private/var` 路径后复查；没有绕过符号链接检查或使用 `--force`。

完整计划见 [attach 预览摘要](attach-preview-summary.json)、[专职治理 init 预览](separate-governance-previews.json)、[战略 init 预览](strategy-governance-preview.json)。这些结果只证明可以生成计划，不证明三个项目实例组合已运行通过。

使用已检出的本地 CLI 与其固定模板快照，不调用浮动 npm latest。后端 CLI 0.2.2、模板 `aab3a709b96e4d8309e33bbf451156ae5abad05a`；前端 CLI 0.1.4、模板 `204e0e0d95ba7d721aca7633b8417a90d0dd1e61`。战略 CLI 0.5.2 的固定模板以其当前 snapshot 为准，执行前复核。治理目录不初始化或发布远端仓库。

**验收与恢复**：身份、词汇对账、仓库登记与当前 CLI metadata 正常校验；后端/前端已有业务源码及原仓不变；接收方只消费自己的源码与交付包。失败保留事务/初始化日志，仅清理本次明确创建的治理目录，不 force 接管旧文件或删除源仓技能链接。

## R2：整理语义一致的 OpenAPI 3.1 候选及真实批准材料

**建议批准的动作**：在 R1 的后端治理目录内起草与已选源码行为一致的 3.1 契约和批准材料，保留手写 3.0.3 及前端生成 3.1.0 快照的来源摘要和差异映射。接入后由正常生命周期完成审阅、Freeze 与必要切片/交付批准；本次补齐范围授权不代替这些门禁。

具体差异已查明：

| 项目 | 当前来源 | 候选应保留的行为 |
|---|---|---|
| scope | 后端手写稿可省略、默认 CURRENT、枚举 CURRENT/ALL；前端生成稿 required=true 且未表达同等默认/枚举 | 以已选源码的可省略/default CURRENT 为依据，完整表达 CURRENT/ALL，并以真实 Controller 测试确认 |
| 空值 | 手写稿有 5 个 `nullable: true` 关键字；另有业务布尔属性也名为 nullable | 对 catalog、schema、comment、value、byteLength 保持可空语义；保留业务 nullable 属性，不能全局替换关键字字符串 |
| 响应 | 生成稿仅有 200 和通配媒体类型；手写稿还有稳定失败语义 | 保留经验证的成功/失败状态与响应体，不把生成稿视为自动等价 |
| 批准 | Markdown 写 Approved，但引用的 `.scratch/file-sync-target-data-preview/DESIGN.md` 不可读；未找到当前字节绑定批准 | 记录缺失，重新形成准确的当前批准输入；不复制 Approved 字样或生成假历史批准 |

首次文本统计把业务字段也计入，因此出现“6 处 nullable”的中间描述；结构核对已纠正为 **5 个可空关键字＋1 个业务属性**。不据中间计数修改契约。

**允许写入范围**：新治理目录的 API/追踪/审阅资产与本试验证据；如需重生成前端客户端，先展示仅预览 operation 相关的生成差异，不能批量改变无关 API。若真实实现不符合选定行为且必须修改业务功能，仍按 Q8 停下重新选样。

**验收与恢复**：3.1 结构、参数默认/必填性、可空值、成功/失败响应与原行为等价并有真实执行证据；批准绑定精确字节。候选失败只撤回未批准草案或生成差异，不改原契约历史。

## R3：在隔离后端增加仅试验档位启用的部署身份探针

**建议批准的动作**：在隔离 backend 副本内按 [environment.md 的具体方案](environment.md)起草并实现同一 Java 进程的只读身份入口，默认业务运行档位不启用。它是本次新增范围，尚未实现。

拟议路径限定为：

- `valuation-outsourced-starter/src/main/java/com/yss/datamiddle/valuation/delivery/DeliveryIdentityController.java`
- 同目录 `DeliveryIdentityProvider.java`
- 对应 `src/test/java/.../delivery/` 测试
- `valuation-outsourced-starter/pom.xml` 的独立试验 profile
- `scripts/pilot/build-delivery-identity`、`scripts/pilot/launch-delivery-trial` 及其专属输出

拟议 GET `/internal/delivery-identity` 提供五项来源明确的值：源码 commit 来自固定构建；OpenAPI 摘要来自实际打包契约；产物摘要计算实际最终 JAR；部署 ID 绑定本次启动进程；数据摘要绑定合成数据、schema 与实库读回基线。最终 JAR 摘要不嵌回同一 JAR，避免自引用。不得回显交付包期望值充当事实，也不得用独立 Node 假服务通过校验。

加探针后隔离源码会相对原提交产生本轮补齐差异，必须另存逐文件摘要及完整源码树/构建证据；原 SHA 只能表示基础提交，不能冒充新探针已在原提交中。必要实现合同应明确这一来源关系，若下游只接受不可变提交，则在获得单独 Git 提交授权前停下，不伪造 source_commit。

**验收与恢复**：缺字段、错 JAR/契约/数据均不可被当成有效身份；默认档位不暴露探针；同进程探测结果与独立构建/数据记录一致。回滚只撤销隔离副本中的本轮路径并停止登记的试验进程，保留原失败证据。

## 环境与试验范围仍沿用已确认约定

真实环境为隔离 PostgreSQL、必要的独立 Redis/既有本地档位、真实 Java 和 Vue、合成数据。Java 8、pnpm 10.15.0 等工具版本已核查，但依赖、Docker daemon、实际数据库与完整 starter 尚未验证。配置不得连接共享生产/测试资源。开发 mock 不能供给本次预览结果；实际网络响应须可关联 Java 服务。`FILE_SYNC_ENABLED=false` 会关闭 Controller，不能用它制造可用假象。

源码字符串断言、版本探针和模板 9 项维护测试各有边界，均不能替代真实浏览器与 API 验收。S0 正例未通过时不运行三类故障来凑通过结果。遇到 Q10 所指机制缺口仍先保留原样结果，修复另行决定。

## 本次决定的范围

请求允许执行 R1，以及在隔离环境内推进 R2/R3 的准备、审阅与所需实现；已有正常门禁仍按真实当前资产处理。该授权不包括原业务仓改动、Git 提交/推送、发布、绕过 API/切片批准或使用真实业务数据。

如果仅批准其中一部分，其余依赖仍保留阻塞。完整试验目标尚未达成，不以“准备完成”宣称“跨仓交付闭环已通过”。
