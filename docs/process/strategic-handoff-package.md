# 战略交接快照包

本合同用于批准后的战略交付和研发接收，不增加生命周期阶段或门禁。`scripts/strategic-handoff` 是统一入口；Node 22+、Python 3 和现有 `jsonschema` 环境即可运行，不下载依赖、不执行交接包中的代码。包 schema 与导出配置见同目录 `schemas/strategic-handoff-package.schema.json`、`schemas/strategic-handoff-export.schema.json`。源规则仍由战略合同持有，索引与快照不成为第二套事实源。

## 源资产准备

1. 源仓必须为 `project-instance`。业务边界与规则合同保留 schema v2，正式便携导出要求 `traceability_version: 1`。`rule_catalog` 的每行包含稳定 `rule_id`、`statement`、`responsible_context`、`status: confirmed`。不得用行号、文字 hash 或导出顺序生成业务身份。
2. 每个场景明确 `critical`、`rule_refs`、`success_results` 和既有 `failure_results`；兼容字段 `rules` 必须与引用规则正文一致。不变量使用 `rule_ref`，并通过 `scenario_refs` 指向确实覆盖该规则的场景。缺身份或关联先回战略方确认、更新并重新批准，导出器不猜测。
3. Handoff v3 的 `package_export` 使用导出 schema。`approvals` 按 `source` 字段及 `handoff` 绑定批准记录，声明 `record_ref`、`gate_id`、`digest_kind`。沿用源角色表的现有门禁；战略、阶段、Spec 分别对应各自批准门禁，原型和视觉基线对应 `gate.user-confirmation`，业务 Ticket 集和完整交接对应源 profile 的交接批准门禁（综合模板使用阶段决策包门禁绑定本次交接）。
4. 批准记录除既有会签字段，还要在 `artifact_bindings` 中逐项绑定 `{id, version, digest}`。战略/阶段建议 `canonical-json`；普通文件使用 `sha256-bytes`；视觉基线使用 `visual-baseline`。正文中的 `approved` 和可读取批准路径不能替代当前字节的批准绑定。源角色表要求用户决定记录时，接收端必须支持并核验该策略；旧工具缺少该能力时阻断并要求升级，不能按旧规则放行。
5. `additional_files` 明确补充依赖；`reference_map` 将 `evidence.*` 稳定证据引用解析为仓内路径。源资产、批准记录、证据引用、Markdown 本地链接和显式目录共同形成依赖闭包。HTTP 引用保留为引用，不在导出时下载网页。
6. `prototype` 指定 `profile`、`preview_root`、`entry_ref`、`verification_ref`、`verification_digest`（验证记录的字节摘要）；H2 另须 `source_root`、`lock_ref` 和 `source_digest`（源码目录树摘要，算法同下述预览树）。源码交付目录不含 node_modules / .git；锁文件与源码一同保存。预览目录须资源闭合，可通过本地静态服务离线浏览。源码、锁文件或验证记录变化须更新交接摘要并重新批准。
7. 离线浏览验证记录必须有 `network_mode: offline`、实际 `command`、`executed_at`、`exit_code: 0`、`case_ids`、`evidence_refs` 和 `preview_digest`。后者为按路径排序的预览文件 `{path: 相对preview_root路径, sha256: 字节摘要}` 数组的 canonical JSON SHA-256。记录须覆盖视觉基线 case；采集时禁用外网，动态资源与交互由实际浏览器验证。验包不执行来源代码；静态闭包检查不能替代浏览器证据。

## 命令

以下路径参数由当前资产提供，不从目录 glob 猜测业务含义。

```bash
scripts/strategic-handoff export --source-root <战略项目根> --handoff <仓内交接文件> --output <新目录> --zip
scripts/strategic-handoff export --source-root <战略项目根> --handoff <新版本交接文件> --output <新目录> --previous <上一目录或ZIP> --zip
scripts/strategic-handoff verify --bundle <目录或ZIP>
scripts/strategic-handoff import --bundle <目录或ZIP> --target-root <研发项目根>
```

