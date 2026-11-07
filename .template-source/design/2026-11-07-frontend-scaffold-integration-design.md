# Frontend 脚手架与应用技能集成设计 Spec

日期：2026-11-07。状态：设计待用户审阅，默认工程基线已由用户选定；尚未实现或发布。

本设计面向 YSS 模板与 Rust CLI 的维护者。用户已在本聊天选择“最小工程基线：请求与 OpenAPI 按任务接入”。据此，新工程提供可运行的 Vue 基础、当前 YSS 主题和约定目录；业务页面、请求状态与真实接口由 `yss-frontend-application` 接续实现。两项技能保持独立。

除已明确的用户目标与上述选择外，本文的目录安排、命令形状、资源归属和兼容方案均为编写者提出的工程决策，随本文一起审阅，不标作用户已经逐项批准。

## 1. 问题、目标与成功条件

Template 5.2.0 与 CLI 3.2.0 已提供 Frontend Profile，可安装应用、Vue 与 composable 技能，但不能生成前端工程。原 `yss-frontend-scaffold-generator` 依赖 Node 生成脚本，携带客户查询演练、模拟 API、结构检查脚本和测试套件，不能按当前仓库约定整包导入。应用技能仍明确说明不提供该生成器，两者的新目录约定也不一致。

本次目标是让 Agent 在用户要求新建前端应用时，调用实际支持的 CLI，在不存在的目标目录生成中性工程；在用户要求已有应用开发、接口接入或 review 时，直接使用应用技能。安装 Frontend 技能本身不生成应用源码，生成应用也不隐式安装技能。

完成实现后，应满足以下可观察结果：

- 新工程只有约定技术基础和中性起始页，不含客户业务、模拟端点或假成功响应。
- 生成可在没有 Node/pnpm 的机器上完成；应用安装与运行仍需要模板声明的 Node/pnpm 环境。
- 现有目录、用户修改、符号链接与不安全路径继续受到保护；没有 `--force` 覆盖路线。
- Frontend 默认技能由 12 项增至 13 项，可用技能由 16 项增至 17 项；Spec 默认 16 项、Backend 默认 41 项不变。
- 新工程可随后接入 Frontend skills，并保持应用源码与已有 `.gitignore` 内容。
- 交付分别说明源码生成、工程运行和页面还原的真实状态，不混用完成结论。

## 2. 方案比较与已选路线

| 方案 | 默认产物 | 取舍 | 决定 |
| --- | --- | --- | --- |
| A：最小工程基线 | Vue/TypeScript/Vite、pnpm、VueUse 基线、基础组件、主题、目录与工程配置 | 依赖和默认代码较少；真实请求与 OpenAPI 接入在业务任务中完成 | 用户已选 |
| B：接口接入基线 | 在 A 上预装 useRequest、Axios、Orval、transport 与相关补丁 | 首次接入接口更快；每次模板维护需要验证额外依赖组合 | 本次不采用 |

原样分发 Node 生成器不作为候选：它与本仓不分发脚本、测试套件的约定冲突，并会与 CLI 形成第二套生成执行逻辑。仅增加技能说明而不提供真实生成命令，也不能完成本次目标。

本次只提供一种前端 starter，不增加 basic/full 模式、插件机制或框架选择器。

## 3. 范围与约束

修改范围包括模板仓中的两个技能、Frontend 分发政策与必要共享清单、最小静态 starter，以及 CLI 的前端生成入口、目录查询、报告和文档。

以下内容不在本次范围内：

- 迁移或覆盖已有应用，重写用户设计，生成业务页面、生产 API 或数据库设计。
- 默认引入路由、Pinia、权限体系、微前端、通用 CRUD、部署模板或新组件库。
- 分发来源生成脚本、结构检查脚本、测试套件、evals，或恢复统一门禁、批准包、检查计划。
- 自动执行依赖安装、Git、提交、推送、部署或发布；自动修改父 pnpm workspace 或全局工具。
- 改变 Spec/Backend 默认技能集合，改造 Java 脚手架参数或已有项目安装引擎。
- 为旧 CLI 补充运行时降级。CLI 3.2.0 不支持 `scaffold frontend`，新能力必须以实际发布程序的帮助和 catalog 为准。

普通 `package.json` 命令与 Vite/ESLint/TypeScript 配置属于应用必要资产，可以分发；它们不得调用被移除的自定义脚本或测试文件。

