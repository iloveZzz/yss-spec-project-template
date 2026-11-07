# shadcn-vue 组件复用能力优化实施计划

> **For agentic workers:** 按用户选定的方式，使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 逐项实施。步骤以复选框记录；本仓不维护或分发脚本、测试套件，不设置逐任务审查门禁或自动提交。验证采用现有工具、临时工程和明确标注的方法演练。

**Goal:** 让现有设计与前端应用技能在页面任务授权内自主补齐兼容的官方 shadcn-vue 组件，并保留用户明确的升级、定制覆盖及全局主题决策边界。

**Architecture:** 复用应用技能的 `component-engineering.md` 维护共享组件方法；设计技能读取并分发该叶子文档。三个技能保留职责，最小 starter 仅增加组件配置和说明，Frontend Bundle 通过现有 CLI 分发。

**Tech Stack:** Vue 3、TypeScript、ESM、Tailwind 4、Reka、本地 shadcn-vue；目标工程实际 Node/pnpm 与锁文件；既有 Rust CLI/Bundle 工具仅用于临时验证。

**Spec:** [已确认设计](2026-11-07-shadcn-vue-reuse-design.md)，用户于 2026-11-08 确认方案 A。

## 全局约束

- 共享内容源为根 `.agents/skills`；修改同名技能后同步根与 Frontend 的 WorkBuddy 副本，保留 Claude 链接。Backend 范围保持不变。
- 不新增技能、组件包、私有 registry、CLI 命令、脚本、测试套件、业务页面或默认运行依赖。
- 组件固定 revision 保持 `67c9a3926dc0a854507b325c6337ff2210d16379`；本次不更新 35 组登记清单、28 组随附快照及其原始摘要。
- Vue 3、ESM、Tailwind 4、Reka 基线保持不变；组件获取固定到官方不可变来源，CLI 精确版本不能代替组件来源固定。
- starter 保留 Button/Input、utils、package/lock 和现有主题；新增配置不能通过 init、apply 或 preset 重置源码。
- 大版本升级、覆盖/修改已有定制组件、新增或修改全局主题映射与变量时，先交付具体影响与处理方案，由用户决定。有效决定不重复询问。
- 只读研究/review、纯文案、技能安装与仅生成源码保持各自范围；提交、推送、部署、发行沿用对应授权。
- 本计划沿用模板内部设计目录，不进入安装载荷。用户已于 2026-11-08 选择本聊天直接实施；下列复选框与执行记录只标记实际完成内容。

## 复核重点

| 编号 | 输入或风险 | 预期行为与验证归属 |
| --- | --- | --- |
| R1 | 已有工程没有 `components.json` | 按实际目录使用固定源码或补齐准确元数据，不初始化重置工程；任务 1 定义，任务 4 演练 |
| R2 | CLI 已固定但默认 registry 内容会变化 | 组件仍有固定 revision、源路径和可核对摘要；任务 1 定义，任务 4 核对真实文件 |
| R3 | Spec 只安装设计能力，没有完整应用技能 | 共享叶子和它的引用可达，不暗中安装应用技能或 starter；任务 3 实际安装核对 |
| R4 | 新组件要求改全局主题、升级大版本或改已有定制 | 给出文件、调用方、差异与处理选项，未经决定不写入相关变化；任务 1 定义，任务 4 做方法演练 |
| R5 | 新组件能构建，但弹层主题、键盘或返回焦点异常 | 在真实浏览器核对交互与 Teleport 样式，不以构建替代；任务 4 |

## 任务 1：统一组件目录与接入方法

**修改文件：**

- `.agents/skills/yss-frontend-application/SKILL.md`
- `.agents/skills/yss-frontend-application/references/component-engineering.md`
- `.agents/skills/yss-frontend-application/references/integration-design.md`
- `.agents/skills/yss-frontend-application/references/source-adaptation.md`
- `.agents/skills/yss-design-system/SKILL.md`
- `.agents/skills/yss-design-system/references/shadcn-vue-prototype.md`
- `.agents/skills/yss-design-system/references/component-recipes.md`
- `.agents/skills/yss-design-system/references/integration-source.md`

**输入与产物：** 输入为设计第 3–5、7 节与当前固定清单；产物是共享参考正文、两个技能的按需入口，以及不扩充 vendor 的组件导航。供任务 3 分发的唯一新叶子依赖为 `.agents/skills/yss-frontend-application/references/component-engineering.md`。

