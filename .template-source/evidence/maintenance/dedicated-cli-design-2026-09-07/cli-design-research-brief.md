# 前后端专职 CLI 设计研究简报

## Research Scope

- Profile：`technical-evidence`；Mode：`evidence-audited`。原只读访谈探索因将进入持久设计而提升审计模式。
- 决策输入：新 `create-yss-harness-backend` / `create-yss-harness-frontend` 的创建、旧实例兼容、共享核心与固定快照设计。
- 读者：主控设计起草者、提问者与后续独立审查者。时间边界：2026-09-07 本地源码字节。
- 纳入：已登记模板和 CLI 的第一方源码、配置、合同。排除：竞品、npm 实时状态、账号权限、未执行测试的行为推测。
- 访问限制：只做本地读取与哈希比对。未运行初始化、测试、发布或联网检查。源码 SHA256、仓库 HEAD、检索范围及反证均保存在相邻 Evidence Ledger。

## Executive Read

现有家族身份、初始化和受管文件机制提供可复用基础；旧仓内入口依赖模板源 Git，旧 metadata 又与 dev CLI 不同，因此新入口需要清晰的构建/运行边界和同族兼容规则。公共核心是需要落地的新治理机制，不能假称现仓已经具备。上述结论只约束设计，不说明新 CLI 已实现、npm 名称可用或资产已批准。

## Findings

| Claim | 已核实观察与边界 | 第一方定位 |
|---|---|---|
| claim-001 | 两仓内脚本哈希相同，初始化要求源仓身份、Git HEAD/status/ls-files；允许脏树仍需 Git。 | [初始化脚本](../../../../submodules/yss-harness-backend-agent/scripts/instantiate-harness) 17–30、40–67；evidence-001/002/017 |
| claim-002 | 专职旧格式使用 snake_case、digest/mode 及链接基线，dev 使用 camelCase、type/contentHash 和变量；宽松历史读取不提供转换。 | [旧 metadata](../../../../submodules/yss-harness-backend-agent/scripts/instantiate-harness) 50–64；[dev metadata](../../../../submodules/create-yss-harness-dev/src/cli.js) 1282–1316、1490–1555；evidence-003/004/005 |
| claim-003 | 专职 profile/metadata 身份已存在；家族 guard 同时检查显式 cli_package。 | [身份校验](../../../../submodules/create-yss-harness-dev/src/family-identity.js) 5–12、62–103；[后端 profile](../../../../submodules/yss-harness-backend-agent/docs/process/harness-profile.yaml) 46–57；[前端 profile](../../../../submodules/yss-harness-frontend-agent/docs/process/harness-profile.yaml) 46–57；evidence-006/007/008 |
| claim-004 | 限定检索范围未发现独立公共 CLI 核心依赖或源码投影生成器；三个身份校验文件一致，存在可复用代码。 | [dev 包清单](../../../../submodules/create-yss-harness-dev/package.json) 13–28；[身份实现](../../../../submodules/create-yss-harness-dev/src/family-identity.js)；search-004/005、evidence-009/010 |
| claim-005 | dev 初始化消费包内快照并检查提交及摘要；构建脚本另有 working-tree 分支。 | [运行时](../../../../submodules/create-yss-harness-dev/src/cli.js) 12–18、83–105、1858–1878；[快照构建](../../../../submodules/create-yss-harness-dev/scripts/sync-template.js) 431–480；evidence-011/012 |
| claim-006 | 不新增专职 CLI 是旧轮次范围；身份保护同时存在，后续设计应分别处理。 | [旧身份合同](../../../contracts/cli-family-identity-contract.md) 3–29；evidence-013/014 |
| claim-007 | dev attach 要求目标无本族 metadata；已有 metadata 提示 sync。 | [attach 与 sync](../../../../submodules/create-yss-harness-dev/src/cli.js) 1490–1495、1927–1944；evidence-015/016 |

**推论与建议（不作为既有能力事实）**：新设计应分别描述包内快照生成、运行时事务写入、repository-local 同族接管与普通 attach；构建时共享核心应登记唯一来源及确定性校验。用户已作出的能力与架构选择由主控设计记录承载，本研究不重新作决定。

## Counter-Signals

- `--allow-working-tree` 确实允许维护期脏源码，但没有绕过 Git 依赖，故不支持“原脚本可直接在无 Git npm 包内运行”的推断。
- dev 存在无 metadataSchemaVersion 的旧格式读取路径，所以不声称旧 metadata 必然在 JSON/schema 读取时失败；缺的是专职 snake_case 基线转换和同族身份适配。
- 三 CLI 的身份实现字节相同，表明公共逻辑已存在；“未发现公共核心”严格限定为 search-004 的目录、manifest 与生成脚本范围，不证明全局不存在。
- 包内固定快照与构建时 working-tree 模式并存。发布绑定必须另行验证，不能把默认 prepack 视为发布证据。
- 旧合同写有“本轮”及当时版本；它不是永远禁止新增 CLI 的规则。此次变更范围仍应由用户原始回复与最终设计确认绑定。

## Source Map

相邻 [cli-design-evidence.yaml](cli-design-evidence.yaml) 是 Search Log、Evidence Ledger、claim-source 审计的单一事实来源，含 9 次检索/检查记录、17 个来源观察及 7 项已审计结论。第一方源码支撑执行结构，配置支撑身份，旧合同支撑历史范围。CodeGraph 只用于定位，未更新索引；初次 glob 查询未展开产生 zsh 错误后已改显式路径，不作为证据。外部注册表明确排除，无网络访问失败。每项来源有相对根路径、行号和当前文件 SHA256，可独立定位；相同文件的支持与反证不算独立样本。

## Decision Handoff

下游所有者为主控设计起草者，消费目标是 [专职 CLI 设计草案](../../../contracts/dedicated-harness-cli-design.md)。本研究只写当前 brief 与 ledger，不修改目标资产、状态、合同或批准。主控应在引用时复核证据哈希，并将用户 Q1–Q8 与后续决定绑定原始回复；研究结果不代替该确认。

## 后续设计范围更新（2026-09-07）

提问者随后明确 P2“旧实例不做兼容”。本研究中旧格式差异及 attach/sync 分工仍是已审计源码事实，但不再作为首版实现旧实例迁移的需求依据；新设计只据此识别并拒绝旧实例。原研究范围与观察记录保留，当前实施范围以已确认设计 v1.1.0 为准。

## Evidence Limitations

所有结论是本地静态审计；未运行初始化或测试，不证明未来实现行为。不存在性结论已收窄到实际搜索范围；未评估未登记仓库。未核验 npm 包名、发布权限、已发布版本、平台兼容、目标用户资产样本。技术结论没有遗留 unsupported 项；这些实现/发布验证问题仍留给对应后续工作单元，不在本研究中宣布通过。