## 4. 技能职责与任务路由

| 用户任务 | 主入口 | 必须产生的结果 | 不能据此推导的动作 |
| --- | --- | --- | --- |
| 只生成新工程源码 | scaffold 技能与 CLI | 新目录、源码、生成来源记录、后续运行方式 | 不自动安装依赖，不声称已运行 |
| 创建可运行的新应用 | scaffold 后接 application | 先生成，再按任务安装、运行与验证 | 不将中性起始页视为业务交付 |
| 已有应用增加功能、修复、迁移 | application | 在现有入口、依赖与设计内修改受影响范围 | 不重搭脚手架，不自动搬目录 |
| 工程或还原 review | application / code-review | 有位置、条件和影响的发现，或限定范围内无发现 | 不修改源码，不生成工程 |
| 安装或同步 Frontend 技能 | setup / init、attach、sync | 对应安装范围的技能与必要资料 | 不生成 `src/`、应用 `package.json` 或 starter 副本 |

`yss-frontend-scaffold-generator` 的触发描述必须限定“在不存在的新目录创建 YSS Vue 工程”；正文首先读取用户指定目标与实际 CLI 能力。仅有空目录也属于已存在目录，拒绝生成，不能先清空或删除再继续。

`yss-frontend-application` 更新 `SKILL.md`、`bootstrap`、`integration-design` 与来源说明：将新工程路由交给 scaffold，移除“空目录才初始化”和“不提供脚手架”的现役表述。只在明确采用 YSS starter 时调用此生成器；已有其他初始化方案的项目仍沿用其实际工程。CLI 尚无该能力时说明版本缺口，不冒用旧命令或恢复 Node 生成器。

应用技能继续保留所选设计优先、生成客户端与手写代码分开、单一请求状态所有者、取消不等于服务端回滚、键盘与焦点行为，以及纯文案/样式不触发整套逻辑验证等规则。Vue/composable 技能继续按逻辑职责调用，不因新增脚手架而全量加载。

## 5. 默认工程内容

### 5.1 文件与行为

starter 至少包含以下可直接消费的内容；具体配置文件拆分沿用来源中可用的最小结构。

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.gitignore
index.html
README.md
DESIGN.md
vite.config.ts
eslint.config.mjs
tsconfig*.json
src/
  main.ts
  App.vue
  views/Home/
    index.vue
    components/.gitkeep
    hooks/.gitkeep
    schemas/.gitkeep
  components/ui/…
  hooks/.gitkeep
  lib/utils.ts
  styles/…