- [x] **步骤 1：核对现役规则及冲突。** 读取上述文件和目标范围约定；定位“清单外组件必须等待维护者”“不使用未登记组件”等限制，以及依赖安装、固定 vendor 和主题保护规则。保留历史来源和已验证记录，只调整现役操作规则；不能只追加互相矛盾的新段落。
- [x] **步骤 2：扩展共享组件参考。** 按设计写入“项目已有 / 固定快照随附 / 固定清单登记 / 官方可选”四种状态、任务分类和官方入口；说明 Data Table、Date Picker 等组合能力。组件正文涵盖本地调查、固定来源与兼容选择、必要依赖/锁/导出、主题与交互、失败处理和实际交付；正文自包含，外部资料只作按需入口。
- [x] **步骤 3：写清 R1、R2、R4。** 无配置可使用固定源码；没有来源记录由 Agent 查事实；禁止将固定 CLI 当成固定 registry；对三个用户决策边界给出具体触发例子。缺包时可补齐同大版本必要依赖，但不能重搭工程、叠加表单/请求状态所有者或清理用户修改。
- [x] **步骤 4：接入两个技能。** 应用技能沿用 `references/component-engineering.md`；设计技能在缺失组件、扩充清单和主题适配的决策点引用项目根 canonical 路径。原型内可获取并记录清单外官方固定源码，模板共享 vendor 与原型锁保持原样。组件配方更新状态说明，复用既有筛选、侧栏、确认、搜索/日期及表格示例，不新增产品页。
- [x] **步骤 5：更新来源与核对正文。** 四份 integration/source 参考说明本轮是 YSS 自有操作规则适配，保留上游组件/Skill 记录，不伪造上游升级。核对新增链接、原有固定来源/许可、纯样式触发边界，以及 prototype 不生产化等既有职责。

**完成证据：** 三类用户决策边界与 R1/R2 的处理均可从共享参考直接定位；两个入口使用同一正文；未改变固定组件、依赖锁或业务范例。此项是源码核对，宿主行为留到任务 4。

## 任务 2：补齐 starter 元数据及脚手架说明

**创建文件：** `profiles/frontend/.template-spec/templates/frontend-starter/components.json`。

**修改文件：**

- `profiles/frontend/.template-spec/templates/frontend-starter/README.md`
- `profiles/frontend/.template-spec/templates/frontend-starter/provenance/README.md`
- `.agents/skills/yss-frontend-scaffold-generator/SKILL.md`
- `.agents/skills/yss-frontend-scaffold-generator/references/usage.md`
- `.agents/skills/yss-frontend-scaffold-generator/references/source-adaptation.md`

**输入与产物：** 按设计第 6 节原样采用 JSON 字段和值。`style=new-york-v4`、`tailwind.config=""`、CSS 为 `src/styles/main.css`、`baseColor=neutral`、`cssVariables=true`；aliases 对应 `@/components`、`@/components/ui`、`@/lib/utils`、`@/lib`、`@/hooks`。产物供任务 3 构建和复制，供任务 4 识别配置；不增加图标或 CLI 运行依赖。

- [x] **步骤 1：记录 starter 基线。** 保存本次将保留的 `src/components/ui`、`src/lib/utils.ts`、package/lock、`src/styles` 和现有 provenance 清单摘要，供改动后比较；临时记录不加入模板安装载荷。
- [x] **步骤 2：新增配置。** 创建设计中的 `components.json`，用 `python3 -m json.tool profiles/frontend/.template-spec/templates/frontend-starter/components.json` 核对语法；逐项核对 tsconfig/Vite 别名、现有 CSS 与 hooks 目录。不得执行 init 或 apply 来生成它。
- [x] **步骤 3：验证配置支持范围。** 将新增配置后的 starter 复制到独立临时目录，在隔离工具环境核对实际 shadcn-vue 版本与帮助，验证 schema 和配置解析。2026-11-08 npm 元数据返回的候选为 `shadcn-vue@2.9.0`，这只是待验证的精确版本，不宣称兼容；先查看其 `--help`/`info --help`，支持时在临时 starter 运行 `info --json`，断言 style、CSS 与解析后的 ui/utils/composables 路径符合本任务定义。若命令不存在，按该版本官方源码/配置解析器核验并记录限制，不伪造命令成功或更换组件 style。
- [x] **步骤 4：更新说明。** README 解释配置用于后续工具识别，颜色继续来自 YSS tokens；provenance 标明新增文件为 YSS 配置，不写入上游 `copied-files.json`。脚手架技能说明生成仍只复制资源；要求可运行页面时再由应用技能按任务 1 接入组件。
- [x] **步骤 5：核对范围。** 与步骤 1 摘要比较：既有组件、utils、package/lock 和主题完全相同；仓库内只多出配置与必要说明。运行兼容性结果在任务 4 的临时工程中完成，不将语法检查等同于 CLI 或浏览器验证。

