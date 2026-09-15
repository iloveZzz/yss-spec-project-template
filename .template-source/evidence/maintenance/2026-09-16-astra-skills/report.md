# GPT-6 Astra Skill 优化结果

已完成本体、3 个 Agent 子项目与 4 个 CLI 的本地优化及验证。当前状态为 **implementation-ready**；所有 CLI 快照明确为 `working-tree`，没有提交、推送或发布。

## 设计依据与范围

依据 [OpenAI Astra Skills 指南](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) 和 [Codex Skills 文档](https://developers.openai.com/codex/skills)，选择精确触发、短入口、按需参考，并明确授权内的完成范围。研究、反证与局限见 [研究简报](astra-research-brief.md) 和 [来源记录](astra-evidence.yaml)。

审计共 335 个入口，含各仓副本及登记的平台子技能；不包含用户全局 Skills。未调整的入口保留其任务边界和工作流。共享与平台专属清单分别见 [共享入口审计](audit.json)、[平台入口审计](platform-audit.json)。

| 仓库 | 审计入口数 | 描述字符数：调整前 → 后 | 减少 |
|---|---:|---:|---:|
| 本体 | 119 | 23,268 → 11,834 | 49.1% |
| 后端 Agent | 75 | 11,909 → 7,530 | 36.8% |
| 战略 Agent | 35 | 6,546 → 3,829 | 41.5% |
| 前端 Agent | 106 | 20,282 → 11,104 | 45.3% |

上述为 Unicode 字符数，不是 token、延迟或模型成功率测量。

## 具体调整

- 精简本体 38 个共享 Skill 描述，并按 Profile 同步；收窄三个仓共 55 个平台专属入口描述。仅因目录相同而保留的 Profile 差异继续独立维护，未用本体正文覆盖。
- Lombok / MapStruct 从 352 / 335 行入口调整为 26 / 28 行。YSS 合同和风险仍在入口，详细例子放到条件参考；移除固定不可用 MCP 指令及过时的外部 Skill 跳转。
- 修复 MapStruct 全局 `IGNORE` 与字段完整性约束的冲突；修正 Lombok binding 配置说明，移除直接记录邮箱和敏感请求对象的示例。
- `maintaining-skills` 增补按需作者指引；四个 Harness 的 `AGENTS.md` 明确持续完成已授权维护；本体维护文档对齐当前 L2 自检和 PR 验证政策。
- 57 个显式调用入口已有正确 Codex 策略，保留原样。没有删除 canonical、兼容入口或生成投影，也没有更换模型、提升推理档位或安装插件。
- 更新 Profile 补丁的源树摘要，重放差异；通过既有脚本同步投影、锁文件和四个 CLI 快照。

## 验证

| 对象 | 本轮验证 | 结果 |
|---|---|---|
| 本体 | `scripts/verify-template-fast`，因 AGENTS.md 变化自动升级完整 release profile | 通过（fresh verification） |
| 三个 Agent | 各自 fast 核验；最后的元数据调整后再核验 registry、governance、projection、lock | 通过 |
| 综合 CLI | `pnpm test:prepared` | 183 / 183 通过（fresh verification） |
| 后端 CLI | `pnpm test:prepared`、`pnpm verify-bundle` | 家族端到端通过（fresh verification） |
| 战略 CLI | `pnpm test:prepared`、`pnpm verify-bundle` | 家族端到端通过（fresh verification） |
| 前端 CLI | `pnpm exec node --test --test-concurrency=1 tests/*.test.mjs`、`pnpm verify-bundle` | 2 / 2 通过（fresh verification） |
| 跨仓分发 | 544 个关键文件与当前来源逐项比对，检查 blob 摘要和来源状态 | [通过](delivery-result.json) |
| Profile | `scripts/sync-profile-skills --check --profile=all --json` | [零差异、零问题](profile-final.json) |
| 作者结构 | 335 个入口元数据、57 项显式策略、参考链接和已修复冲突 | [通过](optimization-result.json) |
| 研究包 | `validate-research-package.mjs` | 4 个结论、7 项证据通过 |

综合 CLI 既有生成逻辑会从实例 AGENTS.md 去掉模板维护章节；分发验证按该转换比较，Skill 文件按原始字节比较。家族测试覆盖真实初始化、接入、诊断、只读操作、同步、恢复和身份边界。

### 本轮失败与闭环

1. 我在一次本体核验期间继续编辑，触发工作树只读保护。保持实现与快照稳定后重跑完整核验，通过；没有绕过保护。
2. 前端初始化在早期并发验证中触发 120 秒超时。串行重跑同一测试约 40 秒通过，完整前端套件随后通过；未增加超时或修改测试断言。并发资源竞争是可能原因，未作独立性能诊断。
3. 再次同步本轮生成的 Lombok 参考时，Profile 工具拒绝已有未提交目标。先以本轮前次 CLI 快照摘要核对目标，再更新该单个已生成文件；随后 Profile 零差异检查通过。

## 状态和限制

- 本轮是模板文档、发现元数据和条件示例调整，不改业务运行时代码；按 L3 维护自检和实际验证执行，不另建产品 Ticket 或业务 TDD 切片。`context_reconciliation` 对模板维护为带原因的 not-applicable。
- 人工核对的触发与排除场景写在研究简报；没有运行独立 Astra A/B 评测，不宣称模型正确率改善。
- 完整核验输出中的 `release` 是执行强度，不代表 CLI 已绑定新提交或获得发布授权。后续 Git 交付仍须先提交来源、再从完整 SHA 重建 CLI，最后更新父仓 gitlink。

可复查脚本：[入口审计](verify-optimization.py)、[分发比对](verify-delivery.py)。脚本仅供本轮维护证据复查，不进入实例运行时。
