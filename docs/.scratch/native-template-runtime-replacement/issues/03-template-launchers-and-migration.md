---
id: TEMPLATE-RUNTIME-03
Status: ready-for-human
---

# 03：模板 launcher、metadata 迁移与跨仓兼容

将实例公共验证入口委派到原生实例运行时，保留既有脚本路径并新增跨平台子命令；在固定 template commit 上验证 Node 2.x legacy、迁移 shim 与 Rust runtime 的升级/拒绝/回滚边界。依赖 02。
