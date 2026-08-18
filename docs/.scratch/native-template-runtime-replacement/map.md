# Native Template Runtime Replacement 工作地图

状态：`ready-for-human`

| 顺序 | 切片 | 状态 | 依赖 |
|---|---|---|---|
| 01 | 正式 Rust 仓库与行为 oracle 基线 | `ready-for-human` | ADR-0011、实现仓登记 |
| 02 | 原生 CLI / 实例运行时与 snapshot 绑定 | `ready-for-human` | 01、冻结模板契约 |
| 03 | 模板 launcher、metadata 迁移与跨仓兼容 | `ready-for-human` | 02、模板变更审查 |
| 04 | RC 供应链、签名、三平台集成与性能 | `ready-for-human` | 03、受保护发布环境 |
| 05 | 稳定版晋级、legacy 收束与复盘 | `ready-for-human` | 04、平台发布团队批准 |

所有切片在生命周期复核并具备当前合同、目标仓与验证命令前不得标记 `ready-for-agent`。
