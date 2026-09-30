# 标准精修与轻玻璃样例验证记录

本轮交付查询与详情、分步表单各两种外观，共四份可运行页面。打开 [样例入口](index.html) 可进入原尺寸对照；也可在桌面或窄屏单独打开候选。场景数据、业务逻辑、控件尺寸、字号和圆角共用同一基线，玻璃差异只作用于控制区域。

本轮仅新增当前维护研究目录，没有修改根 DESIGN.md、Token 权威源、共享 Skill 或分发快照。样例具备专项验证证据，视觉效果仍待当前用户评阅；不声明通用主题已批准、模板 implementation-ready 或整仓可发布。

## 已完成内容

- 查询：精修筛选与结果区域，区分资料身份、名称、状态和操作；保持原有排序、两条一页、跨页选择、详情和只读语义。
- 表单：增加明确的两步进度及说明，整理字段与固定操作区；保留输入、错误定位、失败提示和重试行为。
- 标准外观使用实色控制区及轻阴影；轻玻璃使用同一布局，在顶部、表单操作区、详情底部和菜单增加材质。
- 两种外观均保留桌面紧凑、窄屏普通控件和系统字体。表格、表单、错误内容和详情正文保持实色。
- 提供手动减少透明入口，并在 Chromium 核验系统减少透明媒体条件；减少动效后无过渡动画。

## 专项工程覆盖

| 轴 | 实际执行与结果 | 证据 |
|---|---|---|
| visual | 8 张同内容、同初态、同视口的 Chromium 页面截图；另有菜单/字段错误及缩放截图。材质符合限定范围；质量偏好待用户判断 | screenshots/ |
| layout | Chromium / WebKit，1440×900、390×844，四份页面均无页面水平溢出。输入或 InputGroup 外框实际高度匹配 Token；内部输入扣除边框后较外框少 2px 属正常布局 | evidence/browser.json |
| interaction | 筛选、重置、分页、跨页选择、菜单取消、详情打开与焦点返回；必填错误定位、返回保留、失败重试成功；18 个参数化流程/比较组通过 | evidence/browser.json |
| content | 相同场景 JSON 与 Token，所有既有场景逐份检查；含空数据、固定加载、只读与非法场景拒绝。14 个场景检查加减少透明和入口资源检查通过 | evidence/build.json、evidence/states.json |
| accessibility | 键盘菜单与 Escape、详情焦点返回、Field 标签/错误语义及实际焦点、减少动效、手动与系统减少透明、真实浏览器 200% 缩放四条关键流程通过；16 项文字采样对比度最低 5.57:1 | evidence/browser.json、evidence/visual-checks.json、evidence/states.json |
| cross-platform | Chromium / WebKit 两视口；拷贝至独立目录通过 file:// 运行；Chromium context offline，WebKit 阻断 HTTP(S)（其 offline 模式会拦截本地文件）。监测到的 console error/warning、pageerror 为 0 | evidence/browser.json |

文字对比度读取真实计算色值并进行 alpha 合成；透明控制层用黑/白背板边界检查。采样覆盖标题、顶部辅助文案、菜单文字、字段错误、主按钮和操作提示，不代表全页所有像素或完整 WCAG 审计。屏幕阅读器、真实触屏、长时间性能、电池消耗未执行；不支持 backdrop-filter 的实色降级做了代码检查，未使用旧浏览器实测。禁用项、装饰图形不纳入普通文字对比度采样。

200% 使用隔离 Chromium profile 的 chrome.tabs.setZoom/getZoom，实际记录 innerWidth=720、devicePixelRatio=2；没有使用 CSS zoom 或单纯 DPR 模拟替代浏览器缩放。

比较 v2 校验通过，两份包各有标准/玻璃候选，切换后相同场景数据一致并清除临时输入；非法候选不显示正常场景。两份包可独立复制运行，不依赖服务器、远程资源或持久化状态。

## 验证过程中修正的测试判断

首次脚本在 Radix 的关闭焦点恢复完成前立即断言，改为等待实际焦点返回。第二次将 InputGroup 内部输入 26px 误当成完整控件 28px，改为检查组合控件外框并保留内部高度记录。没有通过放宽 Token 数值或改变产品行为使测试通过。首次日志、失败记录与最终通过日志均保留在 evidence/。

## 视觉观察与偏好建议

当前样例把标题、筛选、结果与操作区域分开；轻玻璃的差异主要出现在菜单、滚动时顶部区域及操作条。大面积内容仍稳定、实色，玻璃差异刻意保持克制。上述是样例实现及维护者观察，不是实测效率提升。

材质试验值、保持项、共同任务和取舍见 [比较记录](comparison-record.md)。推荐先用这些任务操作两种外观，再决定是否将材质规则固化到 DESIGN.md 和 Skills。本轮不代替用户做视觉批准，也不启动新的 Agent 效果试点。

## 仓库验证边界

仓库级 verify-template-fast 因开工前已存在的核心核验文件修改自动升级为 release 全量计划。运行输出见 evidence/template-fast.log；最终状态将在 evidence/repository-verification.json 中保留。专项样例验证与整仓状态分别判断。

## 复验与来源

- authoring/ 为本轮独立作者源码；build.mjs 调用既有固定 shadcn 构建器与比较 v2 工具。
- 输入摘要及相关来源快照：evidence/input-digests.json、evidence/source-baseline/。
- 开工工作区状态：evidence/worktree-before.txt；本轮没有提交、推送、发布或修改其他并行文件。
- 复验脚本：verify-browser.mjs、verify-visual.mjs、verify-states.mjs，使用已有 Playwright 运行时；命令与结果保留在对应 .log / .json。
- 浏览器依赖只用于作者验证，不属于离线页面运行依赖；交付比较包包含实际构建来源、组件摘要及许可。
