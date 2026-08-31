# 模板三级核验试运行记录

- 试运行日期：2026-08-31
- 仓库身份：`template-source`
- 目标状态：`implementation-ready`
- 实现者：`worker.template-verification-efficiency`

## 实际结果

| Profile | 输入 | 结果 | Wall time |
|---|---|---|---:|
| fast | `docs/user-guide/example.md` | pass；仅执行通用只读检查 | 0.670s |
| candidate | `docs/process/harness-process-tailoring.md` | pass；命中 maintenance 与 candidate-integrity | 1.846s |
| release | 加入 packed candidate 后的当前完整工作树 | pass；保留旧发布门禁全部行为命令并增加三级路由、两轮审查、缓存与 packed candidate 场景 | 10.773s |

完整门禁使用最多四个并行检查组，所有组输出按 profile 中的稳定顺序汇总。三次核验前后 `git status --porcelain=v1 -z` 一致，未产生非预期跟踪或未跟踪文件。

## 路由与压力场景

- 文档路径未运行无关 skill 检查。
- canonical skill 路径命中 skills 检查组。
- maintenance 流程路径命中 maintenance 与候选完整性检查。
- 未映射根路径自动升级 release。
- 核心核验器、profile 清单或 checkpoint 校验器变化自动升级 release。
- checkpoint v1 继续兼容；v2 的三态、候选摘要和两轮上限均通过正反场景。
- URL + 40 位 commit 缓存通过 miss、hit、来源篡改和浮动 ref 拒绝场景。
- packed candidate 将任意数量的 untracked 内容收敛为 `candidate.bin`，新候选固定只创建 manifest、stream 和 tracked diff 三个文件；历史逐文件候选继续通过验证。

本轮未观察到已映射路径误报或遗漏；新增路径仍以“未知即升级完整门禁”兜底。该结论只覆盖本次试运行路径，后续 profile 路由扩展仍须补相应场景。
