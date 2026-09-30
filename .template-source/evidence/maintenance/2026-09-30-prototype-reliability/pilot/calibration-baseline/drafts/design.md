# 资料维护设计样例

本样例承接查询、资料详情、名称与负责人编辑，以及首次保存失败后的恢复路径。交付入口为 [离线原型](docs/.scratch/pilot/design/prototypes/index.html)，作者配置为 [prototype.config.json](authoring/prototype.config.json)。保留整个 `prototypes/` 目录即可携带全部资源；打开 `index.html` 无需安装依赖或运行构建服务器。

这是 `template-source` 仓库中的可丢弃维护评测，所有资料均为虚构数据，仅供 `test-data-only` 演练。没有创建产品 Spec、Ticket、OpenAPI、Slice 合同、真实用户批准或独立审查结论，不代表产品研发阶段通过或可发布。

## 设计输入与范围

| 输入 | 本样例的使用方式 |
| --- | --- |
| [fixture/brief.md](../fixture/brief.md) | 约束查询、详情、编辑、保存失败后再次保存、重置行为；不增补未列出的业务能力。 |
| [fixture/scenarios.json](../fixture/scenarios.json) | 唯一数据来源；原字节复制到 [共同场景](authoring/scenarios.json)，包括 primary、failure 两个场景。 |
| [CONTEXT.md](../CONTEXT.md) | 消费模板维护、原型交付物及验证证据的既有术语。资料业务只是临时 fixture，没有新建稳定业务词汇。 |
| [DESIGN.md](../DESIGN.md) | 视觉规范源：浅色中后台、正文 14px、默认控件 32px、主按钮高对比变体、控件 6px 与容器 8px 圆角、分层表面。 |
| [设计治理](../.template-spec/design/design.md) | 约束原型与生产实现边界、状态反馈和六轴 QA。 |
| [默认 Token CSS](../.template-spec/design/tokens/variables.css) | 包内 `tokens.css` 的原字节来源；直接消费默认主题，不应用 compact 或 dark。 |
| [fixture/existing](../fixture/existing/index.html) | 参考查询区、资料列表、详情／编辑弹窗的既有页面组织及字段顺序；其中未出现在本次 brief 与共同场景中的示例分支不进入本次样例。 |

使用 [yss-prototype-stage](../.agents/skills/yss-prototype-stage/SKILL.md) 和 [yss-design-system](../.agents/skills/yss-design-system/SKILL.md)。适用 reference 为原型技能下的 `prototype-profile-routing.md`、`shadcn-integration.md`、`product-design-adapter.md`、`comparison-tool.md`、`concept-comparison.md`，以及设计系统下的 `design-system.md`、`enterprise-craft.md`。说明文字按 `.template-spec/process/document-writing.md` 的共用写法组织。

影响面仅为 `drafts/` 内的维护样例，不修改模板、共享 Skill、投影、锁文件或校验器。产品生命周期流转及 `context_reconciliation` 为 `not-applicable`：仓库身份为模板源，任务明确限定为演练。按用户要求不运行全仓验证。一次性原型未进入生产 `behavior-tdd`；可执行验证采用指定构建及便携包校验，业务浏览器验证另列缺口。

## 候选判断与保持项

候选比较为 `not-applicable`。brief 已明确“不存在信息架构选择，不要额外探索”，且项目规范、既有页面模式和固定组件足以约束视觉方向。本次没有生成三个同质候选，也没有请求用户选择或制造选择记录。

采用 H2 `flow-review`，因为任务必须操作保存失败、保留草稿、再次保存与重置。视觉输入为 `design-system`，QA 口径为 `design-contract`。该选择说明制作范围，不表示 H2 全部浏览器验证已经通过。

保持三条资料的初始编号、名称、负责人、状态和版本；保留 M-002 的完整长名称。列表依次呈现编号、资料名称、负责人、状态、操作；详情只读展示所有资料字段。编辑只修改名称和负责人，编号、状态、版本保持原值，未增加版本递增或状态流转规则。查询、重置筛选、逐条查看／编辑、取消、保存和重置场景均有入口。

内容优先级为查询条件 → 资料列表及逐行动作 → 操作结果。评审场景位于独立辅助区域，场景名称从共同 JSON 读取。`server_rows`、`content`、`form` 等共同数据中的备用字段随包保存，但本次没有冲突重载、内容编辑、权限控制等需求，不将其扩展为新功能。

可调整项仅为项目规范内的排版、间距、表面层级、控件视觉与窄屏重排。未获得同视口浏览器前后截图，不能声称布局还原已验证。

