# i-have-adhd 的 YSS 适配

上游：`ayghri/i-have-adhd`；固定 revision：`839872f9d1cd634fed642b4589ce7226199cc15f`；许可证见技能目录 `LICENSE`。

原始文件来自 [固定版本目录](https://github.com/ayghri/i-have-adhd/tree/839872f9d1cd634fed642b4589ce7226199cc15f/skills/i-have-adhd)。2026-10-03 核验该提交与先前 `7b9069b39972e269e61bd95c2f66ebb90cac6a02` 的技能目录树和三个文件原字节一致；本轮更新来源记录并修复 YSS 消费指引。未经改写的来源基线保存在模板维护证据中；`upstream-files.json` 记录逐文件 SHA-256，`skills-lock.json` 记录上游目录哈希和当前技能目录哈希。基线不进入实例默认加载面。

| 上游行为 | YSS 适配 |
|---|---|
| 用户显式调用、会话持续 | 原技能名保留；文档工作按 `lifecycle-document-output` 条件调用，任务结束即失效 |
| 对读者作 ADHD 假设 | 面向所有文档读者，不引入诊断假设 |
| 行动前置、步骤编号、删除套话 | 消费中文写作规范，按产物类型决定信息顺序和格式 |
| 展示进度、下一步和具体时间 | 报告实际变化和全部必要阻塞；时间有依据才估算，不把工作推给用户 |
| 压缩可见列表 | 完整性优先，不设规则数量上限 |
| 原因与修复直接陈述 | 区分已知现象、待验证原因和实际验证结果 |
| 平台专属 agent 配置 | 不安装上游 Gemini 持久提示；项目 OpenAI 配置只描述当前文档配套用途 |

注册表将本技能声明为模型可调用、实例默认可发现的通用工作流 core 技能（仍只作为文档配套）；调用者以条件依赖加载。上游 `disable-model-invocation: true` 在适配版移除；作用域由本技能触发条件限定，不延续上游会话开关。

结构核对只能说明被核对的来源、路由和投影状态。中文文档质量需通过真实生成评估，不以结构检查或作者自检代替盲评效果。

2026-10-31：普通 PR/MR 与复盘方法由包内 `pr-and-retro.md` 持有，原 document-writing 章节保留导航。按文档任务触发，不依赖治理或阶段批准；不从写作推导 CI、测试套件、关闭条目或发布授权。原始来源 revision/upstreamHash 不因此变化。

## ShowMe 图解方法的补充来源

2026-11-01 核验 HumanLayer `show-me`，固定提交 `69d5fc61d6ca6f7056d283a2ee2a045be741a1d6`；来源为 [技能正文](https://github.com/humanlayer/skills/blob/69d5fc61d6ca6f7056d283a2ee2a045be741a1d6/plugins/show-me/skills/show-me/SKILL.md)，完整许可保存在 [show-me-LICENSE.txt](show-me-LICENSE.txt)。该来源补充图解方法，不替换本技能原 `ayghri/i-have-adhd` 主来源、固定 revision、上游哈希或 LICENSE。

共享方法见 [图解表达](visual-explanation.md)。保留上游最小视图、邻近短说明和变更对照的思路，增加 YSS 的业务状态/界面状态区别、规则引用、未决项、权限与交互教学样例。代码树不作为 Spec 默认要求；HTML 按宿主实际能力预览，不复制 macOS 专用 `open` 命令。原 ShowMe 的禁止隐式调用配置不引入，继续使用本技能的当前文档作用域。

方法由本技能单独维护。独立公开消费者缺少共享技能时，按导出约定复制必要参考和许可到包内；分发副本只从此来源同步，不独立修改。不安装上游插件、hook 或在线渲染服务。