**完成证据：** JSON 可解析且路径准确；有选定工具的真实解析结果或明确受限说明；未更新最小依赖和主题。配置无法准确描述现有工程时先解决事实，不以较新 preset 代替设计。

## 任务 3：同步分发与副本，并验证实际 Bundle

**修改文件：**

- `.template-source/distribution/bundle-profile.json`
- `profiles/frontend/.template-source/distribution/bundle-profile.json`
- `.template-spec/agents/frontend-skills-adaptation.md`
- `profiles/frontend/.template-spec/agents/frontend-skills-adaptation.md`

**同步目录：** 根 `.workbuddy/skills/` 与 `profiles/frontend/.workbuddy/skills/` 下的 `yss-design-system`、`yss-frontend-application`、`yss-frontend-scaffold-generator`，仅同步任务 1、2 实际改动的受管内容。根 `.claude/skills/` 中这三个链接核对即可，不创建 Profile 内软链接。

**输入与产物：** 输入为任务 1 的共享叶子和任务 2 的 starter；产物是 Spec/Frontend 两种安装模式的完整引用、相同技能副本，以及包含当前模板修改的临时 Bundle/候选程序。候选的临时根和程序路径交给任务 4 复用。

- [x] **步骤 1：新增四处叶子资源声明。** 在根与 Frontend 的 `installations.project.skillReferences.yss-design-system`、`installations.skills.skillReferences.yss-design-system` 数组追加共享叶子，保留原条目并去重。不要追加完整应用技能依赖或 starter 引用；检查现有 `manifest.allowFiles` 已覆盖该叶子与 starter 前缀。
- [x] **步骤 2：同步来源说明及副本。** 两份 frontend-skills-adaptation 追加相同的本轮取舍和引用分发说明；同步上述六个 WorkBuddy 目录的改动文件。逐文件比较内容与必要属性，核对 Claude 链接解析到主源；不覆盖非本次改动。
- [x] **步骤 3：核对集合与锁。** 与执行前快照比较默认/可用技能集合、公共清单及 Backend 内容，应保持相同。本轮读取的根与 Frontend 三个相关 `skills.shared` 条目没有 `effectiveHash`，来源与 `adaptationRef` 仍适用，因此不为内容变化改写这些锁或上游身份；执行时若相关已存在有效摘要才按维护规范更新。不要新增锁字段或批量重算 Backend。
- [x] **步骤 4：构建临时候选。** 按下方命令使用现有 CLI 的已提交源码快照构建 Bundle 与原生调试程序。只在临时本地 clone 写入 `assets/bundle.tar.gz` 和编译产物；不改 CLI 原工作区、不替换全局安装。核对候选 `version` 和 catalog 的实际 Bundle 摘要、模板 HEAD/工作区状态，确保包含本轮资源。
- [x] **步骤 5：验证安装与 R3。** 使用候选程序分别执行 `init --profile spec|frontend --installation project|skills` 四种组合；Frontend 随后执行 `skills ensure yss-design-system`。断言四种路径均有正确共享叶子，设计入口的本地引用可达；Spec 有该叶子但没有完整应用技能 `SKILL.md` 或 starter。安装本身不生成 `src/`、应用 package/lock，skills 模式不生成项目 README/CONTEXT/DESIGN。只用现有 init/ensure 参数，不虚构“仅安装一个技能”的新选项。
- [x] **步骤 6：生成并核对源码。** 通过候选 `scaffold frontend` 在新目录生成最小工程，确认含新配置并与任务 2 原字节一致，其他 starter 原字节复制（package.name 除外）；源码生成不安装依赖。核对新 `.yss/scaffold.json` 与实际来源，不把配置增加解释为接管应用源码。

以下为规划时列出的命令；后续实际执行结果见文末记录。命令逐条执行并检查退出码，目录均为本任务新建。