## 页面与交互

桌面 `1440×900` 保持页头、标题、查询区、资料表格的顺序。表头用浅表面色，状态由文字配合状态点表达；长名称自动换行。每个决策区域只有保存使用 primary 变体；查询、查看、编辑、取消和重置使用次级按钮。

窄屏 `390×844` 在 `576px` 断点内将查询控件换行，把表格每条资料改为纵向字段行，保留字段名、完整名称、负责人、状态和两个操作。页面允许纵向滚动；宽表的横向滚动限定在组件容器内。弹窗宽度受视口约束，内容高度限制后在弹窗内滚动。

| 状态／事件 | 条件与动作 | 反馈与退出路径 |
| --- | --- | --- |
| 初始列表 | 无 hash 默认 primary；合法 hash 读取对应初始数据 | 显示三条资料和总数。 |
| 查询 | 在 `#keyword` 输入名称或编号，点击查询或回车；按去除首尾空格后的包含关系过滤 | 数量与列表同步；重置筛选恢复全部资料。 |
| 查询无结果 | 过滤结果为空 | 明确提示“暂无符合条件的资料”，提示修改条件或重置。 |
| 查看 | 点击“查看 M-001”等逐行动作 | 详情弹窗只读显示字段；“关闭详情”或 Escape 返回列表。 |
| 编辑草稿 | 点击逐行编辑；复制当前记录后修改 `#name` 与 `#owner` | 草稿不提前写入列表；取消或关闭丢弃本次草稿。 |
| primary 保存 | 提交 `#save` | 更新对应记录的名称与负责人，关闭弹窗，显示“保存成功（本地模拟）。” |
| failure 首次保存 | 当前场景尚未发生过保存失败 | 表单内 `role=alert` 显示“保存失败，输入已保留，请重试。”；全部草稿和列表原值保留。 |
| failure 再次保存 | 同一场景已发生首次失败 | 再次点击同一个“保存”按钮即成功；提交当前完整草稿，无需另一个重试按钮。 |
| 场景切换／重置 | 选择 primary／failure 或点击“重置场景” | 重新初始化并以新 ticket 重建页面，清除筛选、弹窗、草稿、错误、成功反馈和首次失败标记，恢复共同 JSON 的初始资料。 |
| 场景入口错误 | 未知、空场景 ID 或不合约的 hash 参数 | 调用 runtime.fail，显示“场景入口错误”和具体原因；切换至合法 hash 可重新初始化。 |

仅实现 brief 命中的状态。loading、no-permission、conflict、批量操作、真实服务端错误码、分页、上传下载均为 `not-applicable`，理由是本次没有相应行为输入。没有添加字段必填、长度或负责人候选范围等业务限制。空文本以“—”展示，不修改原值。

## 组件、Token 与初始化

采用固定原版 shadcn/ui 的 Button、Input、Label、Dialog、Table，分别承接按钮、输入、表单标签、详情／编辑弹窗和资料列表；组件源码未修改。负责人使用 Input，避免凭空限制可输入的负责人。Dialog 使用已有焦点圈定机制，并在作者代码中设置打开时的名称输入／关闭按钮焦点及关闭后的触发按钮焦点；记录因筛选消失时回到查询输入。实际键盘效果尚待浏览器验证。

作者 CSS 在固定 `theme.css` 映射之上消费项目 `--brand-*` 和 `--yss-*` 变量，覆盖控件高度、按钮层级、间距、表格和弹窗。状态正文使用主文本色，颜色只作辅助；保存按钮使用 `--yss-color-primary-control`。映射没有新增页面级色值，也未修改只读 Token 输入。派生 CSS 的部分浅色／排版值与根规范并非逐项同值；本次使用包内现有变量，并将主标题明确映射为规范的 24px／1.333。精确视觉和计算样式合规仍需外部复验，不把构建成功视为 Token 全量一致性证明。

入口调用 `window.prototypeRuntime.initialize()`，取得场景独立数据副本和 ticket；React 完成该 ticket 的首次提交后通过 effect 调用 `ready(ticket)`。非法入口调用 `fail(error)` 并渲染可读错误，不静默回退。支持 `#scenario=primary`、`#scenario=failure` 和既有父窗口请求协议；初始化确认不作为业务动作通过证据。

本轮构建使用用户指定命令，随后执行指定校验：

```sh
node fixture/build.mjs drafts/authoring/prototype.config.json
node fixture/qa.mjs
```

