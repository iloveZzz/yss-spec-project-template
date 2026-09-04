# 原型档位与 Designer Skills 融合研究

> 日期：2026-09-04
> Profile：`technical-evidence`
> Mode：`evidence-audited`
> 仓库身份：`repository_mode: template-source`

## Research Scope

- Decision informed：YSS 低保真评审之后应如何选择原型技术与证据强度，是否应继续把 React、Ant Design CLI 和构建链设为所有原型的强制前提。
- Audience：YSS 生命周期、产品设计、前端实现与模板维护者。
- Inclusion：浏览器交付、静态 HTML、Vite、Ant Design CLI、Storybook、Figma、Playwright，以及 `designer-skills` / `taste-skill` 的可复用设计方法。
- Exclusion：具体产品原型、生产页面实现、上游技能整包安装和未经目标实现仓验证的 YSS UI API。
- Access limitations：未执行真实项目的 H1/H2 两档试点；该试点保留为发布前证据。

## Executive Read

现有 schema v2 把 React、pnpm、`antd@6.x`、CLI 查询和完整无障碍矩阵绑定到每个高保真原型，能保证流程原型的一致性，却让仅需视觉确认的交付承担不必要的 Node 与组件事实成本。最终采用 H1/H2 两档：H1 使用可移植静态 HTML/CSS/少量 JS；H2 使用可运行浏览器流程，React/Vite/AntD 只是受支持默认，并仅在实际使用 AntD 时消费精确版本事实或新鲜 fact pack。真实 Vue 3 + YSS UI/AntDV 组件、lockfile 和 Storybook 属于生产实现及实现还原验证，不属于原型档位；原型只把相关假设和待验行为交接给前端实现计划。

`designer-skills` 适合按概念融合而非整包安装：`prototype-strategy` 提供“先明确原型要回答的问题，再选最低保真度”的原则；`state-machine` 补强状态矩阵；`design-qa-checklist` 可并入既有 Design QA 六轴；`handoff-spec` 可映射到现有交互说明、状态矩阵、前端计划与 Slice 合同。`taste-skill` 明确排除 dashboard、数据表和多步骤流程，不适合作为 YSS 中后台原型主入口，只保留为未来 H1/H2 的可选视觉品味检查。

## Findings

1. `claim-001`：原型技术应由待决策问题和风险决定，而不是一律从生产级构建链开始。`designer-skills/prototype-strategy` 明确区分纸面、点击、编码和数据驱动原型；Figma 官方原型能力覆盖变量、条件和多动作，因此静态/设计工具与代码原型都可以成为有效的浏览器评审载体。
2. `claim-002`：纯 HTML 是 H1 的更优默认，但不是 H2 的通用替代。WHATWG HTML 定义了原生浏览器运行模型；Vite 官方支持把构建输出部署为静态站点。H1 不需要 Node 运行时，H2 可用静态构建承载流程。
3. `claim-003`：Ant Design CLI 应降为条件事实源。官方 CLI 提供离线知识、组件/API/token/semantic 查询和 lint；这些能力对 React AntD 原型有价值，但不能证明 Vue/YSS 组件 props、事件和状态。CLI 只应在 H2 实际使用 AntD 且 fact pack 失效时运行；H1 不适用。
4. `claim-004`：Storybook 适合生产组件的隔离状态与回归验证，但不应因此把 `yss-ui` 引入原型阶段。Storybook 官方能力可在批准后的前端实现或实现还原验证中使用。
5. `claim-005`：Playwright 可自动采集跨档位浏览器证据。官方支持截图基线和基于 axe 的无障碍扫描；但自动扫描不能替代键盘、焦点与业务状态的人工/交互验证。
6. `claim-006`：`designer-skills` 应 pin 到检查过的 commit 并重写为 YSS 合同，不应引入 107 个 skills 与 32 个 commands 的第二套生命周期。上游四个概念与 YSS 现有资产一一可映射，整包引入会制造重复路由和事实源冲突。

## Counter-Signals

- 单文件 HTML 最便于转发，但内联全部 CSS/JS/资源会降低可维护性；因此合同要求“浏览器可访问且相对路径可移植”，不强制单文件。
- React/Vite/AntD 能快速产出一致组件外观，但 H1 的安装与事实查询成本不成比例，也不能证明目标 YSS 组件兼容。
- Figma 可以表达复杂条件，却不自动产生可执行的工程组件合同；真实组件行为留到实现阶段验证。
- Storybook 会增加目标仓工具链负担，所以只在已批准的生产实现/验证确有需要或目标仓已有等价隔离 harness 时使用，不作为原型默认。

## Source Map

- 一手产品文档：Ant Design CLI、Vite、Storybook、Figma、Playwright、WHATWG HTML，支持工具能力与边界。
- 上游源码：`Owl-Listener/designer-skills` commit `20e34c4a587e5eb09fcdf8351fa97b3ad761b31e`；`leonxlnx/taste-skill` commit `ccbc15639c97057cbfcf32ecebc38ef716e4bb37`，支持技能适配判断。
- 项目内事实：schema v2、`yss-prototype-stage`、`yss-antd-design`、`yss-ui` 和生命周期注册表，支持现状与冲突分析。

## Decision Handoff

下游 owner 是 `maintaining-skills` 与 `yss-prototype-stage`。本研究仅提供技术证据，不批准生命周期资产；用户已单独确认采用全部推荐，并限定本轮只修改 template-source 的规则、schema、validator 与匿名 fixture。

## Evidence Limitations

- 尚无真实 YSS 产品功能的 H1/H2 耗时、证据填写量与缺陷漏检对比。
- `designer-skills` 与 `taste-skill` 采用 commit 快照检查，未来变化不会自动进入 YSS。
- Storybook 与 Playwright 的能力结论来自官方文档，目标实现仓的版本兼容性仍须从 lockfile 验证。

## Workflow Execution Result

```yaml
result_schema: workflow-execution-result-v1
work_unit: template-source-upstream-research
result: completed
skill: yss-research
changed_files:
  - .template-source/evidence/maintenance/research-prototype-profile-routing-2026-09-04.md
  - .template-source/evidence/maintenance/research-prototype-profile-routing-evidence-2026-09-04.yaml
evidence_refs:
  - .template-source/evidence/maintenance/research-prototype-profile-routing-evidence-2026-09-04.yaml
deferred_seams:
  - 在外部 project-instance 或临时外部仓完成 H1/H2 真实试点，并验证实现阶段交接后，才能晋级发布候选。
drift: []
violation: []
new_impacts:
  - lifecycle-gate
  - generation-semantics
  - core-validator
  - aggregate-behavior-change
next_route: template-source-l3-design-and-implementation
```
