# SCRM 双端加载与过渡案例

用于理解这套加载体验为何有效、哪些故障需要回归，以及如何迁移到已有工程。依据医疗 SCRM 的规格提交 `pd-spec@a355589`、桌面实现 `scrm-frontend@49ddc74`、移动实现 `scrm-frontend-mobile@aaf7d6a`。路径均相对各自仓库。案例保留规则和代码定位，可独立阅读。

## 从组件推到真实交互

| 层级 | SCRM 实现 | 设计判断 |
| --- | --- | --- |
| 基础组件 | 双端复用本地 Skeleton、Spinner。桌面 `src/components/feedback/LoadingIndicator.vue`、`LoadingSkeleton.vue`，移动 `src/components/shared/LoadingSkeleton.vue`、`src/components/ui/loading/Loading.vue`，按钮自有 `loading`。 | Skeleton 占住用户即将读的内容，Spinner 告知局部操作或更新仍在进行。反馈组件将状态和文案绑定在一个可用的语义入口，业务仍由调用者决定。 |
| 表格结果 | 桌面 `src/components/tables/DataTable.vue`、`TableLoadingRows.vue`、`TableLoadingOverlay.vue`、`src/hooks/useTableLoading.ts`。首读保留表头和拟态行，有可展示旧行时用可视区遮罩；唯一加载播报在 caption，body 单独标记 busy。 | 吸收 Ant Design Pro 的表格内反馈思路，在已有 shadcn-vue 表格上实现。遮罩以滚动可视区域为定位基准，使长列表或横向滚动中的反馈可见。视觉层不承担业务权限，旧条件下的动作由查询上下文保护。 |
| 启动和导航 | 两端 `index.html` 有启动反馈。桌面 `src/router.ts`、`src/lib/lazy-stylesheet.ts`，移动 `src/router/index.ts`、`src/layouts/MobileLayout.vue` 处理应用内导航。 | HTML 启动反馈在框架未接管时仍可用。应用内切页保持原页面和输入，导航提示与目标数据加载各由所属区域接管。案例中的 Vite 预加载会记住已尝试的 CSS 地址，再次触发动态导入会跳过该地址。桌面路由先补取失败的样式，再加载目标页。 |
| 移动列表和动作 | `src/hooks/useRemoteQuery.ts`、`usePagedRemoteList.ts`、`useAsyncAction.ts`，移动 `PullToRefresh.vue`、`InfiniteScroll.vue` 及待办 `RemoteNotifications.vue`。 | 移动端把刷新与追加放到列表两端；同查询范围刷新保留已读的多页和滚动，用稳定 ID 合并，明确成功、失败、取消。写入确认及回读的失败分开反馈，原操作的执行保护在提示出现前生效。 |

复杂页面体验来自数据依赖的拆解。联系人与患者列表优先交付基础行，已授权的关联信息和计数可局部补齐；详情抽屉先给出可关闭的外壳。工作台已有数据的分区继续使用，慢图表有固定占位。参考 `docs/spec/2026-11-23-frontend-loading/2026-11-23-frontend-loading-spec.md` 和配套 `2026-11-23-frontend-loading-interaction.md`。

## 审查发现带来的原则

| 失败路径 | 本次修复 | 迁移时核对 |
| --- | --- | --- |
| 翻页失败导致页码和旧行错配 | 以最后成功页显示并计算翻页，待重试的请求目标独立记录。 | 行、页码和总数提交同一快照。条件变化中的旧行须标明归属并保护动作，重试命中新条件。 |
| 路由切页 CSS 请求失败，点重试仍没有样式 | 先补取失败的样式资源，再完成导航。 | 在目标构建器和部署方式下重现错误、触发恢复并确认样式加载。样式预加载错误的识别和补取方式按具体版本适配。 |
| 通知动作成功，随后重读失败 | 保留已确认的本地可展示状态，将失败反馈和重试限定在读取。 | 服务确认后的 UI 可以立即反映确认结果。读侧错误不能撤回确认或重新发送原命令。 |
| 同条件刷新丢失已追加的页面和阅读位置 | 校验并保留仍有效的已加载范围，合并稳定 ID，延续列表位置。 | 按偏移、页码或游标契约确定恢复策略。重新逐页读取是该案例的实现选项，迁移时根据后端契约及负载决定。 |
| 刷新被取消却提示成功 | 让刷新显式返回成功、失败或取消，关闭当前反馈并拒收旧结果。 | 检查取消与新请求的重叠、迟到结果与 `finally`，取消时不发送成功播报。 |

SCRM 选择约 `150 ms` 才出现视觉提示，约 `5 s` 后静态反馈并提示等待较长。首屏静态启动、动效停止和网络超时由不同机制处理。实现复用了本地主题和有限脉动或旋转，在系统允许动效时用轻量淡入。具体延迟、循环次数、文案、移动手势与识别网络错误的方法按目标工程决定。案例中的行数用于选择表格覆盖层；通用的空结果、无权限和失败仍由数据层明确表达。

## 已有证据和限制

- 桌面 `e2e/api-fixture/loading-transitions.spec.ts` 覆盖联系人列表的旧结果保留、换条件保护、分页失败后的操作、失败重试和业务空态，以及慢切页、资源失败和取消导航。`e2e/page-loading-build.spec.ts` 在构建产物上检查资源请求与恢复。CSS 场景断言重新请求并获得有效样式规则。
- 移动 `e2e/api-fixture/mobile-loading.spec.ts` 覆盖慢加载、追加、同条件刷新、写入成功后回读失败和取消刷新。通知用例断言回读失败后仍显示已读，原「标记已读」按钮已移除。取消刷新用例断言当前查询失败时未显示旧刷新的成功消息。
- 原型的交互说明记录了工作台指标先就绪、趋势区独立等待和失败后原位重试的演练，以及 Chromium 的宽窄视口、深色、减少动态效果、强制颜色、焦点回归和部分 axe 检查。原型与工程 fixture 均使用受控响应。生产权限、企微 WebView 设备及读屏器行为仍需各自环境的验证证据。
