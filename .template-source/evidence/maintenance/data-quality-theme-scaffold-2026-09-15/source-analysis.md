# Data Quality 前端脚手架抽取研究

本次只读检查支持把 Data Quality 的机械结构抽为 `data-quality-v1` 随包 starter。可复用 Vue 3 / TypeScript / Vite / Pinia / Vue Router / Ant Design Vue / YSS UI 结构，以及 Qiankun 与 standalone 分支。不能原样复制整个业务工程：它有不一致的依赖锁、缺失的 JSP 配置、业务菜单和接口、默认管理员 PoC、全局样式清理逻辑，以及包含认证配置的 `.npmrc`。

研究边界：`technical-evidence`、源代码优先、只读维护研究；并非产品生命周期资产或批准。输出只能写入 `/tmp/yss-data-quality-scaffold-research.md`。来源 root：`/Users/zhudaoming/yss-datamiddle-quality/new-quliaty/apps/frontend/next-gen-data-quality`。当前 HEAD 与文件 SHA256 在文末，dirty 源文件单列。没有安装依赖、执行构建、调用 API、访问源项目私网服务、写入源码、提交或推送。

## 已验证事实及影响

| ID | 源码事实 | 来源 | 对模板的影响 |
|---|---|---|---|
| S01 | pnpm 单工作区，实际应用根 `packages/`；根命令转发，子包 Vite 编译，源码 `packages/src/` | `pnpm-workspace.yaml:1-13`; `package.json:7-25`; `packages/package.json:6-17` | 保留该机械布局；避免复制根/子包重复工具版本和不必要工具 |
| S02 | 真实运行时是 Vue3 + ant-design-vue4，不是 React antd6；入口安装 Antd 和 YSSUI，reset.css 与 YSS style.css 均引入 | `packages/package.json:19-38`; `packages/src/main.ts:1-25,84-96`; `pnpm-lock.yaml:103-197` | DESIGN.md 可以采用 AntD6 视觉语义 + Data Quality token；脚手架运行框架仍 Vue/YSS，不把视觉主题版本写成实际依赖版本 |
| S03 | Qiankun 使用带 activeRule base 的 history；JSP 代码分支为 hash；standalone 为 `/` history。Qiankun 初次导航从宿主完整地址推导子路由 | `packages/src/main.ts:40-82` | 分离部署模式和资源 public base；默认提供 Qiankun/standalone，JSP 只有补全配置和验证后才作为可选模式 |
| S04 | 微应用 mount / unmount / update 已有 router/history/bridge 生命周期；container 优先内查 `#app` 或子应用 ID | `packages/src/main.ts:98-140` | 可借用生命周期骨架，替换 any 并检查空容器；保证取消定时器、清理监听和主题副作用 |
| S05 | 路由桥解析前缀边界、保留 query/hash，处理宿主事件和 popstate，旧 chunk 一次刷新预算，成功导航清理标记，返回清理回调 | `packages/src/utils/microAppRouterBridge.ts:42-79,100-144,159-264` | 是最成熟的可复用基础设施；保留测试 seam 和完整 dispose；改品牌存储前缀时记录偏差 |
| S06 | Bridge v1 的 routerBase / theme DTO 都是可选类型；mode 为 serializable booleans，仍保留 algorithm 数组兼容 | `packages/src/types/microAppBridge.ts:1-28`; `packages/src/store/theme.ts:330-345` | 保留版本化 DTO。版本目前只存在 TS 类型，runtime 未显式校验未知版本；新 starter 应明确未知版本策略 |
| S07 | Vite 为 Less 注入 variables.less，使用别名与 Vue/Antd/Formily dedupe，关闭 mock；dev origin 和端口硬编码，prod base 从 activeRule 删除 `/subApp/` 推导 | `packages/vite.config.ts:10-20,33-55,56-83` | 保留别名、单例去重、Less；端口/origin/proxy/publicBase 从 starter 参数或 env 生成，不能继承数据质量标识、私网地址 |
| S08 | 路由是业务菜单树 + flatten leaves + hidden routes；layout 有数据质量品牌和异步任务抽屉，默认 Admin；菜单 helper 又依赖 PoC 角色 | `packages/src/router/index.ts:20-249`; `packages/src/layout/MainLayout.vue:11,26-30,47-68,92-100`; `packages/src/hooks/useRouteMenu.ts:4-36` | 只抽取泛化菜单与路由算法。生成空白首页/404，删除业务页面、业务任务抽屉、假用户和 PoC role |
| S09 | Orval axios single 模式从本地 `openapi/openapi.json` 生成 typed client，接入 `customInstance` | `orval.config.ts:3-22`; `package.json:22-24` | 保留本地冻结契约 → 生成客户端 → 自有 mutator 的边界，路径可参数化；无 API 影响时不填造假业务 OpenAPI |
| S10 | sync-openapi 拉的是私网 Postman endpoint，转换到 OpenAPI3.0，运行 Orval 后重写 `api/modules/<module>.ts` 与统一 index | `scripts/sync-openapi.js:30-43,52-65,324-413,466-510` | 不白名单复用该脚本；默认生成不能访问网络或覆盖人工业务包装。由已冻结 OpenAPI 文件显式输入客户端生成 |
| S11 | 自定义请求返回 JSON body，blob 返回 `{data,headers}`；取 token/access_token 后加 Bearer；401 只删 token 并整页跳 `/login` | `packages/src/api/mutator.ts:5-39,42-80` | 保留 client seam 与文件响应语义；认证/storage keys/401 跳转须为宿主 adapter，避免脚手架固化门户行为 |
| S12 | 主题默认主色#3371ff，controlHeight32/24/40，圆角6/4/8；接入 Antd ConfigProvider，并向 documentElement 同步 YSS/Ant/VXE全局CSS变量 | `packages/src/store/theme.ts:38-126,159-219,294-348`; `packages/src/App.vue:1-21` | token 数值和主题映射可抽取。全局写入范围和恢复策略需重写；设计主题与运行时实现分开验证 |

