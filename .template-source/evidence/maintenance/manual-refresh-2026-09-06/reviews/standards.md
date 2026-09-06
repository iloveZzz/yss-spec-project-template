# Standards 独立文档审查

结论：最终五份源模板候选未发现未关闭的 documented-standard violation；普通文档代码审查通过。此结论不是生命周期会签、可发布裁决或 CLI 包级验收。

## 候选与覆盖

采用 worktree 模式，固定点、merge-base、完整 diff/inventory 命令及 untracked 清单见 `../source-final-2.json` 指向的五份 candidate-manifest.yaml。逐份读取 candidate.bin 的 tracked 记录及所有 untracked 字节，复算 SHA-256，并验证 tracked.diff 与流内记录完全一致；未以 live 工作树替代候选。

| 仓库 | 固定点 | 最终候选 SHA-256 |
|---|---|---|
| 主仓 | dc1b035e87143077e2ceb49d313ea626b9f6827b | 2a8c5301fc390708cbe54082459a828e2e8103423498d7aba3b2f70b42ebdc0a |
| 战略模板 | f41c4a4af3afe6c26d299d6f4f16b6c6d4dc2e5e | 235802c084b6d28da996392e721fbb155bbae0ad0323e17cae2aa51bfac83661 |
| 通用研发模板 | 07a126d76ad33c1e4162d2379ffb68007e01dad3 | 64bce210fa01055c926e519c0340427d39f458b542de54b1c5b8828ac3632efc |
| 后端模板 | f6c66804932975a8bdc24ff1b8e0528795658e2d | 74196d7a760306832525eb29cdcd135b3fd34c8df1e7805ff98f3de19ba64c45 |
| 前端模板 | 467091c244a735ebafea726f48cae1eaeadf84de | ee89985c062e4e366bc2978cc25769b193c3dfa2305fe11195986717f8b42ef6 |

覆盖 README 导航、使用/迁移/兼容指南、专项指南及五仓教学案例。主仓捕获中的 submodule dirty 标记不代表已审阅 CLI 内容或最终 gitlink；CLI 与提交后引用仍由主控单独验证。

## 核对结果

- 根据 AGENTS.md 的仓库身份、单一事实来源、批准、实现仓边界及 Fresh Verification 规则，以及根 CONTEXT.md 的状态定义核对：教学业务明确不是批准 Spec，不登记虚构业务词；通用研发与专职路线可选，未把输入验包等同 ready-for-agent。
- 对照 docs/process/frontend-backend-delivery.md 与命令入口，战略 export/verify/import、后端 export/verify/import、verify-frontend-delivery 的参数及输出描述一致。例子注明替换路径及各命令执行仓，后端离线 verified 不代表真实服务；前端 inputs-verified 仅允许准备计划/合同。
- 对照专职 scripts/instantiate-harness：目标必须不存在、位于模板源外，干净固定提交生成 release_snapshot: true 的说明一致。CLI 家族保护、update/upgrade 与实例 sync 的区别、战略无 attach/sync 都未被写成跨家族迁移途径。
- 五仓相同贯穿案例字节 SHA-256 为 621b82180674c95f8a7f3625858ed44682e701088e0cc7c6c4a5fa181c1b48c4，战略/后端/前端职责及失败回交流程一致。
- 读取 /tmp/yss-manual-validation 下五份最终 *-full.json 及日志：scripts/verify-template 均 exit_code 0。design/dev 首轮失败记录仍保留，最终复验通过；不把首轮失败说成首次全绿。

## 已关闭的候选完整性问题

首次 source-final 的研发候选含运行中测试生成的 docs/.scratch/_verify-task-package/{evidence.json,maintenance.json,slice-contract.json}，不属于手册范围。已要求测试结束后重捕获。对 source-final-2 的逐字节比较证明：仅删除上述三项临时文件，tracked.diff 与其余 untracked 文件完全不变，其他四仓摘要不变。最终候选不包含这些临时产品合同。

## Fowler smell baseline

未发现需阻断的代码异味。本轮为文档，类、继承、调用链等规则不适用。五仓教学内容相同服务独立分发的已确认需求，不据重复本身要求引入运行时代码或新抽象；手册的导航/通用规则引用并未成为新的权威政策。

专项覆盖：Java/YSS 生产代码规则、Slice required_skills、UI fidelity 均 not-applicable，因为候选没有生产实现或用户界面变更。适用的仓库身份、文档语言、职责与批准、命令、验证和分发边界已核对。

最终未关闭 findings：0；历史候选完整性问题：1，已按新摘要复核关闭。
