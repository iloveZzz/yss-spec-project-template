# 原型优化六轴 QA 与观察记录

本记录属于模板维护 fixture 的维护者自检，未取得用户视觉批准，也没有真实参与者研究。工程结果引用 [专项报告](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/report.json)；来源摘要 `sha256:33c41f30592bb5deda3c2d65e06e0c863059a3a8986ef99262e3c13623788304`，独立复制包摘要 `sha256:ec7624897f816430eef75cfe5aa1b4367f42ae357ca141266d5a124f49db5359`。源码、场景与截图均来自本次实际构建。

## 六轴结论

| QA 轴 | 本轮结果与证据边界 |
|---|---|
| visual | 实际计算样式、颜色对比与 compact/comfortable 检查通过。维护者复看组合查询桌面、320 px 日期浮层、320 px 工作区、收起导航 Tooltip 和 200% 审批截图；标签、编号、日历七列和焦点环可辨。首次截图仅为待审基线，无已批准前图，不宣称视觉回归比较通过。 |
| layout | Chromium 1440/1024/390/320 CSS px、WebKit 1440/390 关键路径通过。日历内部无横向溢出；筛选、分页和主操作重排，数据表的二维滚动例外保持局部。320 px 浮层的七列截断已修复并复验。 |
| interaction | 页签去重、跨页草稿、关闭取消/确认、重新打开初态、历史前进后退、严格入口、重置和隐藏浮层清理通过。搜索词与稳定 ID 分开；日期临时值在应用后更新，取消/Escape 保留正式值。 |
| content | 演示持续标识维护 fixture/本地模拟；同名选项显示 ID，失败保留输入且可重试；未完成日期范围阻止应用并定位错误。无真实产品需求、业务数据或研究观察混入。 |
| accessibility | 键盘、首错、目标点击区域、焦点遮挡、减少动效及实际 200% 缩放通过适用自动检查；隐藏触发器消失后实际焦点为可见 `main#workspace`，见补充观察。实际读屏未执行；未以浏览器结果代替读屏或 WCAG 全面符合性结论。 |
| cross-platform | 两浏览器关键路径与完整包复制后本地 file:// 验证通过。Chromium 使用 offline，WebKit 拦截 HTTP(S)；二者均记录资源与 console。日期规则在上海、洛杉矶、基里蒂马蒂系统时区进程中结果一致；浏览器除原上海矩阵外，再模拟后两个 timezoneId 补验72条控件记录，全部通过。 |

## 可复看的观察

- [桌面组合查询](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/yss-business-controls-uX3Xl5/chromium-1440-Asia_Shanghai-query.png)：输入、已选编号与已应用查询分别显示，主操作和结果页码明确。
- [320 CSS px 日期浮层](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/yss-business-controls-uX3Xl5/chromium-320-Asia_Shanghai-date-popover.png)：七列完整，日期输入与应用/取消/清空操作在浮层内可达。
- [320 CSS px 工作区](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/yss-workspace-1Zw91X/chromium-320-Asia_Shanghai-query-detail.png)：查询、结果卡片和分页纵向排列，选择反馈保留。
- [收起导航 Tooltip](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/visual-tooltip-settled.png)与[浮层离页焦点和几何](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/visual-observations.json)：Tooltip 位于触发器右侧，离开日期页后焦点回到可见主区域。
- [实际 200% 缩放记录](/private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-design-opt-20260930-jlcnh890/all-07/yss-zoom-browser-A1jpg7/result.json)：隔离 Chromium profile 使用 `chrome.tabs.setZoom/getZoom`，值为 2，初始宽度 1440 → 720 CSS px，DPR=2；9 种页面的关键操作实际执行。截图呈现当前可见区域，操作可达以交互记录为依据。

## 本轮发现及修复

| 类型 | 问题 | 修复与复验 |
|---|---|---|
| 行为缺陷 | WebKit 点击关闭按钮后取消确认，焦点不能依赖 activeElement | 记录实际触发器，关闭取消后返回；不存在时使用可见后继；六种浏览器/视口组合复验 |
| 布局缺陷 | 320 px 下日历内部被裁切，而页面总体无溢出 | 本地主题七列均分并设最小宽度约束；增加浮层内部溢出断言并复看截图 |
| 可达性缺陷 | 实际 200% 缩放的短视口，固定审批栏遮挡内容 | 短视口取消固定定位；实际审批操作复验 |
| 验证缺陷 | 历史测试仍按旧桌面 Sheet/标题 Token 判断现有工作区 | 按当前 DESIGN 与内嵌详情合同更新断言，保留旧失败报告；未降低受影响行为要求 |
| 分发缺陷 | 专项合同测试依赖维护仓私有入口或完整后端 fixture 图 | 改用可分发 YAML 与共享测试 fixture；精简实例安装后实际运行新入口 |

行为问题已修复。视觉观察范围如上，不代替用户偏好确认；本轮未产生需要阻断工程验收的偏好建议。

## 明确未执行项

真实读屏：未执行，OS/浏览器/辅助技术组合未建立，辅助技术版本无记录；方法已交付到 `yss-design-system/references/search-date-theme.md`。生产目标人群或风险评估命中时，必须另补真实组合的名称/角色/值、反馈和焦点检查，不得复用本记录声称通过。

中文输入：已通过浏览器 composition 事件与键盘的保护场景，未进行真实操作系统输入法及真实参与者测试。

真实用户与 Agent 对照：按本轮边界未启动；三类后续任务见 `yss-prototype-stage/references/usability-research.md`。参与者、模型、预算未定，不计算效率或错误率改善。首次视觉基线的用户批准亦未执行。