## 精确依赖事实

以下是 `pnpm-lock.yaml` 当前解析结果，不等于“已经选择给新 starter 的最佳版本”或已通过新组合构建。

| 层 | 包 | 锁定版本 | 行 |
|---|---|---|---|
| Runtime | vue | 3.5.20 | 154-156 |
| Runtime | vue-router | 4.6.4 | 160-162 |
| Runtime | pinia | 2.3.1 | 151-153 |
| UI | ant-design-vue | 4.2.6 | 139-141 |
| UI | @ant-design/icons-vue | 7.0.1 | 106-108 |
| YSS | @yss-ui/components | 1.6.0 | 127-129 |
| YSS | @yss-ui/hooks | 1.1.3 | 130-132 |
| YSS | @yss-ui/utils | 1.0.6 | 133-135 |
| Forms | @formily/core / @formily/vue | 2.3.7 / 2.3.7 | 109-114 |
| HTTP | axios | 1.20.0 | 142-144 |
| HTTP | alova | 3.5.5 | 136-138 |
| Dates | dayjs | 1.11.23 | 145-147 |
| IDs | json-bigint | 1.0.0 | 148-150 |
| Hooks | vue-hooks-plus | 2.4.3 | 157-159 |
| Optional graph | @vue-flow/core | 1.48.2 | 121-123 |
| Optional graph | background / controls / minimap | 1.3.2 / 1.1.3 / 1.5.4 | 115-126 |
| Build | vite (actual packages build) | 6.0.5 | 186-188 |
| Build | vite (root tools) | 5.4.21 | 90-92 |
| Build | @vitejs/plugin-vue | 6.0.8 | 168-170 |
| Build | vite-plugin-qiankun | 1.0.15 | 192-194 |
| Build | vite-plugin-mock | 3.0.2 | 189-191 |
| Build | less | 4.9.1 | 75-77 |
| Build | sass | 1.104.0 | 180-182 |
| Build override | esbuild | 0.24.2 | 7-8 |
| Types | typescript | 6.0.2 | 183-185 |
| Types | vue-tsc | 3.3.11 | 195-197 |
| Types | @vue/tsconfig (packages) | 0.9.1 | 171-173 |
| Types | @vue/tsconfig (root) | 0.5.1 | 42-44 |
| API generation | orval | 6.31.0 | 81-83 |
| Quality tools | eslint / typescript-eslint | 8.57.1 / 6.21.0 | 27-32,54-56 |
| Quality tools | prettier / lint-staged / husky | 3.9.6 / 16.4.0 / 9.1.7 | 72-80,84-86 |

