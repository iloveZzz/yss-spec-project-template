# Git 与 CLI 升级 checkpoint

用户于 2026-09-10 明确授权完成 Git 提交、CLI 升级并推送 GitHub。本记录是原 `implementation-ready` 性能报告之后的分发检查点；不代表 npm 发布。

## 固定来源

- 根模板正式来源：`6bce469ddca4d9a85db13fe517973be6bb28a238`
- Design Harness：`3a358684c5684ada433dca4fd97ee187050ca6d8`
- Dev Harness：`7b1bc292f594005d62209252c93de5da11a8dc50`
- Backend Harness：`42a2e6dd200cccb32202e44e213feceb80380f02`
- Frontend Harness：`dbede16398a4d92ee33723879058e2ec3e12e130`

## CLI 版本与提交

| CLI | 版本 | Git commit | 固定模板 / core |
|---|---:|---|---|
| `create-yss-spec` | 3.3.1 | `8e71bc2` | 根模板 `6bce469…` |
| `create-yss-harness-design` | 0.5.1 | `5fe531c` | Design `3a35868…` |
| `create-yss-harness-dev` | 0.5.1 | `32055e8` | Dev `7b1bc29…` |
| `create-yss-harness-backend` | 0.2.1 | `0ead951` | root core `882cd46…`、Backend `42a2e6d…` |
| `create-yss-harness-frontend` | 0.1.3 | `ee9857f` | root core `882cd46…`、Frontend `dbede16…` |

上述 9 个子仓提交均已推送各自 GitHub `origin/main`，随后由父仓 gitlink 固定。

## Fresh Verification

- 五套 CLI 测试通过：Spec 172、Design 37、Dev 82、Backend 1、Frontend 1。
- Backend / Frontend `verify-bundle` 通过，五套 `npm pack --dry-run` 通过。
- 最终不可裁剪 `scripts/verify-template` 退出 0，profile 为 `release`；包含 core 40 项测试、生成实例、Skill 来源/投影/锁和跨仓分发。
- 首轮 release 核验发现根 `skills-lock.json` 仍绑定 Design 旧 revision；更新 manifest、锁及投影后，专项验证和完整 release 核验均通过。

V8 原始 coverage 保留在本地证据目录并由 `coverage/.gitignore` 排除；摘要、逐项台账、测量日志和一致性结果纳入 Git。未执行 npm publish，也未把本地 mock 解释为真实 Maven 私服、远端 fetch 或 self-update 性能。
