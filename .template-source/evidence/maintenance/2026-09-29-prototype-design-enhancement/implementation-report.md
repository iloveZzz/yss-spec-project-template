# 低保真与高保真设计技能增强实施报告

## 当前交付

本轮按已批准方案实施方法、三组可运行视觉正反例、离线比较工具，并同步设计/前端 profile 与三个 CLI 的工作树分发快照。原型能力继续归属 `yss-prototype-stage`、`yss-design-system`、`prototype-review`。未新增生命周期门禁，未修改根 `DESIGN.md` 或历史批准资产。

维护等级为 L3（generation-semantics、aggregate-behavior-change）。目标为 `implementation-ready`，工程验证与试点效果分别判断。当前研究/示例及试点评测均为模板维护资产，不构成产品原型批准、独立评审或发布证据。

## 实现与使用

| 资产 | 已实现内容 |
|---|---|
| 原型阶段 | 简短设计输入；内容优先级、长度、区域、来源、actionKey/状态与动作结果；低保真先探索后独立评审；高保真只探索尚未解决的视觉问题 |
| 设计系统 | 企业后台的任务主次、数据分组、密度和反馈方法；按需加载 enterprise-craft 参考 |
| 评审 | 新检查并入既有低保真评审和六轴 QA；区分行为缺陷、画面观察、偏好建议；预算结束不等于通过 |
| 教学示例 | 查询列表、表单详情、审批异常三组；共享内容、数据、状态与 Token；前态刻意呈现层级问题 |
| 比较工具 | prepare/seal/validate；2–3 个候选，条件探索继续三个；独立快照、原尺寸逐个查看、场景保持/重置、深链接、显式错误、摘要校验 |

示例入口：[便携视觉示例](examples/index.html)。直接打开或复制整个 `examples/` 目录后打开；示例不是效果试点的 Agent 产物。

比较工具：`.agents/skills/yss-prototype-stage/scripts/prototype-comparison.mjs`。输入与命令见该技能 `references/comparison-tool.md`。输出为 `docs/.scratch/<feature>/design/comparisons/<comparison-id>/`；不更改原有 prepare-static/prepare-flow 目录合同。评审选择不写批准，选中方案仍按原有流程交付。

外层在可用宽度内展示单个 iframe；产品精确视口截图通过“原尺寸单独打开”获得。file:// 下使用普通本地 iframe 和 readiness 消息，无网络、服务器、localStorage 或父页面访问子页面 DOM。比较工具不是不可信代码沙箱。静态检查证明资源/路径/数据绑定，页面实际消费场景仍须浏览器验证。

## 工程证据

- 原型合同场景与新增比较测试通过，历史证据版本及退休路线继续按原有规则处理。
- 新比较工具及三组示例在 Chromium 151.0.7922.34、1440×900 与 390×844、offline=true、file:// 下验证；候选切换、重置、深链接、错误入口、输入保留、权限、冲突恢复、焦点返回通过，无页面/console/资源错误。见 [浏览器证据](browser-verification/)。
- 既有 H1/H2、原生 workbench、真实 AntD workbench 浏览器检查通过。AntD toolchain 用 pnpm 离线缓存安装，未将依赖带入离线交付包。
- 主仓 canonical、三套 Agent 投影、设计/前端 profile 与 source-tree 来源摘要已同步；上游来源版本明确是 working-tree。
- create-yss-spec、create-yss-strategic-design、create-yss-harness-frontend 均创建实际隔离实例，交付资源存在，实际调用比较 prepare/validate 与示例导出成功；见 [CLI 行为记录](cli-behavior.json)。专用 CLI 初次 /var 路径被符号链接检查拒绝，改用 /private/var 真实路径后通过，初次失败保留。

试点后补强的最终隔离快速核验通过：17 项命令全部退出 0，输入前后摘要相同，input_drift=false，见 [最终核验](post-pilot-fast/report.json)。工程状态为 `implementation-ready`，见 [checkpoint](checkpoint.json) 和 [自检](self-check.md)。主工作区初次核验被本轮之前已有的 document-readability-design/plan.md 行尾空格阻断；该文件保持原样。隔离工作树第一轮所有命令通过，但 Python 测试新建两个忽略的 .pyc 文件，触发只读/输入漂移检查；未改校验规则，使用 PYTHONDONTWRITEBYTECODE=1 重新核验。原始失败报告均保留。

## 兼容与分发边界

- 根 DESIGN.md 仍是唯一视觉规范；方法未引入外部字体或色值。
- Prototype Evidence v4、Visual Baseline v1、H1/H2 及条件 AntD 路线未变；不迁移旧批准资产。
- 设计 source 的既有 lifecycle/handoff 差异保留；前端 review adapter 仍由既有 patch 生成。profile 自有交互模板仅补同等方法章节，不覆盖其既有 API/阶段语义。
- 分发快照来源是当前未提交工作树，证明本地集成，未进行固定已提交 SHA 的 release 核验、远程提交、推送、npm 发布或生产发布。
- 无关工作按初始清单保留；锁文件通过脚本生成，包含已有共同基础改动。本轮模型对照两组使用相同共同基础输入。

## 试点与效果

12/12 次真实启动已完成，全部超时，自动通过 0/12，Token 用量均未上报。7 次留有 HTML，但只有局部修改两侧通过了补充浏览器交互检查；增强侧还违反布局保持约束。本次未建立设计质量改善证据。见 [试点报告](pilot-report.md) 与 [六组匿名 A/B 记录](pilot/index.html)。

试点后已补强现有 QA 的保持项核对指导，并以独立修复副本验证查询区几何与原页面一致。原始失败样本不变，不追加 Agent 预算；最终指导修订的真实 Agent 效果仍未验证。视觉收益未获用户确认。

最后补强的两个方法文件已重新进入三个 CLI 的全新隔离实例，内容标记核验通过，见 [最后分发检查](post-pilot-cli-integration.json)。原比较/示例工具代码未因该指导修订变化，沿用同字节的浏览器与行为验证。