同一个源工作树已经安装的 vue、vite、plugin-vue、typescript、ant-design-vue 与上述锁版本一致；直接读取 `packages/node_modules/@yss-ui/components/package.json`（绕过 exports 限制）也为1.6.0，peer 包括 ant-design-vue `^4.0.7`。这只是现存 node_modules 元数据，不能作为全新安装成功证据。

具体冲突和反证：

1. `packages/package.json:31` 的 ant-design-vue specifier 是 `^4.2.6`，锁 importer 的 specifier 仍为 `^4.0.7`（lock139-141）。只读脚本逐一对比两个 importer 的所有 dependency/devDependency，只有这一项不一致。新 starter 不可复制该锁并声称 frozen-lockfile 一致；本次未运行安装，不把推断写成实际 pnpm 失败结果。
2. root engines 允许 Node>=18（package69-72），plugin-vue6.0.8 engines 为 `^20.19.0 || >=22.12.0`（lock2083-2088）；lint-staged16.4.0还要求Node>=20.17（lock3698-3700）。建议新 starter 只保留统一的、实际验证过的 Node线及 pnpm10.15，不复用过宽Node18声明。
3. 根 Vite5.4.21 与子包Vite6.0.5形成重复工具链；但 plugin-vue6.0.8 peer 明确允许Vite5/6/7/8，所以不能仅因两版并存就断言不兼容。根脚本转发后实际构建用子包Vite6.0.5。
4. 已安装 typescript-estree6.21.0 的 `dist/parseSettings/warnAboutTSVersion.js:36` 明确 supported `>=4.3.5 <5.4.0`；同树 TS 为6.0.2。这是可重现的支持范围冲突，尚未证实每个 lint规则失败。新 starter 必须挑选兼容的 parser/TS组合并执行 lint/typecheck/build，不能把参考项目的版本数字整体复制为合格基线。

## 最小白名单建议

建议维护显式文件清单与 sha256 manifest，随技能分发 `data-quality-v1`；它从源码抽取模式和必要代码，所有默认业务标识、环境地址、认证状态重置为参数或空白。这条路线不依赖源项目机器绝对路径。既有精准 Git commit 模板来源仍可保留兼容，source kind 必须区分。