目录是逻辑包；ZIP 只负责运输。源资产原始字节进入 payload，清单以 `original_ref → path` 映射原路径到包内路径；原 Handoff 保存在 `handoff.yaml`，源根词汇表保存为 `payload/source-context.snapshot.md`。包中不创建嵌套 `CONTEXT.md`。独立验包时工具在临时目录重建只读验证视图，完成后清理；不把临时源词汇表注册为目标权威。

`manifest.json` 的 `files` 声明所有文件的字节摘要和大小。`bundle_digest` 是删除自身字段后 canonical JSON 的 SHA-256；不把整 ZIP 摘要当逻辑版本摘要。目录与 ZIP 的逻辑摘要相同。源合同的既有语义 digest 另行复核。目录/ZIP 已存在时拒绝覆盖，同身份版本不同内容的导入拒绝；已验过且相同的重复导入返回 `already-imported`。限制为 20,000 文件、512 MiB 展开内容；拒绝 ZIP 路径穿越、重复路径、大小写碰撞和符号链接。

## 下游接收与逐条追溯

导入落盘到 `docs/handoffs/<handoff-id>/<version>/`，包含不可变 `package/`、`import-receipt.json`、`context-reconciliation-draft.json`、`tactical-traceability-draft.json`、`upstream-change-impact.json`。仅写快照与草案，不自动更新根词汇表或批准状态。目标侧确认增量后更新唯一根 `CONTEXT.md`，生成既有 schema 的正式 reconciliation 并校验。

战术合同的 `strategic_handoff` 绑定 `import_receipt_ref`、`bundle_digest`、`context_reconciliation_ref` 和 `rows`。逐条覆盖全部规则与 `critical: true` 的成功/失败场景；行字段如下：

- `source_id`、源对象 `source_digest`、`disposition`、`dependency_status: known | unknown`、`dependent_slice_refs`。
- `implemented`：`tactical_refs`、`test_seam_refs`、`evidence_refs` 必须可解析；关键场景另用 `scenario_tests` 分别绑定 `outcome: success | failure` 与 `seam_ref`。
- `deferred`：`reason`、`risk`、`owner`、`followup_ticket_ref`、`verification_plan`、`target_version` 完整。仍阻断依赖切片。
- `not-applicable`：必须有 `reason` 和可读取 `evidence_refs`，不允许用它掩盖未决冲突。
- `pending` / `conflict`：阻断相关部分，冲突回交战略方更新和批准。依赖未知或未解释时阻断全部相关切片。

```bash
scripts/verify-strategic-handoff-consumption --root <研发项目根> <战术合同>
scripts/verify-strategic-handoff-consumption --root <研发项目根> --slice <切片ID> <已批准战术合同>
node .agents/skills/yss-tactical-design/scripts/validate-tactical-design.mjs <战术合同> --root <研发项目根>
```

整体验证有未落实项时返回 blocked；按切片验证可放行有证据证明不依赖这些项的切片。输出 `block_all`、`blocked_slice_refs`、`issues`、实际消费包摘要与战术摘要。通过只证明结构化映射完整和引用可核验，业务语义仍需独立评审；不能代替 Slice Contract 批准。

每版完整快照可独立消费，差异区分 added / updated / removed。更新须提升交接版本，内容变化的源资产也须提升其版本。接收新版本后，消费校验比较最新已导入源对象摘要；规则变化按行依赖阻断，未映射的新规则扩大阻断，战略责任边界、方案决策、Spec/视觉/原型源码等变化未重新绑定时整体阻断。`upstream-change-impact.json` 是生命周期处理 stale 的证据输入，不直接改 Tracker 或覆盖战术合同。

## 维护与同步

共享脚本和包 schema 以主模板为维护源，通过 `scripts/sync-strategic-handoff-tools` 同步到设计/研发模板；源战略 schema 的离线验证副本由该脚本从 canonical `yss-stage-decision/references` 派生。三仓技能仍只编辑 `.agents/skills`，再生成各 runtime 投影与锁。CLI 快照使用各自同步工具，工作树快照用于集成验证，不代表已发布 commit。

维护者可先同步三个 CLI 快照，再运行 `node .template-source/scripts/verify-strategic-handoff-distribution.mjs`，用临时合成资产验证实际生成实例之间的完整链路；结束后清理临时项目。
