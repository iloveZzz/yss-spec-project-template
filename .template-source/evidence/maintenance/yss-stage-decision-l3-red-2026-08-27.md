# yss-stage-decision L3 RED 证据

日期：2026-08-27

本轮新增技能尚未接入单一事实源时，以下既有门禁按预期失败：

- `node scripts/verify-lifecycle-registry`：失败，提示活跃 ID 与已发布基线不一致；
- `node scripts/verify-skill-registry`：失败，提示 `yss-stage-decision` 未锁定；
- `node scripts/sync-skills --check`：失败，提示 `yss-product-lifecycle` projection drift。

这些失败证明新增技能不能只放在 `.agents/skills`，必须同步生命周期注册表、技能锁和平台投影。