provenance/…
.yss/scaffold.json       # CLI 生成，不作为静态源资产
```

Home 是中性的开发起始页，只说明工程已生成与开发入口；不提供无行为的操作按钮、登录演示、客户查询、预制请求或业务状态。保留来源中必要的本地 Button/Input 与 utility，作为后续页面可复用的基础组件，不为展示全部组件增加页面。

运行时保留 Vue 3、VueUse 15、Reka、Tailwind 4，以及这些本地组件实际需要的依赖；开发时保留 Vite、Vue 插件、TypeScript、vue-tsc 与 ESLint/Vue 配置。来源中的 useRequest、Axios、Orval、测试库、MSW、Playwright、axe 及其专用配置不进入默认工程。

移除客户 service、合成 OpenAPI、预生成客户 DTO、mock 启动分支与相关 import。未接入真实 API 前，工程不得在启动或构建时请求业务端点。保留 `dev`、`build`、`lint`、`lint:fix`、`typecheck`；`build` 直接执行 Vite，不调用 `check:structure`。不留下 `test`、`test:e2e`、`generate:api`、`dev:mock` 等指向不存在内容的命令。

生成工程不带宿主入口 `AGENTS.md`/`CLAUDE.md` 或项目安装收据 `.yss/project.json`；这些由用户后续明确的 Frontend 接入操作提供，防止生成与安装的文件职责重叠。

### 5.2 依赖与环境

初始运行基线沿用来源的 Node `^24.14.1` 与 `pnpm@10.15.0`，优先复用保留依赖的现有精确版本。本稿不声称裁剪后的组合已经安装或运行通过。

实现者在裁剪实际依赖与配置后，用对应 pnpm 重新生成锁文件，随后执行冻结安装验证；不得手改锁摘要或以 `@latest` 替代版本选择。若保留组合存在真实兼容性问题，可以作最小版本调整，记录实际原因、package/lock 和验证范围；不借此全面升级技术栈。

`package.json`、锁文件与实际 pnpm 配置共同构成唯一的新工程版本事实。技能正文引用它们，不另外维护必须安装的精确版本清单。移除 useRequest 后同步移除它的补丁注册与不再使用的补丁文件；依赖安装脚本许可只保留实际需要的项目，不启用全部依赖脚本。

父 pnpm workspace 仍可能枚举生成目录。Agent 在执行安装前读取实际父配置和命令作用域，不能声称新目录天然隔离，也不能自动改父 `packages` 配置。需要更换输出位置或调整父工程时，沿用用户真实授权。

### 5.3 主题和共享资产

默认主题使用当前 YSS Standard Light 及其对应 tokens/语义映射。源模板的主色、控件高度、圆角与正文基线已基本一致，修正字体栈和边框变量的分叉即可；不重设计主题。保留必要可访问性规则、组件来源与许可证。

维护时从模板当前设计源同步所需主题资产，并更新 provenance；生成时只读取已随 Bundle 固定的文件，不访问其他工作树或在线组件注册表。生成后的 `DESIGN.md` 是该应用的默认设计说明，后续用户选定的产品设计由 application 映射与验证，模板升级不自动覆盖它。

Orval 配置、transport、useRequest 精确补丁继续由 application 的现有参考与小型资产提供，用户提出相应任务时再接入。它们不复制到默认 starter，避免维护无消费者的配置和第二份版本基线。

## 6. 模板资源与技能分发

内容源采用以下位置：

```text
.agents/skills/yss-frontend-scaffold-generator/       # 入口、元数据、小型参考与来源
.agents/skills/yss-frontend-application/              # 应用工程规范及已有接入参考
profiles/frontend/.template-spec/templates/frontend-starter/  # CLI 生成资源
```

starter 只通过 Frontend 的 `manifest.allowFiles` 纳入 Bundle。它不放进技能目录，不加入 project/skills 安装基础文件，也不加入技能的 `skillReferences`。现有选择器会复制选中技能目录的所有文件，因此不能靠技能内部目录命名实现按需排除。

复用现有 Bundle 格式、Frontend 覆盖层和文件描述，不新增 schema、资源服务器或生成器包装层。CLI 从 `Profile::Frontend` 的上述固定前缀读取资源，去除前缀后组成待生成树。Spec/Backend 不复制 starter 资源。

新技能采用根共享主源，生成根 Claude 链接与普通 WorkBuddy 副本；Frontend 按白名单分发并默认安装。Spec 可按需安装该技能，默认集合不变；其执行依赖支持前端生成的 CLI，而非本地安装一份 starter。Backend 排除新技能。使用当前清单结构同步注册表、公开清单、锁、入口及来源说明，不新增锁 schema。

技能引用只指向本包或明确随当前安装模式分发的资源。来源/适配说明同时覆盖 Spec 与 Frontend 的 project、skills 两种模式。需要共享目录规范时按现有 `skillReferences` 分发必要叶子文档并检查引用闭包，不为一次初始化强制安装完整设计技能。

## 7. CLI 对外行为

### 7.1 命令与参数

以下为待实现接口，CLI 3.2.0 不支持：

```sh
yss scaffold frontend --project-name my-frontend --output-dir /absolute/parent
yss scaffold frontend --project-name my-frontend --output-dir /absolute/parent --dry-run --json
```

- `--project-name`、`--output-dir` 必填。项目名使用小写 kebab-case，作为输出目录名与 `package.json.name`；复用现有路径与保留名称校验，拒绝越界、分隔符和不安全名称。
- 输出父目录必须存在并通过已有文件系统保护；最终目标为父目录下的项目名，必须不存在。前端命令不创建父目录。
- 不引入 Java 坐标、平台参数、`--framework`、`--force`、`--install` 或 `--with-skills`。
- `--json` 继续使用现有输出信封。成功报告输出根、实际文件数、dry-run/应用状态、模板来源与 Bundle 摘要；不将未执行的依赖检查标为成功。
- `--dry-run` 执行相同的输入、目标与资源预检，但不创建目标、暂存目录、锁、控制文件、缓存或计划。真实执行重新校验，不消费预览计划。

### 7.2 catalog、帮助与兼容

保留 `scaffold catalog` 已有 Java `platforms`、`requiredFlags` 与来源字段的含义，不能把前端要求混入 Java 平台列表。新增独立 `frontend` 项，描述前端命令、必需参数、模板运行环境与 starter 来源；运行环境从实际 starter 的 package 配置读取，不再手写一份版本表。普通输出与 `--json` 复用当前报告序列化路径，不另造文本渲染器。

新字段为兼容性扩展，不修改现有 DDD/MVC 参数、返回字段或 Java 生成行为。实现时检查 catalog 的文本格式化与已知消费者；对于严格拒绝未知字段的外部客户端，发布说明明确新增字段，不能承诺未调查的第三方兼容性。

技能先核对实际 `yss version`、对应帮助或 catalog；不只按模板文档判断 CLI 能力。Frontend Profile 的最低安装版本与前端脚手架的可用版本分别表述，不能把已有 3.2.0 Profile 安装能力误写为生成能力。

### 7.3 渲染与发布

增加独立的前端参数与渲染入口，直接产出已有 `RenderedTree`。共享 CLI 基础类型、Bundle 读取、取消检查和安全文件发布；不抽象成新的通用模板引擎。

只有 `package.json.name` 需要按输入通过 JSON 结构定点修改；README 不依赖项目名插值，其他静态内容原样复制。合法 Vue `{{ expression }}`、CSS/JS 花括号、环境变量和 `$ref` 必须保留。不得调用 Java renderer 的全局占位符拒绝、Maven 平台验证、wrapper 复制或 Java 上下文生成。

复用 `fs::publish_new_tree`：先准备与校验文件树，再创建受控暂存目录，使用禁止替换的发布操作，并保留实际失败检查。资源缺失、校验失败和预检拒绝时不能创建目标。发布前后均遵守当前并发、目录身份与路径保护。

写入阶段失败按已有机制尝试清理仍与登记快照一致的临时内容；不删除未知或被修改的内容。若暂存清理失败，或发布完成后目录同步失败，报告实际路径与错误，不承诺错误必定零写入。`.yss-stage-*` 不是已建立的项目事务，不能自动宣称 `yss recover` 可清理；由 Agent 检查真实状态后按授权处理。取消遵循同样的保护与报告规则。

### 7.4 生成记录

沿用 `.yss/scaffold.json`、`format: yss.scaffold`、`formatVersion: 1`，为前端使用独立记录结构：`architecture: frontend`、项目名输入、模板 `source`、`bundleDigest`、实际生成文件描述与目录集合。不复用 Java 的必填 `platform/context/modules`，不另建控制文件或新 Profile 身份。

文件描述记录实际字节摘要、长度和可观察模式；记录自身不纳入自身摘要。该文件说明本次生成来源，不是日后更新应用源码的管理清单。`sync` 只作用于另行接入的项目安装收据，不据此更新 `src/` 或 package/lock。

## 8. 生成工程后的技能接入与文件归属

用户要求在新工程中安装技能时，由 Agent 另行执行现有接口，例如：

```sh
yss attach --root /absolute/parent/my-frontend --profile frontend --installation skills
```

此处使用 skills 范围，避免把模板 README/CONTEXT/DESIGN 覆盖到已生成应用。`scaffold` 不内嵌该调用。已有项目的其他受管路径冲突仍按当前规则拒绝，不因来源看似相同而接管。

starter 必须提供排除依赖目录、构建产物等内容的 `.gitignore`。Frontend 的 `.gitignore` 政策调整为现有 `user-owned` 类型，project 与 skills 两种范围一致，仍保留在基础资源中；只修改 Frontend 政策，不修改全局冲突算法或 Spec/Backend 政策。

| 当前状态 | 新政策下的行为 |
| --- | --- |
| 新 attach，已有 `.gitignore` | 保留全部原字节，不新增该文件的受管收据项 |
| 新 init/attach，缺少 `.gitignore` | 按基础资源创建，并以 user-owned 记录 |
| 旧安装有 managed 类收据 | sync 保留文件及旧 ownership/hash，不自动迁移历史收据 |
| 后续用户修改已有收据中的 `.gitignore` | doctor 按现有机制如实报告差异；不保证无差异，也不强行回写 |
| 用户删除已有收据中的 `.gitignore` | sync 不因新 user-owned 政策重建；doctor 保留缺失报告 |

当前计划器在保留文件时会原样保存旧收据，doctor 比对收据时也不因 ownership 自动跳过。本文明确沿用这些语义；不新增所有权迁移机制，不从本次政策调整推导未来可以删除旧文件。

`.yss/scaffold.json` 与 `.yss/project.json` 可以并存，各管各的来源。前端生成记录必须通过现有控制目录格式检查；首次 attach 在没有 project 收据时按现有接入语义处理。recover 只处理其原有支持的项目事务，不把生成记录视为可回滚事务。

## 9. 必须同步的消费面

| 范围 | 需要同步的内容 |
| --- | --- |
| 共享技能 | 新 scaffold 入口与元数据、application 路由/准备/整合/来源；必要引用资源 |
| 模板分发 | 根与 Frontend 注册/公开清单/锁、默认集、白名单、平台副本；Backend 排除；来源/许可证 |
| Frontend 入口 | project 与 skills 的 AGENTS、README、教程及 profile 描述；init/attach 与 scaffold 的区别 |
| 模板资产 | starter、主题来源、package/lock、README/DESIGN；移除内容的脚本、配置、import 和依赖调用者 |
| CLI | `src/cli.rs` 命令/分派/报告、`src/scaffold` 前端模块及 catalog、已有安全写入接口调用 |
| 使用说明 | 两仓 CLI 帮助、`docs/scaffold.md` 与前端教程、真实支持版本、来源与未验证范围 |
| 跨仓构建来源 | 实施集成时核对 CLI CI 固定的模板提交包含 starter，模板 CI 固定的 CLI 提交具备新入口；只使用已存在的真实提交 |

维护锁中的已有有效哈希时按仓库约定计算；根锁没有该字段时不新加。历史研究与发行记录保留其当时结论，新设计不将历史 3.2.0 描述改成已支持新命令。

如后续获得发行授权，两个仓库的版本、源码固定提交和配套安装说明需一起更新；从最终干净来源重新构建并验证实际产物。当前设计工作不创建新版本号、未来提交摘要或发行结果。

## 10. 实施验收场景

本节定义本次变更应证明的行为，供实施计划选用直接命令、临时断言和真实宿主演练；不是要新增或分发一个固定测试套件。所有执行结果在实施后记录，本稿不提前标记通过。

| 场景 | 预期结果 |
| --- | --- |
| 没有 Node/pnpm，仅运行 CLI 生成 | 成功输出文件与来源记录，不安装依赖、不联网、不执行 Git |
| 同一 Bundle、同一输入在独立目录生成 | 文件内容一致；来源可追溯；平台文件模式差异按实际语义记录 |
| 合法 Vue 插值、项目名替换与 JSON | `{{ }}` 原样保留；package 名正确且仍为合法 JSON；其他源码未被广泛替换 |
| 不安全名称/路径、缺失父目录、已有空/非空目录、符号链接 | 按对应保护拒绝，既有内容不变 |
| dry-run、发布时目标被抢占、取消与写入失败 | 预览无写入；真实执行不覆盖；失败残留与恢复建议符合真实阶段 |
| 新工程依赖与运行 | 选定环境下冻结安装、lint、typecheck、build 和本地启动通过；命令无失效引用，无模拟业务网络请求 |
| 默认页面与主题 | 桌面/窄屏基本布局、适用键盘焦点和主题映射检查；不借此宣称任何指定业务页面已还原 |
| Bundle 与安装资源 | CLI 能读取 starter；Spec/Frontend 技能安装均不铺开 starter；Frontend 13/17、Spec 默认 16、Backend 默认 41 |
| scaffold 后 attach skills | 应用源码、package/lock、README/DESIGN 与 `.gitignore` 保持；生成和项目收据并存 |
| 新旧 `.gitignore` 状态 | 覆盖已有/缺失、旧收据与用户修改；结果符合第 8 节，不伪造无差异 doctor |
| 同步与既有命令 | Frontend 同步幂等、引用可达；DDD/MVC 代表路径、现有 catalog 字段和文件保护无回归 |
| 技能触发 | 新建任务选择 scaffold 后接 application；已有应用不重建；纯文案不加载全套逻辑技能；只读 review 不写文件 |

macOS ARM64 与 Windows x86_64 是当前发行目标。生成、路径保护和实际应用运行分别记录平台证据；Windows 只构建或检查归档不能替代 Windows 原生生成验证。平台条件缺失时明确未覆盖，不借其他平台结果宣布通过。

## 11. 留给实现者的决定与当前状态

实现者可以决定 Rust 内部类型/函数拆分、普通错误文案、配置文件最小拆分、必要依赖的精确兼容修正及临时验证方式；这些决定不得改变本稿的默认能力、覆盖边界、文件归属或公开命令形状。

前端 catalog 新字段的具体结构、错误阶段报告和 Frontend 记录结构应与已有序列化/错误体系保持一致；实现计划需要写清具体字段与调用面，不将它们变成通用框架。若实现发现现有安全机制不足，先报告具体条件，不通过放宽校验使场景通过。

用户已选择默认工程方案；全文设计尚待审阅。当前工作仅形成本文，不包含源码实现、依赖安装、生成演练、应用运行或新发行。后续实施和发布范围按用户实际指令处理，不沿用已完成的 5.2.0/3.2.0 发行作为新一轮发布授权。

2026-11-07 独立可实施性审阅已完成：审阅者仅凭本文判断，没有在制定实施计划前必须补充的重要问题。本地引用、空白与代码块闭合检查通过。该结论只针对设计文档，不代表用户已确认全文或实现已经通过验证。

## 12. 事实来源与证据范围

- 模板观察基线：`31b88c84534eb608a01770a33e8858b3c01aa267`（Template 5.2.0）。规则依据：[AGENTS](../../AGENTS.md)、[技能维护](../agents/skills-maintenance.md)、[Frontend 分发策略](../../profiles/frontend/.template-source/distribution/bundle-profile.json)。
- CLI 观察基线：`c15731df9a8aea8f9797cf5a62b73f12561a7c52`（3.2.0）。源码：[命令与分派](https://github.com/iloveZzz/yss-cli/blob/c15731df9a8aea8f9797cf5a62b73f12561a7c52/src/cli.rs)、[Java 生成与记录](https://github.com/iloveZzz/yss-cli/blob/c15731df9a8aea8f9797cf5a62b73f12561a7c52/src/scaffold/mod.rs)、[Bundle 选择](https://github.com/iloveZzz/yss-cli/blob/c15731df9a8aea8f9797cf5a62b73f12561a7c52/src/bundle/selection.rs)、[安装计划](https://github.com/iloveZzz/yss-cli/blob/c15731df9a8aea8f9797cf5a62b73f12561a7c52/src/project/plan.rs)、[文件保护](https://github.com/iloveZzz/yss-cli/blob/c15731df9a8aea8f9797cf5a62b73f12561a7c52/src/fs/mod.rs)。
- 来源脚手架：本次只读观察 SCRM `scrm-frontend/.agents/skills/yss-frontend-scaffold-generator`，工程 HEAD `9cb5093f5eca12eeec73b04e7be663fad845ae87`；技能范围无未提交修改，与宿主副本的 68 个常规文件逐字节一致。工程其他未提交工作未修改，不纳入本设计来源。
- 现有应用技能：[入口](../../.agents/skills/yss-frontend-application/SKILL.md)、[工程准备](../../.agents/skills/yss-frontend-application/references/bootstrap.md)、[整合说明](../../.agents/skills/yss-frontend-application/references/integration-design.md)。Orval 配置、transport 与 useRequest 补丁已在研究中与来源对应文件作字节比较；它们不是本次需要重写的功能。
- 上一轮 Profile 研究与验收记录：[Frontend Profile 整合](2026-11-07-frontend-profile-integration.md)。其中已发布能力、历史候选和本次拟新增能力需要区分。
- 官方约束核对日期为 2026-11-07：[Vue 初始化](https://vuejs.org/guide/quick-start.html)、[Vue 插值](https://vuejs.org/guide/essentials/template-syntax.html)、[pnpm 10 冻结安装](https://pnpm.io/10.x/cli/install)、[pnpm 10 workspace](https://pnpm.io/10.x/pnpm-workspace_yaml)、[shadcn-vue 主题](https://www.shadcn-vue.com/docs/theming)。这些资料支持语法、配置和机制判断，不证明裁剪后的依赖组合或新命令已经运行通过。

本文件采用仓库现有 `.template-source/design/` 位置；`docs/superpowers/` 被本仓明确列为不提交的本地输出，因此不向忽略目录强制添加文件。