| 范围 | 建议复用方式 | 不能原样保留的内容 |
|---|---|---|
| 根 `package.json` + `pnpm-workspace.yaml` + 单一根锁 | 重建机械脚本和统一工具版本，保留 packages 工作区、pnpm scripts | 作者/业务名称、双Vite和TS冲突、sync:api网络脚本、无用途 server/manager、脚本自动lint修复 |
| `packages/package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | 结构复用、参数化别名/端口/base/title、本地真实favicon | next-gen-data-quality、/subApp固定字符串、私网proxy、generated/quality优化排除、缺失vite.svg、缺失JSP脚本 |
| `packages/src/main.ts` | 抽取 createApp/Pinia/router/Antd/YSS/locale/Qiankun流程 | 未取消100ms定时器、any、空container无检查、私有`__yss_vxe_ui_installed__`绕过标记应确认库公开注册API后再用 |
| `types/microAppBridge.ts` | 基本可逐文件白名单复用v1 DTO；补运行时版本策略 | algorithm函数引用不能当作默认跨应用协议，优先mode布尔值 |
| `utils/microAppRouterBridge.ts` | 可复用路径与监听生命周期实现；保留配套测试；给key前缀去业务命名 | `__yuyan_*`品牌残留；事件absoluteURL未检查origin（本次验证会解析他域相同path），需要明确只收同源或相对路径 |
| `hooks/useQiankun.ts` | 基本可逐文件白名单复用 | 无业务耦合，但只检测环境，不等于已完成生命周期验证 |
| `hooks/useKeepAlive.ts` | 可选复用；仅当实际 shell 使用时纳入 | 不要保留未使用工具作为强制框架 |
| `router/utils.ts` | 抽取通用 path/default route helper，添加前缀段边界判断 | `normalizeMicroRoutePath`用startsWith直接去前缀，可误切`/app-other`；主控可以采用 bridge 内更严谨匹配 |
| `App.vue` + `layout/MainLayout.vue` + `RecursiveMenu.vue` | 只抽取ConfigProvider/分支布局/menu模型/keepalive，重写空首页和404 | 质量任务抽屉、Admin假用户、角色默认admin、业务菜单、非功能帮助/通知按钮 |
| `store/theme.ts` + `styles/variables.less` + token样式 | 从已确认主题映射生成新的 theme store 与 CSS；提供宿主theme adapter与dispose | 全局documentElement无恢复、共享localStorage key、JSP特定客户主题强制、App再次init覆盖主应用输入风险 |
| `api/mutator.ts` + `orval.config.ts` | 重写通用axios工厂和local frozen OpenAPI生成入口，保留JSON/blob区分 | localStorage token推断、401整页跳login、私网server、quality业务路径、自动删除requestBody、未知响应改never |
| `.eslintrc`/prettier等 | 保留可执行校验意图，用兼容工具重建，并使lint默认为check | 不排除人工mutator、真实配置；禁用test/quality的宽松设置不得机械继承 |
| `.env.example` / 文档 | 从干净参数生成；演示只用localhost/相对API | 原.env、`.npmrc`、CI、scaffold generation receipt、真实用户/生产配置 |

Starter默认不需要VueFlow、alova、sass、mock、iconfont网络脚本、Express、cors、micro-manager等。必要时根据实现合同按需加入；因为包已声明而带入不等于标准化。真实YSS表单/列表能力按源码引用和当前YSS组件事实明确最小依赖，禁止替换为假的业务组件。

## 必须排除或修订的源问题

- **JSP并未完整交付**：子package scripts8、10、11引用`vite.config.jsp-theme.ts`和`vite.config.jsp.ts`，文件库存不存在。根package dirty内容只删了build:jsp和build:jsp-theme，仍留dev:jsp-theme。当前源码虽有JSP theme/hash逻辑，但不能据此称JSP构建可用。
- **样式边界不够安全**：`styleManager.ts:33-47`扫全document的style，按vxe关键词识别；`54-67`直接disable，`91-98`注册全局事件无移除回调。其他微应用含vxe样式可能被本应用disable。`main.ts:111-114`延迟记录没有timer句柄，unmount没有取消。这是源代码直接支持的交叉应用影响路径，未做DOM重现。
- **主题恢复缺口**：theme store187-291向documentElement写许多Ant/VXE/legacy变量，main123-130卸载没对应恢复；`main.ts:95-96`传入宿主配置后`App.vue:49-50`又无参init，后者可读共享localStorage。推荐单点初始化、app范围存储key与宿主可控CSS目标/恢复。
- **PoC授权不能继承**：`useUserRole.ts:12-15`没有角色时默认admin；菜单helper/RecursiveMenu依赖此hook。新starter应提供空权限adapter、无保护功能默认不可访问，不把示例本地状态当平台鉴权。
- **请求宿主行为不能继承**：mutator52-76自己读token/access_token、401删token并整页导航/login，会影响门户。应显式注入授权头/未授权callback，不硬编码宿主路由。
- **来源含认证配置**：`.npmrc:4-5`有两个`_authToken`条目，读取时仅检查键名并打码值，没有输出其内容。整个文件不得进入starter；生成无凭证registry示例或只消费操作者外部配置。
- **生成器会改语义/覆盖人工层**：sync-openapi写`quality.json`，但orval读取`openapi.json`（sync32-35 vs orval6），两条生成源不一致；sync会覆盖`api/modules`而当前quality.ts带人工业务包装且dirty。transformer34-42删除空requestBody；schema cleanup31-33把unknown字典改成Record<string,never>，不可作为通用类型清理；flat-exports限定quality路径和getApi名字，当前模块又使用getApiApi，不能通用复用。
- **部署配置不是脚手架标准**：`.gitlab-ci.yml:14-33,127-137,141-177`携带现有Harbor/本地路径、推送、清理Docker、部署动作；不得带入新starter。`micro-config.json:17-30`的shared版本也落后于真实package/lock。
- **其他残留**：index.html:6指向不存在的vite.svg；micro-config62指向仓库不存在的nginx.conf（CI构建时才临时生成）；README138/214引用不存在的sync:generate脚本。原README仅作线索，不能生成这些声称有效的命令。

## 验证结果与下一步验证建议

实际只读检查在 Node v23.9.0 下进行：

- 读取HEAD/status、清单、逐文件行号；读源项目与lock importer、已安装包元数据；最后status与开头所见相同的17项dirty，没有本任务写入。
- 依赖specifier检查：只发现 ant-design-vue 一项漂移。脚本未调用pnpm。
- 缺失引用检查：两个JSP Vite config、vite.svg、nginx.conf均不存在。`packages/src`测试文件名扫描没有发现`__tests__`或`.test./.spec.`文件；这只是当前源码测试资产缺失，不能推断外部测试也不存在。
- 在内存中用源项目现有typescript.transpileModule编译路由桥，并通过vm加载其纯函数；验证前缀严格边界、尾斜线、query/hash、事件路径、chunk错误识别、一次刷新预算、storage抛错返回false，所有assert通过。未创建文件或DOM，也没执行真实mount/unmount。
- 初次尝试从模板根读取`yaml`模块失败（MODULE_NOT_FOUND，exit1）；未安装，改用只读固定indent解析lock importer成功（exit0）。读取YSS包的package.json先遇exports限制，后直接读取已安装包文件成功；不是依赖缺失。

新starter完成后建议主控至少执行：

1. 生成到全新临时目录；断言空/非空输出保护、替换参数、manifest文件摘要、没有用户机器绝对路径/私网地址/凭据/quality业务词；已存在目标拒绝覆盖。
2. 使用所声明Node/pnpm和新冻结锁，分别执行真实install--frozen-lockfile、lint:check、type-check、build、build:standalone；记录每个退出码，避免参考项目构建替代starter构建。
3. 本地浏览器启动standalone，以及有两个微应用的最小Qiankun宿主fixture。验证深链、query/hash、前进后退、宿主route事件、404、keepalive；挂载/卸载/重挂三轮后监听器/timer/样式归属没有泄漏或跨应用禁用。
4. 触发旧chunk加载失败，确认只刷新一次、失败事件汇报、成功导航恢复刷新预算；未知bridgeVersion与外域eventPath有明确拒绝行为。
5. 宿主theme变化时ConfigProvider、YSS和VXE颜色一致，默认Data Quality主色/尺寸计算值正确；卸载后宿主原始CSS变量保持或恢复；无宿主时独立默认值与DESIGN基线一致。
6. mock adapter验证客户端headers、baseURL、取消、JSON、blob文件名、401callback；无默认真实网络请求，无自动跳转到未约定/login；本地小型已冻结OpenAPI fixture证明可重现生成且不覆盖人工包装。
7. JSP若保留为可选profile，要另补实际构建入口、资源路径和hash深链测试，否则标记unsupported，不能保留死脚本。

## workflow-execution-result-v1

```yaml
schema: workflow-execution-result-v1
role: role.frontend-engineer
runtime_id: runtime.generic
execution_state: Explorer
workflow_status: completed-read-only-research
core_skills: [yss-ui, yss-ui-business-page-generation, yss-components, yss-formily, formily-foundation, formily-linkage-effects, formily-mode-slot-detail, formily-step-flow, ytable-usage, ytree-usage, yedit-table-usage, yss-api-integration, yss-hook, theme-token-usage, page-skeleton, page-list-module, page-form-module, component-selection-imports, vue3-best-practices, tdd]
forbidden_skills: [yss-domain, yss-application, yss-repository, yss-mybatis, yss-web-controller, yss-ddd-scaffold-generator, yss-layered-mvc-scaffold-generator, java-backend-commit]
changed_files: [/tmp/yss-data-quality-scaffold-research.md]
repository_changes: []
approval_actions: []
evidence_refs: [source-ledger-below, readonly-checks-above]
drift:
  - packages/package.json ant-design-vue specifier differs from pnpm-lock importer
  - source README and micro-config dependency/command description stale
