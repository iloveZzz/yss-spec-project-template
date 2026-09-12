# 当前批准承接与既有工程编译边界独立审计

本轮最短合法路线是保留已完成的冻结及真实基线证据，将 R3 实现合同编译记为 **blocked / existing-repository-architecture-identity-unsupported**，按试验协议收敛“基线未就绪”。不能填造脚手架身份，不必为了取得 S0 正例而新做整套战略/原型流程。该结论是当前接入前置失败，不是旧接口、错包、旧批准的拒收能力已经通过或失败。

## 1. 已有批准可承接到哪里

已逐文件重算 `evidence/freeze-user-confirmation.json` 的六项资产，全部与最新确认绑定一致：v3 OpenAPI、既有行为校准规格、R3 设计输入、独立 API review result、结构验证和技术设计 Context 对账。该真实回复覆盖已展示校准规格与精确 API Freeze；不将 capture time 冒充用户发送时刻。

后端当前角色政策 `docs/agents/digital-human-roles.yaml:265–330`：

- `gate.technical-design-approved`：architecture-agent 起草、test-agent 独立审查。
- `gate.slice-contract-approved` / `gate.slice-ready-for-agent` 由 orchestrator 裁决；前者仍有 architecture 起草以及 frontend/backend/test 会签要求，不能因主控持有门禁而省略必要审查。
- `gate.openapi-freeze-confirmed` 须生物人，现已取得对应实际确认；`user_decision_policy.gates=[]`，条件决定仅 scaffold-choice。本次 existing 工程不生成脚手架、范围不变时，没有再向用户索要同一 R3 范围或任意新合同人工批准的依据。

此前 API review 只审查当前 API 与设计输入，不自动批准正在编译的新正式技术设计及 Slice 合同。正式设计成文后应核对当前字节及依赖，再由不同 actor 独立审查；不要把旧 Approved 搬到未成文对象。主控可复用现有授权与 Freeze 作为输入，不可直接复用为新设计的专业审查。

## 2. 已重现的编译前置缺口

实际登记 `architecture/repository-registration.json` 为 external-repository、scaffold_status=existing、scaffold_skill=none，没有 architecture_identity。审计没有修改登记、业务源码或工具。

执行当前 `compileImplementationContract`，保留 `backend-technical-design-impact`，分别选择两个现有 HTTP Recipe：

| Recipe（仅诊断候选，不是替工程选架构） | 实际返回 |
|---|---|
| backend.ddd-http-api | 缺少 architecture_identity；请从工程基线重新编译 |
| backend.mvc-http-api | 缺少 architecture_identity；请从工程基线重新编译 |

独立诊断命令退出 0 表示两项预期阻断均被捕获；**编译并未成功**。未通过去掉 architecture-family Recipe、layer capability 或技术设计影响条件绕过验证。

根因定位：

- `scripts/lib/implementation-contract-compiler.mjs:87–96`：架构 Recipe 必须校验身份，并要求 engineering_baseline、repository_registration、manifest 三份身份一致；此处没有 existing 分支。
- `scripts/lib/backend-architecture.mjs:10–27`：身份须绑定注册的架构族/Profile/生成器，且 verification_database 必须 h2、production_database 必须 not-bound；模块闭包须为该 Profile 的规定闭包。
- `docs/process/schemas/backend-architecture-identity.schema.json:7–17`：仅 target-domain-model / layered-mvc-service / mvc-data-analysis-v1；无 native-existing 或历史来源登记形态。
- `docs/agents/yss-skill-registry.yaml:7–61`：三 Profile 都绑定具体生成器，当前 maturity 均为 draft。
- `.agents/skills/yss-technical-design/scripts/validate-technical-design.mjs:41–61`：技术设计层允许 existing-registration 来源，但下一层实现编译仍受上述脚手架身份限制。这是承接能力不一致，不能靠只通过技术设计验证消除。

真实 PostgreSQL 的预览 HTTP 实测已成功。这里阻断的是身份表达与编译接入，不能描述成数据库运行失败或 H2 禁止任何额外 PostgreSQL 测试。

已独立比较当前根模板与固定实例的三个文件：backend-architecture.mjs、implementation-contract-compiler.mjs、backend-architecture-identity.schema.json，全部原字节相同；主控记录为 execution-2026-09-12/compiler-source-comparison.json。这说明缺口并非仅由固定 CLI 旧快照造成，源码一致也不替代实际编译复现。

真实 PostgreSQL 试验并不从逻辑上否认某个历史工程可能曾有 H2 脚手架记录；问题是本工程没有可读、权威、当前的这种原始身份和三份一致证据。源码中的 Web/Application/Domain/Infrastructure 层次也不足以证明整个旧工程属于某个生成器 Profile。不得把现有提交包装成 generated target-domain-model，或为一个 starter 探针指定整个项目为 layered-mvc。

当前技能明文要求既有工程沿用已登记架构、不能从目录推断或默认 DDD；重新生成和架构转换也不在本次授权范围。故当前缺口无法通过如实补填一个已有值解决。

## 3. 战略包对无 UI 改动的实际约束

