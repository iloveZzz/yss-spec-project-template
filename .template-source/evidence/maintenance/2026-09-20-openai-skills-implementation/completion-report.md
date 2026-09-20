# Skills 规范优化实施交付

本地整改、受影响分发同步和重点行为评测已完成。117 项审计身份保持不变：25 项优先修正、50 项优化逐项落实；42 项保留技能只做必要依赖同步与失效链接修复。没有退役技能、创建产品 Spec/Ticket、修改业务工程代码、提交、推送或发布。

**固定来源交付尚未闭合，不能声明可发布。** 四个 CLI 当前均为工作树开发快照；全量模板检查仍被战略上游未固定提交的摘要门禁阻断，检查器和真实来源值均未放宽或伪造。

## 分阶段结果

| 阶段 | 本地交付结果 | 证据 |
|---|---|---|
| 0 基线 | 复核 295 个实际入口、117 个逻辑技能和 8 仓工作区；L3 分级；记录 75 项对象、场景、回滚范围 | baseline.json、implementation-ledger.json、intensity-check.json |
| 1 来源与同步 | 活跃 excluded 纳入 exact/patch；角色保持 local_only；平台包完整登记；新增实际入口覆盖、计划文件引用、缓存排除与重复同步反例 | profile-final-check.json、profile-tests-final.log |
| 2 授权与角色 | 修正自动提交/全暂存、Ticket 状态、兼容入口资产所有权、战略路由、原型 v4/check ID、Context 布局及只读 Reviewer 边界 | 逐项清单及场景 01—06、15—16 |
| 3 专业技能 | mutator 单一错误提示与 loading、Formily 名称/必填、分页/选择、Boot 2/3 源码边界及条件化验收一致 | 场景 07—10、平台/脚手架既有检查 |
| 4 平台扩展 | 状态 resolver 与文档一致；inline/local/native 分流；静态原型保留素材；DOCX 计划不默认上传；工具发现和共享范围不写死 | 场景 11—14、focused-final-checks.json、sharing-scope-probe.json |
| 5 渐进披露 | 详细方法与示例移条件 reference，触发前置；固定行数/次数改为适用条件。批准、写路径、合同失效等关键不变量保留 | 75 项 resolution_detail、retained-skill-accounting.json |
| 6 综合验证 | 实际工具轨迹、产物和自动断言独立记账；四源与四 CLI 同步检查和安装/初始化/同步测试完成；固定来源待办单列 | 本文验证表、agent-evaluations、fixed-source-delivery.md |

三个子项目原锁过期已在基线副本复现：后端 9 项、前端 2 项、战略 1 项 `effectiveHash` 未随内容更新，非 source revision 变化。现已重新生成并校验，维护说明补齐“正文→投影→锁→稳定快照→测试”顺序。

## 实际验证

| 检查 | 结果 |
|---|---|
| 入口 frontmatter 与实际 Markdown 本地链接 | 295 项通过；不将示例代码当真实链接 |
| Profile 同步与反例 | 第二次无差异；17 项测试通过 |
| 四源 Registry / 投影 / 锁 | 全部通过 |
| Data Analytics | 18 个 preflight 入口、29 项状态辅助测试通过 |
| DOCX 计划 / 评测器 | 5 项输出边界、4 项评分与证据保护测试通过 |
| 报告辅助服务与分享范围 | 65 项现有测试通过；实际本地导出及生成提示的补充检查通过 |
| 四个 CLI `pnpm test:prepared` | 全部退出 0；包含各自临时安装、初始化、同步和边界验证 |
| 全量 `scripts/verify-template` | 85 项检查中 84 项退出 0，`verify-skill-governance` 因战略 upstream hash 漂移退出 1 |
| 工作区 | 8 仓 HEAD 未变；`git diff --check` 全部通过 |
| 真实 Agent | 16 场景 × 2 版本 × 2 次，共 64 次；统一评分后基线 32/32、候选 32/32，语义审阅通过；关键违规与无关追问均为 0 |

真实 Agent 使用相同的 Codex 运行时、`gpt-6-astra`、`high`、场景提示和 fixture，每侧每场景串行 2 次。完整轨迹、命令、产物、语义审阅与可取得的 token/耗时指标见 [评测汇总](agent-evaluation-summary.json)。不把模型自述当作证据。

基线原始自动结果为 29/32；两条战略路由解释含旧技能名被过宽断言误判，另一次合法返回新查询对象被“必须原地修改”断言误判。依据任务文本修正两条判定规则，对两侧统一评分，基线为 32/32。原始结果完整保留，没有为挑选成功样本重跑模型。因此本轮不声称成功率提升，效率指标仅作观察。

本次效率观察如下；两次重复和同期结构检查不足以作性能因果结论，候选没有显示耗时、调用次数或 token 降低。

| 指标 | 基线 32 次 | 候选 32 次 |
|---|---:|---:|
| 工具调用 | 213 | 220 |
| 中位耗时（秒） | 65.47 | 73.36 |
| 总耗时（秒） | 2125.99 | 2219.40 |
| input tokens（含缓存） | 4,058,727 | 4,790,279 |
| cached input tokens | 3,384,192 | 3,995,776 |
| output tokens | 40,323 | 42,517 |

## 边界与复盘

- Agent 评测针对冻结候选。冻结后仅追加末尾空行清理、维护顺序说明及分享范围输出修正；9 处文件差异与补充验证见 candidate-delivery-equivalence.json，没有把新内容混入已经完成的轨迹。
- 16 个场景是重点行为覆盖，不代表全部 117 项技能的所有隐式触发、前后端运行时、浏览器视觉或云端原生格式均完成认证。静态原型场景的浏览器缺口如实保留；平台场景验证 fixture 源码选择，不代替真实 Boot 构建认证。
- Git/网络/包管理器使用 fixture 替身，但部分 login shell 会重写 PATH，宿主也可能保留其他能力元数据。审阅覆盖完整工具轨迹，而非只看替身日志；本轮未发生真实提交、上传或发布调用。
- 两次验证曾与快照重建交叉，分别出现摘要变化和旧 blob 不存在；已保留失败，并在稳定输入下重跑通过。详情见 verification-input-races.json。
- 维护者自检与实际通过证据已保存；由于固定来源门禁未闭合，不签发 release-ready，也不伪造能够掩盖该阻断的绿色 checkpoint。

## 下一交付批次

仅在取得提交、推送授权后：固定战略来源 → 更新父模板来源清单/锁及薄适配 → 固定父模板和 Agent 最终来源 → 用最终完整 SHA 重建四 CLI → 固定来源安装/初始化/同步与完整发布检查。主 CLI 的默认来源常量也必须更新。npm 发布和部署另行授权。操作顺序与验收清单见 [固定来源交付待办](fixed-source-delivery.md)。

逐文件摘要与局部恢复规则见 [改动文件清单](changed-file-manifest.json)；源基线与逐批归档在本目录。未使用 reset --hard 或目录级覆盖恢复。

## 对齐依据

发现与窄触发、条件加载、保留领域不变量、通过实际轨迹和产物评测，分别参照 [OpenAI Build skills](https://learn.chatgpt.com/docs/build-skills)、[Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) 与 [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills)。原始观察与范围见相邻审计目录 skills-research-brief.md；本仓 8KB 等约束未被描述为 OpenAI 的统一硬标准。