violation: []
new_impacts:
  - bundled-source manifest must be separate from old exact-git source schema
  - runtime remains Vue/Ant Design Vue/YSS while prototype AntD6 visual reference is separate
  - style and theme lifecycle plus request-auth adapter require controlled reconstruction
blocking_signals:
  - original dependency lock and Node/parser declared support are not reusable as verified starter baseline
  - JSP build config missing
  - source .npmrc contains auth-token entries and must be excluded
  - no real starter install/build/browser evidence in this read-only research
recommendation: adopt-bundled-data-quality-v1-mechanical-starter-with-explicit-allowlist
final_decision_owner: parent-agent
```

## 来源账本

以下相对路径均以报告开头的源项目root定位。字节摘要为读取时工作树SHA256；`HEAD-equal`表示整个文件与当前HEAD一致，`working-tree-modified`表示本次输入包含已有未提交修改。

- 采集UTC：2026-09-14T17:21:57.248705+00:00
- 源HEAD：`532509a59856fc02f3b9bcb28a062663ce887d71`

| 文件 | 行/范围 | 字节SHA256 | 状态 |
|---|---|---|---|
| `package.json` | 7-25,39-75 | `b149b420e3c6357fddf8b504da0a28ea76f4af14b395ebaa0f2d6f006636f7c7` | working-tree-modified |
| `packages/package.json` | 6-58 | `185b19923d21c298aa42c0a48d64653eeadac946267492fc21706ba1329d02a9` | HEAD-equal |
| `pnpm-workspace.yaml` | 1-14 | `a85d5ef60b559b368ea97e215568255f3a60dae5e0ad8461e9691b3ccf50b0ca` | HEAD-equal |
| `pnpm-lock.yaml` | 1-197,2083-2088,3698-3700 | `8955161d4bcf14dd6da6c3e69aa191d284c90bd58c5f8cc935f15ee4ff69a0b5` | HEAD-equal |
| `packages/vite.config.ts` | 1-94 | `1e694a0a3bb56648e63018202b9d46106c1cfda243dcd46a7ee92f53a23523b8` | HEAD-equal |
| `packages/tsconfig.json` | 1-58 | `26de6e00434f853b227c90a683cf1947fc177bf36adcb2875adc4ee20a1bc6c8` | HEAD-equal |
| `packages/index.html` | 1-22 | `13326237b17be39427be67b84943c352bc5b097637d5a61f312deda79f74fa38` | HEAD-equal |
| `micro-config.json` | 1-65 | `ab9a0dc7f4bf2689d539fe17197f65f411a541f0b1693381e206fee6c4a34d1a` | HEAD-equal |
| `packages/src/main.ts` | 1-140 | `ba3452ec69a80213b2833c2344df9a8b383b2f80d4be3c3c8ddc1204ba30b031` | HEAD-equal |
| `packages/src/App.vue` | 1-85 | `a857c2d8ca598d0dd5940589bc15912b87268840556243019d674caecde59b1c` | HEAD-equal |
| `packages/src/types/microAppBridge.ts` | 1-28 | `054f8c35eb33196f4bddb56d26957776b783e2a84f965229891d13fb0dae1274` | HEAD-equal |
| `packages/src/utils/microAppRouterBridge.ts` | 1-264 | `137c1087345a3b9597b2788fe8623b34b4fd52ed858fd2c45b0492d1a3cf8eae` | HEAD-equal |
| `packages/src/utils/styleManager.ts` | 1-99 | `aeb57abdd3f288fd9a647a165d7e0a00a5f508565fc10610b4295b8186fe45df` | HEAD-equal |
| `packages/src/router/index.ts` | 1-252 | `22c83e90f247bd81b5e88b3c06b619a6f1d1a2e25b721a6e39c4cfa5339b6ab6` | HEAD-equal |
| `packages/src/router/utils.ts` | 1-122 | `fb829ced87f08e5bc30730a4666f8526fc4fab2d479d9fa26450a5d419ec748a` | HEAD-equal |
| `packages/src/hooks/useQiankun.ts` | 1-30 | `9fec9af7d240a013e74d2737a3f49cb8cbda6fb7733348cecb2ae58716c3650e` | HEAD-equal |
| `packages/src/hooks/useRouteMenu.ts` | 1-58 | `837fd91039065533e8c6ee91555f05263aad07d8d53d44b478fea8aad05e0d3b` | HEAD-equal |
| `packages/src/hooks/useKeepAlive.ts` | 1-81 | `4d4a00ca55b2826b7c232f5c455a71cf1c6e987bd000ca7033bbc0b32663b6d7` | HEAD-equal |
| `packages/src/hooks/useUserRole.ts` | 1-19 | `30cf7a8f1d2755d5fbd118002b5e8ee1da1ff247937582eae2af052325c35167` | HEAD-equal |
| `packages/src/layout/MainLayout.vue` | 1-135 | `eaf753303b8490630cd656cb9b41dcbc10f9e51876b90203aaeb53aa6a0872e0` | HEAD-equal |
| `packages/src/components/RecursiveMenu.vue` | 1-99 | `b8a68adc9c3c703bb6fe49005c9c361069ddc9314fa368d8ec2dbcb2d36a76c1` | HEAD-equal |
| `packages/src/store/theme.ts` | 38-393 | `8bdb5d13a0dabccc0771bac07d6e28e29d23dcc70fc72adfe04825b5a5ae16e1` | HEAD-equal |
| `packages/src/styles/variables.less` | all | `bc1eeb03020a85f39f3520a62cd0c64c60ed4ba60a515616183810affd764cbe` | HEAD-equal |
| `packages/src/styles/workbench-glass-theme.less` | all | `5dfd983f6eaf23f05445103d34d9fa59b7ab9cbf5996d2a40db6c6bfefc0d18b` | HEAD-equal |
| `packages/src/plugins/iconfont.ts` | 1-24 | `df0b0d1d19961afe11e4a215bb04d4ac0831d4adf0ba6cfc57677163b7d5d15d` | HEAD-equal |
| `packages/src/api/mutator.ts` | 1-82 | `5a94fb775cf5c8b84a0d92a3f83e4839b8348d1d933b470ce6fef941892b243d` | HEAD-equal |
| `packages/src/api/modules/quality.ts` | 1-124 | `b2f6e7ccb3287e76501d63d40b54699a126b25f9524f1da85b4bacde2804850f` | working-tree-modified |
| `orval.config.ts` | 1-55 | `b9b95ee3bf6ceafe20d99afe4c9db923788b1ac13c3029362e4598a06e05e6c2` | HEAD-equal |
| `scripts/sync-openapi.js` | 30-43,52-65,324-413,466-515 | `d8808e1bae2ce1e156370fe32dd4c5c4adaddee7c8946a796a8c1681518aa6c7` | HEAD-equal |
| `scripts/api-transformer.cjs` | 12-98 | `d591735a43772da917fe6ee2bcd0b9d37a858cd5a9567b95d375554fec57d5d2` | HEAD-equal |
| `scripts/api-schema-cleanup.cjs` | 1-49 | `ed147db0144d31325d036e724ae21e394a6642634f339414f878668bda72bdcb` | HEAD-equal |
| `scripts/api-flatten-exports.cjs` | 1-149 | `d1da121b88149d2e2c40a030a904fcbfc205bdb3346a8d97568901b3c03898a6` | HEAD-equal |
| `.eslintrc.cjs` | 1-188 | `62adf0bcace6dfbfcad63404c08fd2b5e68cd7c037cd61854a510d0cee65183d` | HEAD-equal |
| `.gitlab-ci.yml` | 1-179 | `85ac35f2cfb8d7f883b413fa5636f0c52eb200df0a448fdcff7edd36733b6109` | HEAD-equal |
| `README.md` | 1-214 | `e5363278ef06cdb88227282b433f59a7ac524ed2d6f50d2cbdfe8683c56b0522` | HEAD-equal |
| `.yss/scaffold-generation.json` | 1-28 | `64e2372a34138da65c90166a27fc01d6021495fb5f335bb29e6ae7f25707ddda` | HEAD-equal |
| `.npmrc` | 1-8 (values excluded) | `e68ace5de78cb9bbfe0435e73b83b1d17027eb38d38234213253dc2edb843644` | HEAD-equal |
| `packages/.env.development` | 1 | `5aac334cc0f7dff4b8968e91d93fbbc30d3b7a89f5d1ae3a5cdf94f19bf2c4a2` | HEAD-equal |
| `packages/.env.production` | 1-4 | `c6fa4f2faa4d020d5cbfc4f4c77330e4a89bb8733c6bbabfb2d19442515319fb` | HEAD-equal |
| `packages/.env.production.standalone` | 1-4 | `cee70efdfe9187c09f794a5f69e5a35f9fb15e8b84e2924c8517a8f34b7d6eb0` | HEAD-equal |

安装产物额外来源：`node_modules/.pnpm/@typescript-eslint+typescript-estree@6.21.0_typescript@6.0.2/node_modules/@typescript-eslint/typescript-estree/dist/parseSettings/warnAboutTSVersion.js:36`，SHA256 `7d441d1942b6bc14746acf48ad38d8480dc152d9d4ab33baef38b21da99fbba3`，非Git源文件；仅用于核对现存parser声明的支持范围。

实际读检命令分类：`git status --short`、`git rev-parse HEAD`、`git diff -- package.json`、`rg --files --hidden`（排除.git/node_modules/dist）、`rg -n`、`nl -ba`/`sed -n`，Node heredoc读取package+lock并比较specifier/缺失路径/安装元数据、Node heredoc TypeScript transpileModule+vm+assert执行桥接纯函数、Python hashlib+git show计算账本。执行时没有运行源项目的shell脚本或package scripts。
