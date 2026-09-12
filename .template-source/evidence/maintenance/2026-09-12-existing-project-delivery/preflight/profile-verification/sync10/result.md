# sync10 针对分发 Fresh Verification

结论：通过。全程使用 working-tree 快照；这是合成实例的分发与机制验证，不是 S0–S6/O1 产品验收。

## 实际 CLI 同步

sync09 原始临时实例通过当前 CLI 正常更新，无 force。测试使用单独副本，仅补 owning profile 测试脚本/fixture；没有补创作技能或替换运行时代码。

- `node /Users/zhudaoming/Projects/yss-spec-project-template/submodules/create-yss-spec/bin/create-yss-spec.js sync --target-dir /private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-final-delivery-cli-fresh-3nh2r2ow/spec`：退出 0，11.56 秒。
- `node /Users/zhudaoming/Projects/yss-spec-project-template/submodules/create-yss-strategic-design/bin/create-yss-harness-design.js sync --target-dir /private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-final-delivery-cli-fresh-3nh2r2ow/design --apply`：退出 0，13.83 秒。
- `node /Users/zhudaoming/Projects/yss-spec-project-template/submodules/create-yss-harness-backend/bin/create-yss-harness-backend.js sync --target-dir /private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-final-delivery-cli-fresh-3nh2r2ow/backend --apply`：退出 0，3.23 秒。
- `node /Users/zhudaoming/Projects/yss-spec-project-template/submodules/create-yss-harness-frontend/bin/create-yss-harness-frontend.js sync --target-dir /private/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-final-delivery-cli-fresh-3nh2r2ow/frontend --apply`：退出 0，2.81 秒。

## 字节与锁

- 三接收模板的 8 个共享运行时按当前分发转换规则匹配主源；后端 preflight 的一处原型验证 import 使用现有 backend-wire-runtime 映射。
- 四 CLI 各 8 个运行时与 skills-lock.json：所属模板 → CLI 快照 → 实际同步后实例完全一致。
- 四 CLI 完整 snapshotHash 与 manifestHash 重新计算通过；专用后端/前端各 15 个 core 文件与源、vendor、锁摘要一致。

| CLI | 当前 snapshotHash |
|---|---|
| create-yss-spec | `2c2158af2d661eb160eee4672ef027c8550402528273b61fec82f232e9539b8b` |
| create-yss-strategic-design | `4a745584a55eb7575f53a9ede979de2449922682c8bada59258574b70c953a48` |
| create-yss-harness-backend | `6fac32a51b141489e69951a3b509c69aeadaaabc13feb224c0219eb952933533` |
| create-yss-harness-frontend | `a4c9a3993bbec2145a9d31e33c83837bfc9d43849ec4c70345ae8b34657d2d24` |

## 新变化验证

- `node --test scripts/fixtures/delivery-preflight/approved-execution.test.mjs`：当前 spec CLI 实例、backend CLI 实例、backend 接收模板，各 8/8。包含结构损坏拒绝及历史最小 Slice 批准兼容。
- `node --test --test-name-pattern="既有 UI 全目录" scripts/verify-existing-ui-baseline-scenarios`：四 CLI 实例与三接收模板，各 1/1。源删除后正常只读验包，治理悬空引用仍拒绝。
- design/frontend 不拥有原始 Slice 批准，批准增量场景带职责理由不适用；完整共有协议及两类架构正例已由 sync09 与上述 owning profile 覆盖。

详细命令、目录、完整 SHA-256 与日志位于 summary.json；完整快照校验位于 snapshot-integrity.json。verify.py 保留实际同步与验证路径；其接收模板断言修正仅修复测试脚本对既有分发转换的错误假设，未修改运行时。
