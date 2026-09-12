# 已提交预览源码基线候选

日期：2026-09-12；仅只读查证，未建立 checkout、安装、构建、测试或服务。外仓根缺身份文件，本轮不推定身份、不做接入。完整逐文件清单见 [baseline.json](baseline.json)。

## 建议固定的两个提交

| 角色 | 仓库 | 提交 |
|---|---|---|
| Java 后端 | `/Users/zhudaoming/yss-valuation-outsourced` | `714fd4223d202b29c410d4d5533913e44874b3f1` |
| 独立 Vue 前端 | `/Users/zhudaoming/yss-valuation-outsourced/valuation-outsourced-frontend` | `76f2d1627f797d5b12a99c48cf49125544933b18` |

推荐理由：两个提交中均已有完整预览功能的核心文件，限定范围当前工作区与提交字节相同，**不需要把上传等未提交变更纳入预览基线**。这只是源码候选，不是可构建、已验收或已批准结论。独立前端必须按自己的提交固定，不从父仓递归复制当前工作区。

## 核心行为及提交证据

所有行号均为上表固定提交中的 `git show <SHA>:<path>` 内容，而非只看当前磁盘。

- 后端 `valset-standardizer-tools/file-sync/src/main/java/com/yss/datamiddle/valuation/filesync/web/FileSyncTargetPreviewController.java:15-35` 已有 `GET /file-sync/tasks/{taskCode}/target-data-preview`、`scope` 默认 `CURRENT`、模块启用条件及 `SingleResult` 返回。
- 同模块 `application/service/SyncTargetDataPreviewAppService.java:68-100` 已有 `CURRENT/ALL`；仅 HISTORICAL+CURRENT 使用 expiryDateColumn 过滤当前行；要求任务目标元数据 READY并在查询后复核目标没变。`197-213` 草稿优先否则已发布版本。
- 后端 `docs/api/specs/file-sync-target-data-preview.yaml:18-43` 已包含同 operationId、100行/5MB以及 `scope=CURRENT|ALL`；`135-143` 允许空rows/returnedRows=0。
- 前端 `packages/src/api/generated/quality/index.ts:6567-6575` 已提交同GET路径及params；`FileSyncWorkbench/dataSource.ts:681-683` 默认scope=CURRENT并消费HTTP返回。
- 前端 `FileSyncWorkbench/components/TargetDataPreviewModal.vue:27-59` 已有默认CURRENT、请求、错误、手动刷新和scope切换；`index.vue:21-26,69,249` 有真实页面接入。
- `FileSyncWorkbench/hooks/useFileSyncWorkbench.ts:91-96` 由 `VITE_FILE_SYNC_USE_MOCK` 和开发态选择数据源；试验必须明确关闭Mock路径，不能以可见页面判定已调用Java。

## 范围与差异

逐文件记录 Git blob、原始字节 SHA-256、磁盘字节 SHA-256、路径最后一次提交。清单包含后端 Controller/service/port/DTO/JDBC adapter/三组测试/契约/审查/历史验收，以及前端 Vue/less/转换函数/测试/dataSource/Hook/生成API和OpenAPI JSON。

限定预览范围 git status 无已跟踪修改；生成目录唯一状态提示为新增的 durableUpload 子目录，与本候选无关，未纳入清单。不因整个仓库有脏文件，就要求用户决定是否把所有脏文件带入。本轮也不声称未读取的依赖文件全部与HEAD相同；实际隔离构建须消费完整固定提交，不能复制dirty工作区依赖。

## 原始历史与批准证据的实际边界

