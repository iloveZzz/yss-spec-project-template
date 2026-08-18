---
id: TEMPLATE-RUNTIME-REPLACEMENT
Status: ready-for-human
tracker: local-markdown
impact: template-source, cross-repo, release-only, high-risk
---

# 原生 Rust 模板运行时替代与 3.0 发布

## 目标

以 ADR-0011 将 `create-yss-spec` 与模板实例的公开 Node 运行时迁移为原生 Rust 3.0，并经 RC 及稳定发布验证后形成可替代结论。

## 范围

- Harness：运行时契约、模板 launcher、迁移文档、发布合同与门禁。
- 既有外部仓：`/Users/zhudaoming/Projects/create-yss-spec`，仅承载 npm 3.0 migration shim 和 legacy 2.x 收束。
- 新外部仓：公开 `iloveZzz/yss-template-runtime`，承载 Rust 生产实现、测试、CI、Release 与供应链资产。

## 非范围

- 模板维护侧 Node 构建工具的立即迁移。
- 前端、后端、OpenAPI、数据库与权限业务行为。
- 未满足发布证据时的 npm `latest` 切换或稳定版发布。

## 2026-08-18 用户确认的预览范围

- Windows 延后；本轮只交付 macOS arm64 与 Linux x64 musl。
- 使用 `v3.0.0-rc.1`，Tag 推送后具备 GitHub Actions 自动触发路径；本次最终成功 run 通过 `workflow_dispatch` 使用 `main@7c947117302fc513cca74f7862592378824de326` 启动，并在 job 内 checkout 固定 Tag，创建 draft/prerelease Release。
- 资产为未签名 `.tar.gz` 与 SHA-256 校验文件；这是非稳定技术预览，不是稳定发布或 Node 替代结论。
- Git 写操作只授权 `/Users/zhudaoming/Projects/yss-template-runtime` 的 `origin`，不涉及模板治理仓和 `create-yss-spec`。

## 2026-08-18 预览执行证据

- 外部实现仓库 `main` 已推送至 `7c947117302fc513cca74f7862592378824de326`；`v3.0.0-rc.1` annotated Tag 仍指向 `afca89a718e991c5fc2709186cbb9f3c9964367f`。
- [Actions run 32052996408](https://github.com/iloveZzz/yss-template-runtime/actions/runs/32052996408) 由 `workflow_dispatch` 触发，使用 `main@7c947117302fc513cca74f7862592378824de326` 的 `Release preview` workflow，并在 job 内 checkout 固定 Tag；该 run 已通过两个目标的构建、测试、运行时 smoke test、打包、资产上传和 Draft Release 创建。
- [Draft Release](https://github.com/iloveZzz/yss-template-runtime/releases/tag/untagged-812dc7a86cb773d3fc9b) 保持 `draft=true` / `prerelease=true`，远端资产为两份 `.tar.gz`、两份 `.sha256` 和两份 `.build-info.txt`；下载后校验均通过。
- 本地模板治理仓仅更新本 ADR / Ticket / 研究记录，未 commit 或 push。

## 关键门禁

1. 完整公开行为 oracle 与 Rust 双跑；
2. 固定模板 commit 的 init/attach/sync/失败回滚跨仓证据；
3. 三平台 30 次性能与兼容矩阵；
4. macOS/Windows 签名、Linux Cosign、SBOM、attestation、immutable release；
5. 独立审查和平台发布团队批准。

## 资产与状态

| 资产 | 状态 |
|---|---|
| ADR-0011 | 已接受 |
| 跨仓发布合同 | `ready-for-human` |
| 实现仓登记 | `ready-for-human` |
| Build Architecture Checklist | `ready-for-human` |
| Slice 01：production bootstrap 与 help oracle | `ready-for-human`，已通过独立审查并推送 checkpoint `1de00ea` |
| Slice 02：native CLI / snapshot / instance runtime | `ready-for-human`，合同 v1 已批准，26 tests 与独立复核完成，尚无 checkpoint |
| Slice 03–05 | `ready-for-human` |

## 当前阻断

- 本轮双平台非稳定预览的执行项已完成；正式生产仓级别的 bootstrap / protected release environment / 发布团队批准仍未建立；
- 平台发布团队的 Apple、Windows 签名身份尚未提供；
- Slice 02 生产实现尚未 checkpoint；三平台构建、签名/attestation、安装器和完整 Node oracle 仍是后续 Slice/发布门禁。

## Git checkpoint

本功能包使用 Local Markdown 作为权威 tracker。当前仅为治理基线；未授权的 Git commit/push 不随本 Ticket 自动发生。
