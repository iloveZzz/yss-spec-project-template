# Archify 集成首次完整门禁证据（2026-09-01）

## 候选

- 基线：`b62d97da2bdf6e0253e3a530179eaa8a0db924da`
- 实现候选：`4725f6ab99ab819f36047b9e88aba9ff410eae75`
- 候选类型：`yss-worktree-candidate-v1`
- 候选摘要：`54b23c365d3a1625bfd116e3fede67db03a41bdf6bd03bbf2c87457be137f269`
- 候选清单：`.template-source/evidence/maintenance/reviews/archify-integration-candidate-2026-09-01/candidate-manifest.yaml`

候选在 detached 临时 worktree 中从上述提交区间生成，未包含主工作区中与 Archify 无关的用户改动。`scripts/inspect-maintenance-candidate` 校验通过，`tracked_diff_bytes=7508919`，无 untracked 文件。

## 首次完整门禁

- 命令：`scripts/verify-template`
- 执行时间：`2026-09-01T14:20:50Z`
- 耗时：`10000 ms`
- 退出码：`0`
- 结论：`模板核验通过（release）`

门禁在共享工作区执行，以复用已安装的 Node 依赖和本地尚未推送的子模块提交。此前在 detached 临时 worktree 的隔离尝试未形成通过证据：子模块远端尚未包含 `5891b6245ffac4678b2d7ee525926639a8d4c825`，且临时 worktree 缺少 `.template-source/tooling/node` 的开发依赖。该可取回性问题由本轮授权的依赖顺序推送闭环，不归类为候选实现 finding。

## 关键输出

- Node tooling：32/32 通过。
- Skill 投影、lock、注册表与治理检查：通过。
- Tactical Design 场景：通过。
- 生命周期、协作、维护强度与两轮审查场景：通过。
- 实现路径、repository scope、脚手架、Router、YSS UI 与原型合同场景：通过。
- 治理发布与候选完整性检查：通过。