作者源码为 [main.tsx](authoring/main.tsx) 和 [styles.css](authoring/styles.css)。构建包装器在 `drafts/` 内创建规范快照和临时文件，并只读消费 `.eval-deps/toolchain`；没有执行安装、联网、Git 或包管理器命令。产物为 IIFE、本地 CSS、共同场景、runtime、组件来源和许可证，接收者无需 Node。来源与摘要由 [build-provenance.json](docs/.scratch/pilot/design/prototypes/build-provenance.json) 和 [adapter 清单](docs/.scratch/pilot/design/prototypes/yss-prototype-adapter.json) 自动记录，不以 CLI 版本冒充组件版本。

实际遇到文件名大小写冲突：本机 `drafts/DESIGN.md` 与 `drafts/design.md` 的 inode 相同。写入本说明后，包装器创建的同名规范副本不再能作为源快照，首次字节检查以退出码 1 发现差异。已将规范与 Token 的完整副本隔离到 [project-snapshot](project-snapshot/DESIGN.md)，本说明保留要求的小写文件名，离线包及其来源摘要保持原样。最终使用同一个本地校验函数，分别对原仓规范和隔离快照校验：

```sh
node drafts/verify-final.mjs
```

原始 `fixture/qa.mjs` 固定使用 `projectRoot=drafts`，在最终说明存在时仍会因上述冲突失败；没有修改只读包装器或伪造摘要来消除该错误。重新构建前需保留本说明，因为包装器仍会覆盖这个大小写不敏感的路径，且不会覆盖非空原型目录。

## 验证观察与限制

| 实际执行 | 结果与证据 | 能说明的范围 |
| --- | --- | --- |
| 指定构建命令 | 退出码 0，[build.log](build.log) | 固定工具链成功生成作者业务代码的离线包，并生成来源清单。 |
| `node fixture/qa.mjs`（写设计说明前） | 退出码 0，输出 `portable bundle validated`，[qa.log](qa.log) | 当时的 H2 便携包结构、资源、来源摘要通过现有本地校验器。 |
| `node fixture/qa.mjs`（最终说明存在时） | 退出码 1，`当前项目来源已漂移: DESIGN.md`，[qa-after-documentation.log](qa-after-documentation.log) | 暴露包装器快照与要求的说明文件在本机同名的限制；不能用前次成功替代最终结果。 |
| `node drafts/verify-final.mjs` | 退出码 0，[final-qa.log](final-qa.log) | 最终包在未修改清单的情况下，通过同一校验函数对原仓输入及隔离快照的校验；场景与快照字节一致。 |
| 原始场景与作者副本字节比较 | `true` | 作者数据没有重写共同场景。 |

上述退出码来自本轮实际执行。未调用命令替身执行构建或依赖安装，也未把替身成功作为证据。文件摘要及输入快照比对见 [input-digests.json](input-digests.json)。

统一六轴的当前证据边界：

| 轴 | 源码／包内可观察项 | 未执行项 |
| --- | --- | --- |
| visual | 项目 Token 引用、默认密度和单一保存主按钮 | 实际计算样式、颜色对比度、截图及视觉回归。 |
| layout | 双视口对应 CSS、长名称换行、弹窗尺寸限制 | 1440×900 与 390×844 的真实渲染、溢出及同状态前后对比。 |
| interaction | 首次失败标记、草稿隔离、再次保存、按 ticket 全量重置和错误入口已编码 | 浏览器点击、真实场景回放、焦点恢复和 hash 切换实测。 |
| content | 三条原始资料及共同 JSON 字节一致；保留长名称和状态文本 | 浏览器中所有字段、按钮文案的可见性检查。 |
| accessibility | Label、表头、Dialog 标题／说明、alert／status、可见焦点样式和 reduced-motion 规则 | 实际 Tab／Escape、屏幕阅读器、200% zoom、目标尺寸和无障碍扫描。 |
| cross-platform | 静态便携包校验通过；脚本与资源为本地相对路径 | 脱离源仓的 `file://` 浏览器离线运行及不同浏览器兼容性。 |

按本次演练安排，浏览器行为由外部评分，本轮未进行浏览器截图、console／网络记录或离线行为实测，未生成 Visual Baseline，也未声称 H2 六轴全通过。外部复验应在两种视口分别执行查询／空结果、详情关闭、primary 保存、failure 修改两个字段后失败保留及再次保存、场景重置、合法／非法 hash，并检查键盘、焦点、200% zoom 和 reduced motion。

独立低保真／原型评审与真实用户确认均未执行；这是用户明确限定的演练，不伪造另一 Agent 或批准记录。没有调用 `yss-ui`，不声明生产组件兼容性，不向生产实现或正式发布流转。