```sh
# 在模板工作树记录实际根；临时根转成物理路径，避开 macOS /var 链接。
reuse_template_root="$(git rev-parse --show-toplevel)"
reuse_check_root="$(python3 -c 'import os,tempfile; print(os.path.realpath(tempfile.mkdtemp(prefix="yss-shadcn-check-")))')"
reuse_cli_source="/Users/zhudaoming/Projects/yss-cli"
reuse_cli_commit="$(git -C "$reuse_cli_source" rev-parse HEAD)"
git clone --no-hardlinks "$reuse_cli_source" "$reuse_check_root/cli"
git -C "$reuse_check_root/cli" checkout --detach "$reuse_cli_commit"
```

在新 clone 目录执行，先核对 `yss-bundle --help` 与当前命令形状，再构建：

```sh
cd "$reuse_check_root/cli"
cargo run --locked --target-dir "$reuse_check_root/target" --bin yss-bundle -- --help
cargo run --locked --target-dir "$reuse_check_root/target" --bin yss-bundle -- --source-root "$reuse_template_root" --out "$reuse_check_root/cli/assets/bundle.tar.gz"
cargo build --locked --target-dir "$reuse_check_root/target" --bin yss
reuse_candidate="$reuse_check_root/target/debug/yss"
"$reuse_candidate" version --json
"$reuse_candidate" scaffold catalog --json
```

安装命令示例，其余三种 profile/installation 组合使用不同的新目录：

```sh
"$reuse_candidate" init --root "$reuse_check_root/frontend-skills" --profile frontend --installation skills --json
"$reuse_candidate" skills ensure yss-design-system --root "$reuse_check_root/frontend-skills" --json
"$reuse_candidate" scaffold frontend --project-name component-check --output-dir "$reuse_check_root" --json
```

**完成证据：** 候选 Bundle 身份明确，四种安装及实际生成取得预期文件；R3 的断言成立；没有修改 CLI 原工作树或全局安装。包构建后若继续修改安装载荷，应重建并重做受影响验证；实测记录写在本计划的执行记录内，避免仅为记录结果改动载荷。

## 任务 4：验证组件接入、交互和决策边界

**仓库文件：** 不新增运行示例或套件；仅在本计划追加实际执行记录。所有演示源码、依赖变化和浏览器证据保留于任务 3 的临时根或既有任务证据位置。

**输入与产物：** 使用任务 1–3 的真实技能文件与候选生成工程；产物是带明确来源的临时接入、工程/浏览器结果及受限说明。不把演练组件回填 starter。

