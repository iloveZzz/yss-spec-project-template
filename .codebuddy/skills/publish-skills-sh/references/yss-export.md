# YSS 模板导出适配

仅在源技能来自 YSS 模板源或用户明确指定 YSS 导出器时消费本页。通用发布流程见 [主技能](../SKILL.md)。

## 导出与来源绑定

读取源仓身份、规则、`scripts/export-yss-skills` 及 `yss-public-skills.json`，确认所选 ID 已获准导出。没有公开许可的技能停在本地候选，不能通过直接复制绕过限制。新增清单条目属于独立范围决定。

在源仓运行，变量须取已确认的绝对路径和单个技能 ID；输出目录位于所有源仓、分发仓及其工作树之外：

```sh
scripts/export-yss-skills --skill "$SKILL_ID" --output "$EXPORT_DIR"
scripts/export-yss-skills --skill "$SKILL_ID" --output "$EXPORT_DIR" --check
```

多技能按导出器支持的选择参数逐项处理，先核对能力，不默认导出全部公开技能。同参数 `--check` 通过后才消费导出包；导出差异、引用缺失或来源漂移均需重新制包。

复用导出器的 `.yss-export-manifest.json` 和目标仓已有来源记录格式。补记其未提供的基线提交、`source_state` 和源文件摘要，不能声称导出器已证明这些事实。分别保留 canonical 来源和导出文件摘要；模板导出会附加消费项目的上下文说明，源 `SKILL.md` 与导出正文不必字节相等，安装结果应与导出包比较。`working-tree` 是有效来源标记，不代表已提交来源。

## 分发与验证

- 遵循目标仓已有同步或发布工具，同步所选技能、README、安装选择器及来源记录；插件声明和 Changesets 仅在目标已有时维护。
- 本地发现与隔离安装后，比较完整路径集合、逐文件原始字节摘要和必要执行权限；分别保留源、导出、安装的摘要与检查结果。规范化 Skill-tree 摘要不能代替原始字节与权限检查。
- 源仓与 Profile 的注册、投影和锁由 `maintaining-skills` 及仓库同步工具维护；分发授权不会自动授权源仓提交、Profile 提交、YSS CLI 升级或 npm 发布。
- 发布后按主技能核验远端 SHA、CI、公网安装以及页面名称与最新正文。旧页面缓存只支持“索引待更新”的结论。

## 已验证案例的适用范围

`iloveZzz/yss-harness-upgrade-skill` 中的 `setup-yss-harness` 是既有更名分发案例，可参考其目录、README、插件声明、Changesets 和来源记录。其安装选择器为：

```sh
skills add iloveZzz/yss-harness-upgrade-skill --skill setup-yss-harness
```

该映射只适用于已确认的 YSS Harness 分发；其他技能必须确定自己的目标与公开范围。案例的历史成功不是本次发布证据，旧 `yss-harness-upgrade` 页面也不能证明新名称或新正文已收录。
