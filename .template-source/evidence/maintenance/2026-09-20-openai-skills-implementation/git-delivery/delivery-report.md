# Skills 整改固定版本交付

用户已授权提交和 GitHub 推送。四个来源与四个 CLI 已完成固定版本整改；npm 发布和部署未执行。

| CLI | 版本 | CLI 提交 | 模板来源提交 |
|---|---|---|---|
| create-yss-spec | 3.4.9 | `86adf8f04836` | `9126b41c5657` |
| create-yss-harness-design | 0.8.4 | `b8b656bbaf45` | `83d7bce7eab1` |
| create-yss-harness-backend | 0.4.8 | `c81521dc3a66` | `b78a457c56fb` |
| create-yss-harness-frontend | 0.3.8 | `9c6a9c14a876` | `2f9ee4e6b90c` |

父模板最终技能源提交：`9126b41c5657b8c80ac3ff6aa7117f4b01e14e18`。独立干净检出验证提交：`36904aace9482e250ece815ac29e160a9da65288`。后者只记录四个 CLI gitlink；其后的本仓提交仅归档维护证据。CLI 不绑定 WORKTREE，也不把交付记账提交误当新增技能源。完整 SHA 见 [delivery.json](delivery.json)。

验收结果：

- `scripts/verify-template` 完整 **87/87 通过**，此前战略来源摘要门禁已关闭。见 [逐命令结果](full-verification.json) 和 [完整日志](full-verification.txt)。
- 干净工作树的固定版本发布前验证通过，含实际打包、安装、初始化、投影/锁检查和同步；见 [发布前验证](release-verification.json)。这不是 npm 发布结果。
- 四个 CLI 的 `pnpm test:prepared` 均通过；本体 187 项，战略与后端各 1 项复合包合同，前端 2 项复合合同。见 [CLI 测试](cli-tests.json)。
- 四个实际 tgz 均完成安装、初始化和同步；专职 CLI 另验 doctor、diff、attach、recover。安装包来源状态均为 committed，完整 SHA 与源提交一致。见各 `*-package.json`。
- 主仓及三个 Agent 的投影、锁、Registry、治理共 16 项通过。原有 176 个未跟踪证据全部保留。
- 本轮沿用已完成的 64 次真实 Agent 评测：统一评分基线 32/32、候选 32/32，关键违规为零；没有效率改善结论。Git 交付批次仅补充末尾空行修正、真实来源 revision/锁以及版本元数据，不宣称额外 Agent 评测。

失败保留：首次专职包验收使用 macOS `/var` 符号链接路径，被既有路径保护正确拒绝；fixture 改用真实路径后通过，未修改产品行为。原始失败见 `package-fixture-path-attempt/`。父仓一个已闲置约 48 分钟、无进程占用的 index.lock 已移到本地 /tmp 备份后恢复暂存。GitHub 凭据 helper 发出旧架构 gh 警告，但所有推送均获得成功回执。

原始轨迹、大体积工作树归档和完整生成快照仍在本地，摘要索引与评分结果入 Git；不以摘要替代原始证据。无关脏文件和用户状态未清理或迁移。

原始完整日志按原字节归档，其中验证命令输出自带四处尾部空白；仅 `git-delivery/full-verification.txt` 从提交空白检查排除，其余暂存文件通过 `git diff --cached --check`。
