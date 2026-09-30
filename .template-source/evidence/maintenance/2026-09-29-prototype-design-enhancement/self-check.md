# L3 维护者自检

结论：本轮方法、教学示例、比较工具和本地分发达到 `implementation-ready`。效果试点单独记录，不能由工程通过推出视觉收益。

- 权威与范围：仅三个既有 Skill 增强；root DESIGN.md、Prototype Evidence v4、Visual Baseline v1 未改。低保真评审和用户选择仍沿用既有批准机制；比较 manifest 不含批准状态。
- 方案质量：交互差异先于低保真独立评审；高保真仅比较未解决的方向；内容与异常共用来源，颜色变化不计交互方案，已有模式局部调整无需探索。
- 资源与数据：prepare 先完成全部输入检查，再复制至临时目录并原子落盘；非空输出拒绝覆盖；候选 sources/Token 字节相同；禁止包内符号链接、越界与常见远程依赖。manifest/runtime/文件摘要不一致时 validate 失败。
- 交互：新 iframe 清除临时状态，切换候选保留外层共同场景；未知候选/场景、缺失入口明确失败；file:// readiness 仅证明加载。代码检查不替代业务语义验证；评审 UI 不是安全沙箱。
- 示例：三组前后共享一个数据与交互实现，使用已有 Token；教学前态不作推荐模板。桌面与窄屏、权限/失败/冲突、键盘与焦点有浏览器证据；手工查看列表桌面、表单窄屏、审批窄屏后，未发现阻断阅读或主操作的新增问题。这是维护者观察，不是用户视觉确认。
- 兼容：旧合同场景、新工具 3 个测试组、H1/H2 及原生/真实 AntD workbench 通过。原有 prepare-static/prepare-flow 未改目录语义，offline-html 仅导出既有资源检查函数供比较包复用。
- 同步：canonical、source-tree 摘要、投影、锁和设计/前端 profile 检查通过；三个 CLI 实际隔离实例的比较工具与示例导出通过。
- Fresh Verification：隔离工作树运行 PYTHONDONTWRITEBYTECODE=1 scripts/verify-template-fast，最终补强后的核验结果见 post-pilot-fast/report.json；此前 17 项命令全部退出 0，总计 243735ms；输入前后摘要一致，input_drift=false。见 fast-final/report.json 与 isolated-fast-final-execution.json。第一次全工作区行尾空格失败、第一次隔离 Python 缓存写入失败保留。
- 源码一致性：初版 29 项实现输入与冻结试点候选相同；试点后改了两个方法文件及派生来源 manifest/锁。原试点不能证明该指导修订的 Agent 行为。14 项初始无关且已捕获摘要的文件不变；完整清单见 final-source-integrity.json。隔离验证包含相同代码和 profile 增量，排除维护 evidence 文档，不是整个主工作区或固定已提交源码的 release 验证。
- 边界：独立评审未要求且未伪造；真实 Agent 试点失败或未完成不能转成通过；视觉收益待实际完整对照和当前用户确认。未提交、推送、发布，也未执行旧项目批量迁移。

现有局限：离线扫描是语法启发式；manifest 场景声明无法证明任意 HTML 正确实现了业务状态。两个视口和一个 Chromium 版本不代表所有浏览器。试点运行配置与完整失败记录见 pilot-report.md，后续试点扩额需单独授权。

试点发现并处理：增强组局部修改在窄屏重排了明确保持的查询区；补强同视口/同状态核对指导，并在独立维护者修复副本中恢复布局。两个视口的查询输入及按钮几何与原 fixture 完全相同，查询、空态与重置通过。原始样本保留失败/偏差，未扩大 12 次预算，Agent 行为修正仍待后续效果验证。

最终补强后的 Fresh Verification：17 项命令退出 0，耗时 252352ms，input_drift=false，证据为 post-pilot-fast/report.json。三个新 CLI 实例含最终指导修订，见 post-pilot-cli-integration.json。

context_reconciliation：not-applicable，仓库为 template-source，本轮未创建产品工作单元或业务词汇；保留根 CONTEXT.md 合同，按模板维护核验事实源。
