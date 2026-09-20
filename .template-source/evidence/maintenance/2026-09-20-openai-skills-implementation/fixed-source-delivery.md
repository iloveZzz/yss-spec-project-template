# 固定来源交付待办

本轮授权覆盖本地整改、跨仓同步、开发快照和验证；不包含提交、推送、npm 发布或部署。八个仓库 HEAD 保持基线值。四个 CLI 当前均为 `sourceState: working-tree`；`templateCommit` 只是其工作树所基于的 HEAD，不是本轮改动已经提交的证明。

| 顺序 | 动作 | 验收证据 |
|---|---|---|
| 1 | 取得本轮文件范围的提交、推送授权，按 changed-file-manifest 审阅来源和新增文件 | 仅本轮范围进入提交；既有未跟踪证据保留 |
| 2 | 固定战略源仓四项公共技能及其受影响资产 | 真实完整 SHA，实际 upstream tree hash，必要推送后可获取 |
| 3 | 按新战略 SHA 更新父模板的来源清单和锁，核验薄适配、profile、投影 | 战略来源门禁通过，不填虚构 revision/hash |
| 4 | 固定父模板及三个 Agent 最终来源，核验 gitlink、源内容与派生关系 | 使用最终完整 SHA，不使用中间提交或 WORKTREE |
| 5 | 用各自最终来源 SHA 重建四个 CLI；主 CLI 同时更新默认固定来源 | 每个快照 sourceState=committed，摘要和来源可复现 |
| 6 | 对固定快照运行安装、初始化、同步及完整模板/发布检查；随后固定 CLI 的交付改动 | 全部适用检查通过，记录实际退出码和打包摘要 |
| 7 | npm 发布、部署等按另外的明确授权执行 | 发布结果与 Git 交付分开记账 |

三个专职 CLI 的同步接口为 `node scripts/sync-template.mjs <source-repo> <final-full-sha>`。主 CLI 使用 `YSS_SPEC_TEMPLATE_REPO`、`YSS_SPEC_TEMPLATE_REF` 和 `node scripts/sync-template.js --require-committed`；源码中的 `DEFAULT_TEMPLATE_REF` 也必须绑定最终父模板 SHA，否则以后 `prepack` 仍会重建旧默认版本。不要只改本地忽略的快照文件。

主 CLI 的 `template/` 和 `template.snapshot.json` 被其 Git 忽略；本地快照确已重建并通过 prepared 测试，不能用“Git 无差异”推断未同步，也不能把它当作已固定版本。当前快照摘要见 cli-snapshots.json。

回滚仅恢复本批文件。tracked 文件从 changed-file-manifest 记录的 before_commit 读取；恢复前核对当前摘要仍为本轮 after_sha256。新文件也只处理本轮清单且摘要匹配的文件。CLI 派生快照从对应已恢复来源重建；主 CLI 的忽略快照需在独立临时目录按 baseline.tar.gz 与记录的基线 HEAD 重建。禁止 reset --hard、清空目录或覆盖他人后续改动。
