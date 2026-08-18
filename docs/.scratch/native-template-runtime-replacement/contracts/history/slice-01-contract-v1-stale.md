# TEMPLATE-RUNTIME-01 Contract v1（已失效）

失效原因：独立审查发现 v1 的 fresh verification 借用 Phase A POC 的隔离工具链；生产仓本身没有版本钉死、可 bootstrap 的 Rust toolchain，独立 Reviewer 无法重现。

失效触发器：`new-write-path`、`verification-command-changed`。v1 未产生提交或发布资产；v2 仅增加受控 toolchain bootstrap 与 wrapper，不扩大公开 CLI seam。
