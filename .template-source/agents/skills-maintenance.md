# Skills 维护

`.agents/skills` 是共享内容源，包括前端应用与 Vue 技能；`profiles/backend/.agents/skills` 保存后端专有内容。Frontend 按显式白名单选择共享技能分发，不另存同内容主源。只修改实际需要的技能和参考，保留名称、描述、来源及运行时元数据。

Profile 默认能力和衔接说明维护在 `.template-spec/agents/profile-skills.md`，Backend、Frontend 分发同内容副本。默认成员与安装依赖仍以三份 `bundle-profile.json` 为准；修改集合或职责时同步地图、适用注册表和平台内容，修改导航不重算未变化技能的哈希。地图由三个 Profile 的两种安装模式直接分发，六份入口按需引用，不要求每项任务先读地图。

本仓不维护脚本、测试套件、自动门禁或发布资格系统。Agent 直接完成以下操作：

1. 修改内容源；新增或删除技能时同步 `skills-lock.json`、技能目录清单及 `yss-public-skills.json` 中适用的条目。
2. `.claude/skills/<名称>` 链接到共享技能；`.workbuddy/skills/<名称>` 是完整普通文件副本。Backend 将共享内容与自己的覆盖层组合后更新副本；Frontend 按分发白名单同步共享内容副本。Profile 内不新增嵌套技能软链接。同步前读取目标，只覆盖本次授权的受管内容。
3. 公开导出只复制清单选中的技能，保留许可证，将仓库内部路径改成包内有效引用。不要复制凭据、本机路径或用户业务文件。
4. 提交、推送、发行按用户已有授权进行，可使用 Git、宿主连接器或已安装 CLI。工具能力以实际帮助为准，不自动执行测试或要求审查回执。

维护结果说明修改了哪些技能和副本。仅报告实际执行的工作，不声称未运行的检查通过。平台发现和既有 CLI 对新模板的兼容性需要实际使用时再确认。

共同来源记录见 [.template-spec/agents/matt-skills-adaptation.md](../../.template-spec/agents/matt-skills-adaptation.md)。维护时区分原始引入和本次比较，不用本地内容哈希覆盖上游哈希。Backend 继承共享内容时保留共同来源，专有覆盖与平台元数据仍以该 profile 为准。

来源说明需加入实际消费 Profile 的 project 与 skills 两种安装模式的 `skillReferences`，不能只放在不分发的 `.template-source`。Frontend 使用显式技能白名单，不继承整套后端能力。更新受影响 Profile 已有 `effectiveHash` 时，按有效技能树的相对路径排序计算 SHA-256：Node `localeCompare` 排序；依次输入路径、NUL、内容、NUL；无 NUL 的 UTF-8 文本将 CRLF 归一为 LF；忽略 `.DS_Store`、`__pycache__`、`.iml/.pyc/.pyo`。保留原文件属性；根锁没有该字段时不补加。无需恢复旧生成器。
