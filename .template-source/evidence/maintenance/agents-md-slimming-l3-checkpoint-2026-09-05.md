# AGENTS.md 瘦身 L3 Checkpoint 与语义追踪

本记录把精简前工作树中的入口规则逐节映射到精简后的常驻句或权威下沉资产；它是本次 L3 自检证据，不定义新规则。

- 目标状态：`implementation-ready`
- 当前状态：`implementation-ready`
- 维护强度：L3；已完成维护者自检与 fresh verification，不替代正式发布前的人工会签或 Git 授权。
- 范围：根模板、战略设计模板、战术设计模板及其 CLI 分发链；`.agents/rules/yss-ai-skills.md` 与 `.cursorrules` 同步改为薄路由。

| 节 | 必须保持的行为 | 精简后承载位置 | 结论 |
|---|---|---|---|
| 1 | 先读 `yss-project.yaml`；区分两种仓库身份；非法身份停止且不猜测 | `AGENTS.md` 第 1 节 | 保留 |
| 2 | 事实源唯一；注册表是权威、Markdown 地图是派生视图 | `AGENTS.md` 第 2 节及所列 canonical 路径 | 保留并压缩 |
| 3 | 中文文档、技术标识原样；根唯一 `CONTEXT.md`；术语先登记；统一引用；每工作单元 `context_reconciliation`，异常阻断 | `AGENTS.md` 第 3 节；格式细节由 `CONTEXT.md` 文首合同承载 | 保留并下沉细节 |
| 4 | L1 / L2 / L3；canonical Skill 与投影隔离；三级模板验证；外部 CLI 集成未闭合不可发布 | `AGENTS.md` 第 4 节；强度细节见裁剪文档与维护策略 | 保留并下沉细节 |
| 5 | 先裁剪再编排；命中门禁 mandatory、未命中才 N/A；不造安全专项；Discovery、OpenAPI Draft / Freeze、Spec Delta、窄垂直切片、`seam-deferred` | `AGENTS.md` 第 5 节；对象关系见注册表，导航见派生地图 | 删除全景表，保留硬门禁 |
| 6 | 父 Ticket；`ready-for-human` / `ready-for-agent` 边界；主 tracker 不从 remote 猜；平台不可用生成草案 | `AGENTS.md` 第 6 节；状态细节见 tracker 文档 | 保留 |
| 7 | 实现仓登记；合同先行且编译器无批准权；受控脚手架；新增架构选择、schema v3、无交互、禁止覆盖；UI 双证据；`pnpm` / `./mvnw`；异常熔断 | `AGENTS.md` 第 7 节；字段与 schema 见接入文档和编译器 references | 保留并下沉细节 |
| 8 | YSS 研究证据；竞品入口；原型不得使用 `yss-ui`；数字人不得越权；`behavior-tdd` 与例外证据 | `AGENTS.md` 第 8 节；通用技能发现下沉到 Skill 注册表和编排合同 | 保留 YSS 专项约束 |
| 9 | 三种 repository scope；当前仓承载实现须用户选择；禁止单数 `app/`；gitlink / detached / force 边界；不得复制源码冒充 submodule | `AGENTS.md` 第 9 节；登记字段见接入文档 | 保留 |
| 10 | 实现与审查隔离；finding 闭环；Fresh Verification；会签和生物人边界；checkpoint 与 Git 授权；复盘触发 | `AGENTS.md` 第 10 节；会签细节见角色表 | 保留并合句 |
| 11 | 任务包、角色 / 运行时 / 执行态、写隔离；共享工作区不是安全边界；主控保留裁决权 | `AGENTS.md` 第 11 节；任务包 schema 见协作文档 | 保留并压缩 |
| 12 | 覆盖率只是模板推荐；项目实例明确采纳才形成 CI 门禁；无关键流程清单不得称 100% E2E | `AGENTS.md` 第 12 节 | 保留 |

## 自检结论

- 精简前工作树：20,357 bytes / 133 行。
- 精简后：8,418 bytes / 92 行，字节减少约 58.6%；为保留强指针，按已确认的“语义优先”原则允许略超 8 KiB。
- 根 `.agents/rules/yss-ai-skills.md`：5,597 → 785 bytes；根 `.cursorrules`：2,211 → 535 bytes。两者只保留运行时入口、权威注册表和高风险 UI 红线，不再复制技能目录。
- 战略设计 `AGENTS.md`：13,161 → 7,318 bytes；仍以 `harness.business-ddd-strategy-handoff` 结束，不创建 Tactical / OpenAPI / Slice / 代码资产。
- 战术设计 `AGENTS.md`：精简前工作树 14,990 → 9,109 bytes；入口已校正为 `harness.dev-agent-slice`，并新增可执行入口对齐检查。其 `.agents/rules/yss-ai-skills.md` 为 767 bytes，`.cursorrules` 为 580 bytes。
- 12 节分类索引保持不变；生命周期阶段数量不写入常驻上下文。
- 第 4 节改写不再依赖生成器整句匹配；项目实例转换改为稳定章节边界并在边界缺失时失败。
- 战略项目继续不分发 `.agents/rules/yss-ai-skills.md`；其 verifier 明确禁止该文件，避免把实现期 UI 规则带入战略阶段。
- 根与战术规则文件均增加 anti-regrowth 校验，禁止重新嵌入 `Available Skills` / `Mandatory Workflow` 大段清单；Cursor 路由同时拒绝已退役的物理 alias 路径。
- 未发现被删除且无常驻句或 canonical 指针承接的硬门禁。

## 验证结果

| 验证 | 结果 | 说明 |
|---|---|---|
| 12 节、15 个指针、11 个红线 marker 结构检查 | PASS | 8,418 bytes；所有指针目标可读 |
| `node scripts/node-verify-lifecycle-registry.mjs` | PASS | 生命周期派生关系无漂移 |
| `node scripts/verify-template-verification-scenarios` | PASS | `AGENTS.md` 仍触发 release profile |
| `node --test .agents/skills/yss-mvc-scaffold-generator/scripts/lib/envelope.test.mjs` | PASS | 章节转换与 fail-loud 共 2 个测试通过 |
| 实际 `AGENTS.md` 项目实例转换 | PASS | 模板维护命令未泄漏 |
| `scripts/sync-skills --check`、`scripts/update-skill-lock --check` | PASS | canonical、投影、lock 当前一致 |
| `git diff --check`（本次路径） | PASS | 无 whitespace error |
| 根 `scripts/verify-template --changed-file ...` | PASS | release profile 全组通过；含 Skill 投影、生命周期、脚手架、治理与 candidate integrity |
| 战略设计 `scripts/verify-template --changed-file AGENTS.md` | PASS | release profile 通过；含入口、profile、实例分发和生成场景 |
| 战术设计 `scripts/verify-template --changed-file ...` | PASS | release profile 通过；新增 `scripts/verify-entry-alignment` 已纳入发布基线 |
| 三条 CLI 定向初始化测试 | PASS | `create-yss-spec`、`create-yss-strategic-design`、`create-yss-harness-dev` 生成结果均包含精简入口 |
| `create-yss-spec` 同步回归测试 | PASS | 8 个测试通过；本地工作树已删除的 tracked 文件或投影不会再使同步崩溃 |
| 源模板与 CLI 快照逐文件比对 | PASS | 根、战略、战术本次入口及 verifier 文件均一致 |