- 后端路径历史包括 `be7b7711fe09b913d7ec0fb33c678a7a53298028`（2026-07-28，补齐文件同步预览契约与测试）和 `6fb797b425d0c6ed24c099e2423c5287c49ea8b6`（2026-08-05，路径后续修改）。
- 前端初始功能提交 `2c0b2501aee5e847c5b883d3310de0ff92f76377`（2026-07-28），后续 `f04e392db890daf8aed1849e9d34b3d96e34beb8` 适配接口；最新 `76f2d1627f797d5b12a99c48cf49125544933b18` 还包含样式/构建优化。无需为了使用初始功能而退回无法代表当前兼容状态的老提交。
- 当前HEAD可读的 `docs/architecture/file-sync-target-data-preview-openapi-review.md:5` 写 Approved，但 `20` 仍写只接收taskCode，`44-50` checklist未勾，`54` Next Action仍指向实现；没有把批准绑定到本次选择的契约SHA-256或两个提交。**不能自动沿用为本试验有效批准**，也不能因这份历史文字落后就声称代码本身不支持scope。
- 当前HEAD中的 `docs/file-sync-acceptance.md:13-24` 保留2026-07-28模块308测试/装配成功自述，同时明确实库未跑和旧证据不证明当前HEAD。未找到这两个SHA同基线的预览页面端到端验收、部署证据、当前工程契约与Slice批准字节绑定。
- 前端 `TargetDataPreviewModal.spec.ts:1-25` 实际是读取源码并做toContain字符串断言；不能当作挂载组件、真实刷新交互或截图验证。`fileSyncWorkbenchApi.spec.ts` 用mock断言HTTP适配参数，也不是真实Java联调。

## 需要决策或补证的事项

已能提出纯提交基线，**未发现需要人为纳入的必要dirty功能文件**。剩余真实问题是此候选版本的批准/验收前提，不是“全部工作区是否一起复制”。需要查明原始有效批准能否覆盖上述含scope的现存合同；找不到则依已确认Q12列前置缺口停止相关执行。其他身份/环境/探针前提由主控汇总，本产物不批准或执行这些工作。

## 本轮只读核验

CodeGraph定位exit0；两个HEAD解析、限定路径git status、逐文件git show/git log及SHA-256计算成功。尝试读取不存在的 `FileSyncWorkbench/fileSyncWorkbenchApi.ts` 被Git拒绝，随后 `git grep` 确认真正HTTP封装在dataSource.ts:540及生成quality/index.ts，未以猜测路径出具证据。早期搜索不存在.scratch有提示，已使用当前HEAD docs树复查。JSON语法检查创建后实际运行，结果见工具记录。没有产品测试退出码。

本轮核对文件数：33；逐文件与提交字节一致：True。


## 补查：OpenAPI版本与精确历史设计引用

后端推荐提交的 `docs/api/specs/file-sync-target-data-preview.yaml:1` 实际是 **OpenAPI 3.0.3**，不满足模板 `scripts/lib/backend-delivery.mjs:52` 的3.1要求。这是现存接收前提不匹配，不能仅把版本号改为3.1来宣称兼容或已批准。

前端推荐提交的 `openapi/openapi.json` **是OpenAPI 3.1.0**，包含同一路径与 `operationId=fileSyncPreviewTargetData`；该原始生成快照已在33文件manifest内。但是生成快照把scope标成 `required:true`、`example:CURRENT`，没有手写合同的 `required:false/default:CURRENT`；该operation响应只列200及 `*/*`。因此“有一个3.1文件”不等于“可直接替换冻结合同”：应明确批准哪一份字节、是否保留手写合同的省略scope语义、错误响应和边界，以及生成快照是否可追溯到选定后端提交。当前无这组证据。

手写合同 `info.description` 引用精确 `.scratch/file-sync-target-data-preview/DESIGN.md`（根.scratch，非docs/.scratch）。本轮检查该目录不存在，当前HEAD树没有它；该精确路径的git历史与API合同联合查询只返回合同提交，未找到可读的设计/原始确认资产。当前HEAD可读Markdown Approved依然不能代替来源政策及artifact_bindings。本轮不读取个人会话目录寻找替代批准。

以上补查均只读；git show/JSON解析/精确目录存在性检查成功，目录missing被如实记录；未转换或修改任何OpenAPI。
