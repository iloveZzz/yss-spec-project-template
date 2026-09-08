# 技能退役与 CLI GitHub 交付

用户在修正与退役清理确认后，明确授权提交并推送 GitHub，同时升级相关 CLI。本记录更新此前“未提交 / 未推送 / CLI 快照待更新”的阶段状态；不包含 npm 发布。

| CLI | 版本 | 模板提交 | CLI 提交 |
|---|---|---|---|
| design | 0.4.4 | `2f6b2fa5ba356bb184b98be1e5a2feebae2996fb` | `82c608627f76738beadbfd41ed9689aa81c2e54d` |
| backend | 0.1.1 | `d98c6e1501ccee333ecd8c6a41fe4e324142a01b` | `50b141bdb9f57d68ca7b4f7125215dbb93f4ace8` |
| frontend | 0.1.1 | `8b3464374b030d06d696a73088d31e23d10023e6` | `94a27457a4a72ec887b959b659db42b0d409e202` |

公共 CLI 核心提交：`3df77c3bba87252d2751e499ee0a4c8a0bab948d`。真实旧实例升级发现原核心删除文件后留下空技能目录；修复只遍历已删除受管文件的父目录，保留非空目录、嵌套仓库和 gitlink 边界，失败时通过原事务备份恢复。最小回归先失败；修正后 18 项核心测试通过，包括用户文件保留和删除后故障回滚。

Design CLI 使用固定默认源 SHA 重建，沿用仓库现有生成快照不入 Git 的规则；前后端同步已提交的模板快照及公共核心锁。

验证：三个子模板 scripts/verify-template 全量通过；design CLI 33 项测试通过；前后端 pnpm test、pnpm verify-bundle 与 npm pack 通过；三个 tgz 的实际安装与生成身份核对通过。最终前后端 tgz 实际升级旧实例通过，backend 104 → 71，frontend 104 → 79，退役技能目录与本地执行入口均无残留。后端复验夹具从第一次真实升级事务的备份恢复原始 104 技能基线；前端夹具由原 CLI 初始化。

首次 design 安装命令缺少必填业务领域、首次前后端临时目标路径经过 macOS /var 符号链接，均由 CLI 按现有规则拒绝；补全输入并使用真实路径后通过。第一次根仓全量运行在发现公共核心缺陷后主动停止，不能作为通过证据；最终根仓全量结果另见日志。

原有 create-yss-harness-dev/template.snapshot.json 改动不纳入提交。未发布 npm、未创建版本 tag 或 GitHub Release。

最终根仓结果：全量检查唯一失败为 design 上游来源 revision 仍指向旧提交。同步 `.agents/skills/.strategic-design-skills-manifest.json` 和 `skills-lock.json` 后，六项上游技能 hash、来源 revision、技能治理及注册表校验全部通过；随后 `scripts/verify-template-fast` 实际退出 0。保留原全量失败日志与最终复验日志，不把失败日志改写为通过。

三个模板、三个 CLI 以及公共核心提交均已推送 GitHub main；六个子仓已通过 git ls-remote 核对远端 main 与本地 HEAD 一致。父仓交付提交包含本记录、来源锁更新与六个子模块引用。