- [x] **步骤 1：验证最小工程。** 在 `component-check` 内检查 Node、pnpm、packageManager、父 workspace，按声明环境依次执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm dev`，实际打开入口并核对 Button 键盘访问。每条退出码为 0 才记录对应通过；版本不符时使用隔离工具，不修改全局配置。
- [x] **步骤 2：接入 Switch 并核对 R2。** 从固定清单取得 `ui/switch/Switch.vue` 与 `ui/switch/index.ts` 到临时工程，校验原始 SHA-256 分别为 `fa34a3e41056e770122745618cb73b3c38d3cdd5af31800089a02524951f1d6a`、`77041a4a0e966168bb9dc8def328d4b2658d49ec3d4fb584c7cdb8878254a275`。核对实际 imports/依赖后增加可访问名称、布尔绑定和禁用状态的临时页面；通过既有 token 或局部 variant 适配尺寸。记录源 revision/path/digest，适配摘要另记，不能覆盖原始摘要。
- [x] **步骤 3：接入代表弹层并验证依赖补齐。** 按同一固定来源取得实际需要的 Dialog/Sheet 及子组件；根据 imports 补齐临时工程中缺少的图标、动画等必要依赖和锁，所需支持资源不能改写全局主题。演示至少有触发器、可访问标题、正文、取消/关闭操作；不增加冲突的焦点陷阱。若真实接入需改全局映射，先形成影响方案并等待对应决定，其他独立验证继续，不为完成演练擅改主题。
- [x] **步骤 4：执行工程与浏览器验证。** 在完成依赖和组件变化后，重新冻结安装并执行 lint、typecheck、build。浏览器在 1440×900 与 390×844 验证 Switch 的切换/禁用、可见焦点，弹层的开启、Tab/Shift+Tab、Escape/取消、关闭焦点返回及 Teleport 颜色/长内容滚动；对照同条件设计与原页面，说明实际视觉差异。只在新变化、失败或未解决问题存在时扩展或重复检查。
- [x] **步骤 5：演练 R1 与 R4。** 在独立临时副本中移除组件元数据（不删业务文件），用实际目录完成已固定来源的接入并核对既有源码/主题保持；再构造三条仅用于方法演练的请求：组件需要现有 Reka 大版本升级、覆盖带本地改动的 Button、补全局 card 颜色映射。预期输出为具体文件/差异/调用方影响与处理选项，相关文件保持原字节；没有用户决定不得实施。记录真实读取的技能路径与演练方式，不把手工推演或明确加载正文后的表现当成自动发现已验证。
- [x] **步骤 6：交付记录。** 逐项记录来源、实际文件、精确工具/依赖、命令与退出结果、浏览器观察、三项边界处理和未完成事项；与复核重点 R1–R5 对应。在当前模板执行 `git diff --check`，并单独检查新增未跟踪文档的空白/引用；最终差异只包含授权内容。未提供真实业务/API 时不宣称联调、生产可用或完整业务还原；不提交、推送或发行。

**完成证据：** 新配置可被选定工具识别；临时工程能按规则取得缺失组件、保持主题和交互；组件来源与依赖闭包可核对；关键检查与受限项如实记录。CLI 与宿主的验证范围分别说明，未取得可见宿主调用证据就保留该限制。

## 计划依据与当前检查

2026-11-08 已实际读取本机 `yss version --json`、前端帮助、catalog、init 与 ensure 帮助：全局程序为 3.3.1，内嵌 Bundle 为 `20a2541ca56f99582466e6e2dc7cd7c993ca1a493ad77d687a3c32d8c4cae552`。另读取的 CLI 仓库 HEAD 为 `6755d53c2590a79dcfefd139f649ee698eed06ef`，package 版本为 3.3.0；两者不能冒充同一候选。实施时重新记录所用来源，不为匹配全局版本而修改 CLI 版本号。

官方 `schema.json` 在设计调研时返回 403；规划阶段读取到固定上游 [`get-config.ts`](https://github.com/unovue/shadcn-vue/blob/d9aec43ae5eb258d62d532cc788c0f693c07bd5b/packages/cli/src/utils/get-config.ts)，可见 new-york-v4 和 composables 路径处理，但未运行候选 npm CLI，因此不证明发行版完整支持。npm 候选版本来自本次读取的[官方包元数据](https://registry.npmjs.org/shadcn-vue/latest)，计划实施时使用已选精确版本而非 latest。

本计划自检覆盖设计第 3–5 节（任务 1）、第 6 节（任务 2）、第 7 节（任务 3）、第 8–9 节（任务 3–4），保留第 2 节已选方案。共享路径、配置字段、命令参数与临时根在任务间一致；R1–R5 均有具体观察与归属。没有新增业务规则或对外动作授权。

## 执行记录

实施工作树：`/Users/zhudaoming/.codex/worktrees/shadcn-vue-reuse/yss-spec-project-template`，分支 `codex/shadcn-vue-reuse`，基线 `9887d0d9915a9edcf9679dca16a236cef0fd5efa`。

Ruling：按仓库约定使用本计划记录进度，不运行技能附带的 SDD 脚本、不新增套件或自动提交；验证沿用已确认计划。若实际行为证据不足，保留未验证说明，不以结构检查代替。

任务 1 完成：三个技能共检查 95 个本地 Markdown 引用；624 个受保护文件中只有两份获授权的 starter README 变化，固定组件、依赖锁、主题、Backend 与相关锁/公共清单保持原样。任务 2 完成：shadcn-vue 2.9.0 的实际 info --json 正确解析 new-york-v4、Tailwind 4、CSS 和 ui/utils/composables 路径；未执行 init/apply，原有 starter 组件、package/lock 与主题字节不变。

任务 3 完成：22 个 WorkBuddy 文件同步，三份 Claude 链接有效；Spec/Frontend 的 project、skills 四种路径各有 57 个设计 Markdown 本地引用可达，Spec 仅含共享叶子、无完整应用技能。候选 CLI 3.3.0（源码 `6755d53c2590a79dcfefd139f649ee698eed06ef`）内嵌 Bundle `28494f763ee9e3ffdc9dcb9b75af967cbfc1086f8e9e7bd2589968a6ad0514a0`；实际生成逐文件符合 starter，新配置已复制，无 node_modules。CLI 原工作区和全局安装未改。

Ruling：验证按候选 3.3.0 的真实 catalog.frontend.bundleDigest 读取摘要；初版临时断言误用了全局 3.3.1 的顶层字段，检查输出后已更正并重跑，未修改 CLI。若忽略此版本差异会错误判断新载荷未验证。

任务 4 实测发现：DialogFooter 固定原文含上游 registry 路径，类型检查 TS2307 且浏览器无法解析。已在临时目标组件改写为实际 UI 别名，原始摘要与适配后摘要分别保留，模板 vendor 不变；共享叶子补充该具体导入规则并同步两份副本。该载荷变化将在最终 Bundle 重建后重验安装，不沿用旧摘要宣称最终分发通过。

Ruling：浏览器观察到 Dialog 的 as-child 转发将按钮 data-slot 改为 dialog-trigger/dialog-close，原 starter 针对 data-slot=button 的密度规则不再命中。临时演练页通过局部 demo-button 类消费既有高度、字体、圆角和内边距 token，保持原 32px/14px；不修改 Button、全局主题或模板组件。若忽略此组合差异会出现尺寸漂移。

任务 4 完成：候选生成工程与接入 Switch/Label/Dialog 后的临时工程均冻结安装、lint、typecheck、build 通过；新增运行依赖 @lucide/vue 1.28.0 与开发依赖 tw-animate-css 1.4.0 仅在临时工程。无 components.json 的独立副本也通过冻结安装与三项检查，既有组件/主题和 package 声明保持。

IAB 实际浏览器在 1440×900、390×844 验证：Space 往返切换、指针切换、禁用状态、键盘开启、Tab/Shift+Tab 焦点循环、Escape/取消/完成后的触发器焦点返回、Teleport 白色背景与长内容滚动（实测 scrollTop=380）、窄屏无页面横向溢出且底部操作可见。组合按钮局部适配后为桌面 32px/14px、窄屏 44px/14px，主色 rgb(13,107,233) 与原基线一致。截图在工具中查看，未导出独立图片文件；已复位视口、关闭临时页并停止本任务 Vite 进程。

R4 为显式读取修改后参考的人工方法演练，三项输入分别提供具体依赖/文件/调用方影响与处理选项，package/lock、本地定制标记及全局主题保持原字节；不证明宿主自动发现或所有任务的 Agent 行为已验证。Safari、真实移动设备、人工读屏及真实业务/API 未验证。

最终分发复验完成：Bundle `8c1cb14a8669e8dff3121bb69c383bd27c9a90c9c5ec28cf028bd50c5494ba05`（模板工作树快照 `bad02d3210c9419544042010e1f900e51528e0456a19652d8bcd4b46d2071616`），使用同一 CLI 源码重新构建候选，四种安装各有 57 个设计本地引用可达，新增叶子与当前正文一致；最终生成源码逐文件一致，只有 package.name 按输入变化。源清单、vendor、锁、默认技能集合、Backend 及主题仍通过 624 文件基线核对；22 个副本文件一致，当前 diff --check 通过。

验证日志、临时原型与方法记录：`/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-shadcn-check-md6p7nz0`。任务源改动已完成，整体独立审阅未发现需要修复的问题；未提交、推送、部署或发行。

最终独立审阅：只读检查工作树差异、三份未跟踪成果、22 个副本、最终四个安装目录、Bundle 摘要与真实配置/工程日志，未发现 Critical、Important 或 Minor 缺陷。审阅者未重新执行浏览器；界面结论来自本次 CUA 实测。

最终取舍：

- Ruling：保留临时验证而不新增永久套件/脚本，符合仓库约定；未来新增运行逻辑仍需相称验证。若将当前临时样本外推到全部组件组合，会漏检未覆盖路径。
- Ruling：as-child 密度在临时目标局部适配，不改模板 Button 或全局主题，符合用户保护范围；实际项目组合仍需实测，否则可能出现尺寸差异。
- Ruling：宿主自动发现、Safari、真机与读屏保留为未验证，不冒充已覆盖；风险是其他宿主可能没有选用本地技能，设备行为也可能不同。
- Ruling：规划期命令说明标为历史，真实状态以执行记录为准，保留原设计要求；若混用两个时点，会误读完成状态。

Deferred minors：无。分支与工作树保留，CLI 原工作区、全局安装及主目录既有工作保持；没有提交、推送、部署或发行授权的扩大。
