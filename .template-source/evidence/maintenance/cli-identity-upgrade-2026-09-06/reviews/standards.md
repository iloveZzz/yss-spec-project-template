# CLI 升级独立 Standards 审查

- actor_id：`codex.cli-identity-standards`
- role_id / runtime_id：`role.test-engineer` / `runtime.skill-projection`
- review_mode：`worktree`；独立代码审查，不是生命周期会签或发布裁决。
- 结论：本轴未发现需要修复的 `violation`、`drift` 或 `new_impacts`；blocking_signals：`[]`。

## 固定候选

| 候选 | merge base | candidate_digest |
|---|---|---|
| create-yss-spec | f044e7b80b80eb3c3f40ed228fc21bb14f1f7a88 | 6de294ffe579a53d98f6fb3438d23d8c37672358fc5d657941c706a449e9ada5 |
| create-yss-strategic-design | 0787e8a90fb835d7645a9d31482c92b915693867 | 6c68845bf4ed5db9a81393c668dfe39cdedf08cb8dda916ceab9862e6d8efdfc |
| create-yss-harness-dev | c955c215248e2f8577fb84f7b86dc2a17898ccff | 55bedafa2f43dc0678b98c21524aa789b716d182871b15b340bbb0099068fa24 |
| template-source | ccc53f577babbeff5d8a9e674ef883c69bfac47d | 0707192351bd8919ab6f67290663f5264cb55490bae7e1d7733c450a25caed9b |

直接调用 `scripts/lib/maintenance-candidate.mjs` 的 `inspectMaintenanceCandidate` 读取四份 manifest、tracked.diff 和 candidate.bin 新文件字节，并再次核对以上摘要；三个 CLI 由固定 base 的 git archive 加捕获 diff、新文件在临时目录重建，未以 live 实现替代候选。根候选的合同和新验收脚本直接从 packed stream 阅读。

## 规范与检查范围

依据根 AGENTS.md、CONTEXT.md、`.agents/skills/code-review/SKILL.md`、候选中的 `.template-source/contracts/cli-family-identity-contract.md` 以及已确认方案。spec CLI 的 AGENTS.md 要求纯 Node.js、无运行时 npm 依赖；本次解析器来自包内已有 vendor，不新增运行时 npm 依赖。三个 CLI 未发现另外的 CODING_STANDARDS.md / CONTRIBUTING.md。

重点检查五家族识别、同族已声明字段、旧 schema 的 legacy-attach 兼容、JSON/YAML 类型和重复键、profile 与 instantiation、符号链接/特殊文件、包内解析器加载，以及 init/attach/sync 计划前与生成后调用点。帮助与程序更新分支不执行目标家族检查。新回归测试实际检查拒绝退出码、用户文件内容与目录结构保持，未仅验证实现内部函数。

本次没有产品 Slice、Java 或前端业务实现。Alibaba、YSS UI/DDD/Controller/DTO 等专项规则为 `not-applicable`（仅分发既有模板资产，不编写该类运行时代码），不将角色技能目录机械视作已触发的技术影响。code-review 的 Fowler 基线已检查；跨包 guard 复制由本次不增加公共依赖、合同统一及跨包测试的方案决定，不另列重复代码 finding。

## 实际独立验证

重建目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/standards-candidate-T9UFZA/`。

| 检查 | 结果 |
|---|---|
| 四个 packed candidate 的摘要及 tracked.diff 一致性 | 通过 |
| 四个 live 仓库 `git diff --check <base>`（仅辅助格式检查） | 退出码均 0 |
| spec 重建候选 `pnpm exec node --test tests/family-identity.test.js` | 25/25，退出码 0 |
| design 重建候选同命令 | 26/26，退出码 0 |
| dev 重建候选同命令 | 26/26，退出码 0 |
| 三个固定 tgz SHA512 与 pack.json integrity 核对 | 通过 |
| tgz 中 src/cli.js、src/family-identity.js、package.json 与捕获候选逐字节核对 | 全部相同 |

spec/design 的 template 和 snapshot 是 Git 忽略的生成输入，design manifest 也需来自包；使用主控提供的固定 tgz 解包后补齐临时重建环境，未改候选。design 首次测试因临时重建缺 template.manifest.json 失败；补齐该同包文件后 26/26 通过，属于审查环境装配遗漏，不是实现 finding。

固定包目录：`/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-cli-upgrade-20260906-d9zud90d/packs/`。

| 包 | SHA512 integrity |
|---|---|
| create-yss-spec-3.1.1.tgz | sha512-zhWNEbzUBZbMNMp5eqZVJqcCu6ItGY8tOu0inYQ2FANo+zid+DEbKs+HE+0SLwzUWyUpr9dxWrMRauDKO+Hc7g== |
| create-yss-harness-design-0.4.1.tgz | sha512-wHpQkLw7Dz1a4pQ862fLIzu3QYNBTsBZ6VPwBNiPPeCxxe3vHZmgQ1zuiLZy3bj703V8TxftIGlUl5figxsFnQ== |
| create-yss-harness-dev-0.4.1.tgz | sha512-JPllJaiqlnwjn9YIoL2tQpTqif0JZ3knMDu4obnwdOlewt9D+S18LKkIEoP9AWfdiYpfeyrhXsimLoCpg9IjnQ== |

## Findings 与限制

- Findings：0；severity：无；disposition：无待修复项。
- 本轴未重复执行完整升级、事务故障注入、全部模板验证或远端发布检查；那些属于主控集中验证与 Spec 轴的证据范围。此次 77 个测试不能单独证明整体可发布。
- 分发后的 YSS 模板业务语义未逐一重新设计审查；审查重点为 CLI 身份保护与加载路径，派生源变化应由相应模板证据覆盖。
- spec/design 的忽略生成输入由以上独立固定包摘要补充绑定，不声称仅 candidate_digest 已覆盖 tgz 全字节。
- 未更改实现、模板、快照、Git 状态或 checkpoint；最终候选新鲜性和完成结论仍由主控核验。

## 主仓最终候选增量核对

最终根候选为 `review-candidates/template-source-final/candidate-manifest.yaml`，摘要 `0707192351bd8919ab6f67290663f5264cb55490bae7e1d7733c450a25caed9b`。再次用 inspectMaintenanceCandidate 校验并消费 stream；与前次根候选相比 tracked.diff 完全一致、身份合同字节一致，仅 verify-cli-upgrade.mjs 的适用验证命令变化。三个 CLI 候选及固定包不变，原 77/77 身份测试结论继续适用于其相同字节。

已核对固定包文件：三个包均包含 sync-skills 和 update-skill-lock；只有 dev/design 包包含 verify-harness-profile。修订删除对不存在的 verify-entry-alignment 的统一调用，并仅对 dev/design 调用 verify-harness-profile；spec 继续由初始化、metadata、yss-project 和包快照断言覆盖。该改动符合当前分发能力，未发现新增 Standards finding。

已阅读同一固定包证据目录的 packed-upgrade.txt 与 packed-handoff.txt：日志记录 spec 3.1.0 → 3.1.1、dev 0.4.0 → 0.4.1 同身份同步，以及设计导出至综合/研发离线接收链路成功。属于主控执行证据，本轴未重复运行或将其表述为独立执行。最终根候选覆盖关系以上述新摘要为准，不再以旧根摘要代表最终脚本。
