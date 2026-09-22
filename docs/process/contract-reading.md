# 合同阅读、准备与显式迁移

本文件描述工具入口；阶段、批准和执行门禁仍由 `docs/process/lifecycle-registry.yaml` 及资产所有者定义。YAML 是权威文件，视图不能编辑、批准合同或授予执行权限。

```sh
scripts/contract view <资产> --kind <类型> [--profile review|task|full] [--unit <ID>] [--json]
scripts/contract diff <旧资产> <新资产> --kind <类型> [--json]
```

默认 `review` 展示目标、非目标、验收、取舍、风险及未决事项，隐藏机器摘要明细，不附带折叠完整 JSON。`task` 保留适用工作单元、执行目录、写边界、Skill、验证、证据和未分类约束；Slice 必须明确 `--unit`。`full` 读取完整权威内容与绑定。三种视图均显示权威身份、版本、完整 SHA-256 和检查范围。批准有效性未核验；执行仍使用原预检和派发入口。来源未提供风险或取舍时明确标记缺口，不推断为无风险。

| 类型 | 资产组 | 阅读后的权威处理入口 |
|---|---|---|
| `plan`、`spec` | Plan、Spec 范围、用户决定 | 生命周期和用户决定校验 |
| `product-design`、`prototype-confirmation`、`visual-baseline` | 产品设计、确认、视觉基线 | 产品设计所有者校验 |
| `technical-design` | 技术设计 | 技术设计校验与生命周期批准 |
| `api-decision`、`data-decision` | API / 数据决定 | 对应决定校验、工程契约批准 |
| `scaffold`、`scaffold-decision` | 脚手架合同、架构选择 | 脚手架所有者及原始用户决定 |
| `slice` | Slice 与工作单元 | `scripts/slice-contract inspect`、原批准与派发 |
| `handoff`、`backend-delivery`、`frontend-acceptance` | 战略交接、后端交付、前端接收 | 对应包 / 交付 / 接收验证器 |
| `approval`、`user-decision`、`context-reconciliation` | 会签、原始回复、Context 对账 | 原批准 / 用户决定 / Context 校验 |

通用适配器保留未知字段，只做可读取、适用 schema 和可识别来源绑定核对；不支持结构核验的类型会明确标记。专用资产所有者的业务校验并未被通用视图替代。Markdown 正文完整保留。API v2 审查结果从绑定的实际记录展示。摘要字段变化、数组顺序和纯字节变化均在 diff 中保留，不据此自动认定批准可沿用。

## 准备机器字段

Slice 继续使用 `scripts/slice-contract prepare`。来源的原始字节摘要、版本、别名、Skill 闭包和验证映射由现有准备器生成。共用的 `scripts/lib/contract-source.mjs` 只读取明确选择的来源；冲突报告保留 supplied / observed 和恢复动作，不根据目录猜测授权。其他资产继续使用各自的生成器，不新增项目人员要维护的表单。

API 决定的新结构使用独立 v2 schema，v1 schema 和读取兼容保留：

```sh
scripts/api-contract-decision prepare <来源选择.yaml> --output <新草案.yaml>
scripts/api-contract-decision migrate <已批准v1.yaml> --version v2 --output <新候选.yaml>
```

准备输入包括决定 ID / 版本、影响、评估引用、证据和业务原因；有 API 影响时再给 `openapi.id/ref/version`、`validation_record.ref`、`draft_review.ref` 和 `freeze.version/frozen_at`。摘要自动生成；来源明确但缺失时报告缺口。准备器不能产生批准状态。新路径以排他方式写入；已存在路径不能覆盖。

v2 的 `openapi` 是唯一 Draft 绑定，`draft_review` 只存 `ref/digest`，Freeze 只保存版本和时间；实际结果、阻断项与 Draft 来源从真实审查记录读取。v1/v2 在消费时归一，外部永远绑定原文件 SHA-256。迁移先验证完整 v1，旧审查额外证据合并到顶层，旧文件与旧批准保持原字节。新候选按既有差异及授权延续协议处理，不继承批准。

## 验证阶段与回退

预检、准备、派发各自建立私有验证阶段。阶段绑定根目录、用途、切片、工作单元、只读状态；只在本次操作内共享输入和纯校验结果。原始输入不可变，返回给调用者的是独立副本。相同 schema、输入和格式选项复用；外部 `$ref` 未追踪的校验不享受结果复用。Python 引擎、同步 API 和技术设计 Node 边界保留。

成功返回前复核所有登记原字节、目录枚举及不存在项。技术设计子进程自行验证批准，再返回依赖清单；父进程合并读取集合，读取矛盾、遗漏报告或异常均阻断。此清单不是批准上下文。品牌上下文不能序列化、跨仓或从只读升级；在阶段中生成的上下文结束后失效。调用者可传入 `AbortSignal`，已收到的撤回事件须中止当前操作；下一次边界始终重新读取当前批准和回复。未接入读取追踪的消费者保留原检查，不共享结果。

P1 可回用原 `slice-contract` 阅读入口；P2 可回退阶段调用与本次改动的读取适配，恢复完整重复检查；P3 可停止创建 v2，但已生成 v2 的读取能力必须保留。回退后重新验证当前来源和批准，不恢复历史通过状态。
