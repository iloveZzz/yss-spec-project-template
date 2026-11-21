# Frontend 技能来源与适配

本记录说明 2026-11-07 导入的来源、分发范围与本仓取舍，不是应用验收或审批材料。最初三个技能的共享内容源均为根 `.agents/skills`；Frontend 按显式白名单选择分发，Spec 按需可用但不增加默认安装，Backend 不分发这三个技能。安装后按目标工程的技能目录发现，不依赖来源工程或本机绝对路径。

## 本次来源

| 技能 | 直接来源与读取版本 | 分发文件 |
|---|---|---|
| vue-best-practices | SCRM `pd-spec/.agents/skills/vue-best-practices`；HEAD `6cb922195bab1cfab68832e70545bf5e9a3ee354` | 25 个：SKILL、LICENSE、upstream.json、22 份参考 |
| create-adaptable-composable | SCRM `pd-spec/.agents/skills/create-adaptable-composable`；同一 HEAD | 3 个：SKILL、LICENSE、upstream.json |
| yss-frontend-application | SCRM `scrm-frontend/.agents/skills/yss-frontend-application`；HEAD `9cb5093f5eca12eeec73b04e7be663fad845ae87` | 19 个：SKILL、agents 元数据、12 份参考、4 个示例资产与补丁许可证 |

读取时上述来源技能范围均没有 Git 未提交变更；未修改来源 SCRM 工程。文件统计排除 `.DS_Store` 和 `__pycache__`。应用技能来源共 31 个文件，未导入 `evals/` 下的 12 个文件和 `assets/patches/useRequest-throttle.test.ts`，不分发脚本或测试套件。