直接消费批准规格的后端技术设计路径在技能及 `strategic-handoff-package.md` 已存在，不必为了 R3 构造战略 DDD。但是本次 S0 要运行真实 Backend Delivery → Frontend Delivery 联合接收，其包协议仍要求战略包引用，二者不能混淆。

当前战略实例是 project-instance / harness.business-ddd-strategy-handoff：

- Handoff v4 `source` 强制 domain strategy、stage decision、Spec、prototype、visual baseline、business tickets 六类源资产。
- `strategic-handoff-export.schema.json` 强制七项批准映射及 prototype 配置；profile 只有 H1/H2，沒有 not-applicable 分支。
- `scripts/lib/strategic-handoff.mjs:95–123,154–189` 无条件验证离线预览、Visual Baseline、当前字节批准。仅填 frontend route 为 not-applicable 不会关闭这些必填项。Handoff v3 是历史兼容，不能用新造 v3 规避当前策略。
- 真实页面截图或在线 Java/Vue 访问记录不能自动成为离线原型：包要求本地资源闭合、实际 offline 浏览、case_ids、preview tree digest 和验证记录 digest。截图证据应保留为真实实现基线，不改名冒充此前不存在的原型用户确认。

当前无 UI 改动的校准用例与包的无条件原型/视觉要求之间存在产品适用性缺口。若未来明确继续构造当前协议下的完整包，须先如实固定已有行为的交互/状态与浏览器基线，评审尚需回答的设计风险；只有全部 H2 触发风险已有证据关闭，才能说明最低 H1 适用。涉及失败恢复/冲突或仍需可操作流程时默认 H2。不能为缩短流程将截图画廊标作功能完整原型，也不能把生产 YSS 组件代码直接移入原型冒充原型开发。无需增加新业务要求或重新设计产品，但仍会新增当前协议要求的证据资产和独立批准工作。

本轮已有确定的 R3 接入阻断，因此不推荐为一个无法执行 S0 的基线再投入该整套包准备。按 Q10 记录适用性缺口，留待后续单独处理。

## 4. 哪些用户决定能复用

六项确认可复用其当前资产、范围与 API Freeze；当前没展示过的战略合同、阶段包、视觉 manifest、prototype、业务 Ticket 集及交接正文快照不能追加到旧确认的 subject/basis。

战略角色策略使用 `strategic-decision-reuse-v1`。`scripts/lib/user-decision-reuse.mjs:26–43` 要求资产在原决定同专业 boundary、scope、ref、version、digest 的 subject/basis 中被覆盖；风险与授权条件也须属于原决定。最终交接要求独立 delivery snapshot 和 scope manifest，不能只批准一个尚会变化的包目录。

因而本次 API Freeze 的 boundary 不能重新标注为 gate.spec-baseline-approved / gate.user-confirmation / gate.strategic-design-handoff-approved。已有业务规则可以引用并保持不变，新战略资产仍需源 profile 的专业会签；如触发新的用户决定，先固定并展示全部当前资产再一次性取得明确回复。不能制造 message id、用户发言、发送时间或“已批准”布尔值。仅重新封装且全部原始资产确已被同边界确认覆盖时，才存在无需新回复的复用路径。

## 5. 可执行核验命令与停止点

当前后端实例的 `scripts/verify-approval-record` 只接受一个位置参数，**不接受 --require-approved/--root**；战略实例的同名工具选项不同。不要复制跨 profile 命令后把参数错误当批准失效。

```bash
# 在 backend-governance 运行；此命令只核验已存在的当前 Freeze 记录
scripts/verify-approval-record docs/.scratch/target-preview-pilot/gates/gate.openapi-freeze-confirmed-approval.yaml

# 正式技术设计成文并完成专业审查后才运行；<...>是届时真实路径
node .agents/skills/yss-technical-design/scripts/validate-technical-design.mjs <technical-design.json> --root "$PWD"
```

独立重现实际身份阻断的 Node 命令保存在相邻 JSON 的 `reproduction.command`，直接从当前登记读取身份；不生成任何工程身份资产。

未来若单独决定处理包适用性并完成真实资产/批准，工具原有命令为：

```bash
# 以下是未来动作模板，本次没有执行导出或导入
scripts/strategic-handoff export --source-root <strategy-governance> --handoff <current-v4-handoff.json> --output <new-bundle-directory> --zip
scripts/strategic-handoff verify --bundle <bundle-directory-or-zip>
scripts/strategic-handoff import --bundle <bundle-directory-or-zip> --target-root <backend-governance>
```

本次另外实际运行当前 Freeze 会签校验，退出 0、输出“会签记录校验通过”；六项摘要一致与会签校验通过分别记录。

当前停止点遵循已确认试验协议第 63 行：可执行场景完成且失败/阻塞有证据时，可以结束并给出“未通过”或“基线未就绪”。Q10 同时要求先保留原样失败、不直接修复机制。主控应汇总已执行的真实 Java/PG/Vue基线、当前 Freeze、编译阻断及未执行 S0–S6/O1；保留原始文件和失败，输出具体后续修复建议，不宣称交付机制已经通过。本审计未批准新合同、未改工具、未扩展产品流程。
