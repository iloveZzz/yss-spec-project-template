# VueUse 选用与生命周期

通用浏览器/交互能力优先核对 `@vueuse/core`，本技能采用 VueUse 15 作为指导基线，不携带依赖模板。新建交互或修改 hook 时读取本页；纯样式、文案无需加载函数目录。不要为减少一行代码把普通 `computed`、函数或 CSS 媒体查询改造成 hook。

## 按职责选择

| 需求 | 候选 | 先核对 |
|---|---|---|
| 事件、元素尺寸、可见性 | useEventListener、useResizeObserver、useIntersectionObserver | 元素 ref 的挂载/替换、监听范围与停止方式 |
| 复制、浏览器能力 | useClipboard 等 | isSupported、权限/失败反馈、真实用户触发 |
| 交互需要视口状态 | useBreakpoints、useMediaQuery | 仅布局响应式优先 CSS；不得形成两套断点来源 |
| 防抖/节流 | useDebounceFn、useThrottleFn | 触发所有者、leading/trailing/maxWait、cancel 与卸载 |
| 按滚动位置自动追加列表 | useInfiniteScroll | 实际滚动容器和短列表是否允许自动追加。自动和手动入口共用分页层的查询、游标、并发和结果合并规则 |
| 倒计时、定时刷新显示 | useCountdown、useIntervalFn | 核对开始、暂停、到期与卸载。按截止时间到期的业务用「截止时刻减当前时刻」计算剩余时间，后台恢复时重新计算 |
| 用户显示偏好 | useStorage、useColorMode | 是否确需持久化、主题已有所有者、存储异常；不存凭证或客户业务数据 |
| 普通组件双向绑定 | Vue defineModel | 已有 useVModel 的 passive/defaultValue 等契约不能机械替换 |

按技能名定位已安装的 `vueuse-functions`，从该技能目录读取 `references/functions.md` 查找候选，再按需打开选定函数的离线用法与类型。单独安装应用技能或本地索引缺失时，使用本页末尾的固定上游技能链接。对照项目锁定版本的类型及文档确认导入、调用签名、选项和清理方式。跨包集成、外部操作和共享状态按实际依赖与任务范围处理。

## 状态和作用域

- 页面独立状态在每次 hook 调用时创建；不要用 createGlobalState/createSharedComposable 意外共享表单、请求或身份数据。
- 同一请求的 `loading`、`data`、`error` 由现有请求层统一管理。项目采用 `useRequest` 轮询时由它调度，交互 hook 只提供参数和启停条件。需要自建轮询时，等本次请求完成再安排下一次，切换上下文或卸载时停止调度并处理在途结果。传输取消沿用 service 的 AbortSignal。
- 保留 ref/getter 的响应性，避免先取 `.value` 再传递导致输入静态化。service/callback 本身是函数值，不作为 MaybeRefOrGetter 自动求值；只在接口确需可变输入时采用可适配 composable。
- 在有效组件/作用域内建立副作用；作用域外显式持有并停止 effectScope。异步回调中新建监听不能假设自动属于原组件。
- 按函数核对 stop/cancel/pause，不能笼统声称 VueUse 清理所有副作用。防抖仍有待执行工作时显式 cancel；卸载后检查业务回调、迟到响应和必要资源，不用清空测试全局 timer 掩盖泄漏。

## VueUse 15 的版本边界

v15 的 API 变动需按对应版本核对：templateRef 使用 Vue 的 useTemplateRef 替代，timer 选项和 useThrottleFn 的 trailing 默认值不可照搬旧示例。保持产品触发语义时显式传 leading/trailing 等参数；不要增加兼容分支。涉及生命周期时使用目标工程已有能力验证挂载/卸载、监听清理、pending debounce cancel 与明确 throttle 语义；本版本不提供测试套件。

详细依据：[官方技能](https://github.com/vueuse/skills/tree/004812b4aa0815f5745ac30a6a7dc4927aec7b3d/skills/vueuse-functions)、[最佳实践](https://vueuse.org/guide/best-practice)、[v15 变更](https://github.com/vueuse/vueuse/releases/tag/v15.0.0)。官网会更新，版本特有行为以安装包及对应 tag 为准。