两个 Vue 技能原始来源均为 [vuejs-ai/skills](https://github.com/vuejs-ai/skills/tree/198f0cd8f7f9c0a3d9b566ccc16de6677519ee78)，`sourceRevision` 为 `198f0cd8f7f9c0a3d9b566ccc16de6677519ee78`，许可证为 MIT；metadata 版本分别为 `19.1.0` 和 `17.0.0`。原有 `upstream.json` 与 LICENSE 原样保留，不用本次适配内容替换上游 revision。

原来源记录的局部修补继续保留：Vue SFC 类型示例补 `lang="ts"`，fallthrough 属性存在性判断避免缓存过期，composable 的 document 访问保留 SSR 检查。YSS 应用技能没有独立 `upstream.json` 或技能级 LICENSE；其历史第三方研究、来源与限制保留在技能 `references/source-adaptation.md`，不据此新增许可证声明。

## 本仓适配

- `vue-best-practices/SKILL.md`：将“所有 Vue 任务必须使用”和四份参考全量必读改为响应性、SFC、数据流、组合式职责按需读取；纯文案、颜色、间距不触发。项目约定与授权优先，SFC 顺序沿用项目习惯，不因技能安装获得实现、提交或发布权限。
- `create-adaptable-composable/SKILL.md`：明确只在接口确需响应式/普通输入时使用，保留 callback 与 getter 的区别；`toValue` 和 `toRef` 归一化签名要求 Vue 3.3+，Nuxt 以实际解析的 Vue 版本为准。只读 review 不转实现。
- 应用 SKILL 与 `bootstrap`、`project-structure`、`quality-tooling`、`vueuse`：移除未分发 starter、结构检查命令、评估目录和测试文件的依赖；初始化按目标工程现有方法或核验后的官方工具，检查使用真实存在的工程入口，不新增统一脚本门禁。
- `openapi`、`source-adaptation`：将来源版本、模板、已验证描述明确标为历史观察，本次文档导入不证明客户端生成或应用运行成功。
- `verification`：保留工程、同条件视觉、关键交互三类还原证据，模拟/真实服务分开；独立评审只按用户明确要求或实际需要安排，不作为统一交付前置。
- `integration-design`：改为本次职责与分发边界，替换来源三技能/脚手架实施方案。其余工程、设计交接、组件与可选能力参考保持原内容。

本次保留的 4 个应用资产是 `assets/frontend-handoff.md`、`assets/openapi/orval.config.ts`、`assets/openapi/transport.ts`、`assets/patches/vue-hooks-plus@2.4.3.patch`，均与直接来源一致。补丁仅供其精确版本 ESM 源码匹配时使用，接入时仍需验证目标工程生命周期与构建。

补充 `assets/patches/VUE-HOOKS-PLUS-LICENSE.txt`，来源为同一 scrm-frontend HEAD 的 `.agents/skills/yss-frontend-scaffold-generator/assets/template/provenance/VUE-HOOKS-PLUS-LICENSE.txt`，保留 MIT 与 `Copyright (c) 2022 YongGit` 原文。仅取许可文件，不导入脚手架。复制或分发补丁时一并保留该许可证。

初次导入未纳入 `yss-frontend-scaffold-generator`，后续重新引入见下文。当时的组件规则由应用技能内置，2026-11-21 起按下文分发独立的 `shadcn-vue`。组件复用与生成遵循实际锁定版本、本地组件、Tailwind 4 与 Reka；不采用上游 AUTO、`@latest`、强制表单库或嵌入 CLI 对项目授权的扩张。保留 pnpm、Vue 3、TypeScript、按需 VueUse/useRequest、现有工程保护与取消不等于撤销的边界。

## 副本与证据边界

根 `.claude/skills` 的三个技能入口是指向 canonical 内容的链接；根 `.workbuddy/skills` 保持普通副本。Frontend 复用根共享主源，其 WorkBuddy 有效副本位于 `profiles/frontend/.workbuddy/skills`。本说明在 Frontend 的 `.template-spec/agents` 下保留同内容副本，随 Spec 与 Frontend 对应安装模式的资源清单分发。

初次导入执行范围、技能内相对 Markdown 引用、来源/许可证保留及副本一致性核对。没有运行应用构建、接口生成、浏览器视觉/交互、技能宿主发现或真实接口联调；没有提交、推送或发行。结构核对不能替代这些运行证据。

## 最小工程整合

以 SCRM `a5a331548bf7d2d4c46153506c4b823b4bcd14eb` 为固定参考，新增第四个共享前端技能 `yss-frontend-scaffold-generator`。Frontend 默认 13、可用 17；Spec 默认 16、Backend 默认 41 不变。轻量技能调用原生 CLI，静态 starter 仅在 Frontend Bundle 中，安装技能不复制它。请求与 OpenAPI 按任务接入；来源、许可和裁剪详见新技能包内 references/source-adaptation.md。Spec 的设计升级仍在原有 yss-design-system 中，不新增 Design Profile。

## 官方组件按需接入（2026-11-08）

三个现有技能补齐官方组件发现、固定兼容来源、必要依赖/配置、现有主题适配和实际验证；共享正文为项目根 `.agents/skills/yss-frontend-application/references/component-engineering.md`。该自包含叶子随 Spec/Frontend 的设计技能在 project、skills 两种模式分发，不安装完整应用技能；默认/可用技能集合不变。大版本升级、已有定制和全局主题变化先提供具体方案，由用户决定。starter 仅增加 YSS 自有组件配置，不更新固定组件、许可、依赖锁或主题；上游来源身份保留，规则适配不冒充上游升级。


## 2026-11-17 共享研发与拆票入口

按用户要求，Frontend 两种安装模式默认加入共享 `implement` 和 `to-tickets`，默认 15 项、可用库 19 项；仍由根 `.agents/skills` 提供唯一内容源。`implement` 协调明确研发，应用技能负责专业实现；`to-tickets` 仅在明确拆票时按意图区分业务和工程结果，研发任务也可单独读取工程拆分方法，不强制建立票据。局部开发与只读 review 直接使用应用技能。

新增入口沿用 Matt 原始来源记录与授权边界，详见 [共同来源与适配](matt-skills-adaptation.md)。白名单、两模式资源、注册表、锁记录、前端 WorkBuddy 副本及入口文档同步更新。以上属于本地候选，实际安装内容以对应 CLI Bundle 为准，不代表公开发布或所有宿主已验证。


## 2026-11-17 生命周期进度关联

Frontend 应用技能与共享 implement 按需读取 `.template-spec/agents/workbench-progress.md`，在日常终端、工作台作业及 PR/MR/CI 跟进中沿同一 Spec 身份与目标版本上报实际前端、后端和集成版本及证据。前端工程、视觉/交互验证和真实联调各自关联实际结果，确认与手工更正接续其适用范围及版本。既有任务及原验收继续使用，新增目标沿用户实际决定处理。

本轮同步根与 Frontend 的应用技能和共享 implement WorkBuddy 副本、PR/MR 叶子、两模式 skillReferences、共享进度方法白名单及来源说明副本。保留单一共享主源、默认成员、发现元数据和许可证，新 CLI 接口使用实际帮助核实后的契约。此处记录模板本地适配，实际安装、自然发现、浏览器与接口联调结果沿各次执行证据说明。

## 2026-11-21 前端组件与 hooks 基座

Frontend 的 `project` 和 `skills` 默认安装以下两个 skills.sh 技能。Spec 可按需补装。来源锁定上游提交，`skills-lock.json` 的 `upstreamHash` 记录 skills.sh CLI 针对原技能返回的摘要。YSS 维护的入口、参考与许可随 Bundle 分发。

| 技能 | 来源与版本 | YSS 分发内容 |
| --- | --- | --- |
| `shadcn-vue` | [skills.sh 目录](https://skills.sh/unovue/shadcn-vue/shadcn-vue) · [unovue/shadcn-vue v2.9.0](https://github.com/unovue/shadcn-vue/tree/39cb0b277f009e47de2dc62c4217755fb9a27eec/skills/shadcn-vue) | 保留组件组合、样式、CLI、MCP 和 registry 方法及 MIT 许可证。按需读取工程配置；安装和更新参考贴合本地组件、定制和实际 CLI。 |
| `vueuse-functions` | [skills.sh 目录](https://skills.sh/vueuse/skills/vueuse-functions) · [vueuse/skills 固定提交](https://github.com/vueuse/skills/tree/004812b4aa0815f5745ac30a6a7dc4927aec7b3d/skills/vueuse-functions) | 从该提交所用的 VueUse 15.0.0 文档精选 14 份函数参考，按浏览器交互、防抖节流、倒计时、串行轮询和日期显示组织入口。附技能和函数文档的 MIT 许可证。 |

Vue 3 组件行为与可适配的自定义 hook 继续使用已适配的 [vue-best-practices](https://skills.sh/vuejs-ai/skills/vue-best-practices) 和 [create-adaptable-composable](https://skills.sh/vuejs-ai/skills/create-adaptable-composable)。两项均通过 skills.sh 的 `skills add` 在临时工程按原始提交核对，保留上文记录的本地适配。技能安装与应用的 npm 依赖各自按需处理。
