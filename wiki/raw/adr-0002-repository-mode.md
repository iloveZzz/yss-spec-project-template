# ADR-0002: 使用 `yss-project.yaml` 声明仓库身份

模板源仓库与模板实例仓库共享大部分目录和流程资产，仅靠目录、Git 远程或占位符推断身份会导致 Agent 选错流程。因此在根目录使用 `yss-project.yaml` 作为 CLI 与 Agent 共享的稳定契约，只声明 `schema_version` 和 `repository_mode`：模板源仓库使用 `template-source`，`create-yss-spec` 生成的仓库使用 `project-instance`。项目名称、团队规模和 Tracker 等易变信息不放入该清单，避免形成新的重复配置源。
