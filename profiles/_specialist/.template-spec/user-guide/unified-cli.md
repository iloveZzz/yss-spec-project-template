# YSS CLI 使用说明

本组教程面向产品、设计、研发、测试和维护人员，以 Rust CLI `3.8.0` 与内嵌 Template `5.8.0` 为操作基线。先运行 `yss version` 和 `yss --help`，查看实际版本、源码来源、target 和 Bundle 摘要。模板源码后续提交与已安装程序分别核对。

CLI 负责方法安装、项目同步、源码骨架、个人 Spec 工作台和程序升级。业务需求、设计与实现由 Agent 按当前目标开展。第一次使用由 Agent 从用户选定来源的正式 Release 下载并校验匹配平台的归档，再安装到独立工具目录。

| 当前任务 | 阅读入口 |
| --- | --- |
| 安装程序、接入项目、升级版本 | [安装与升级](cli/install-and-verify.md) |
| 查命令、参数、JSON 输出与工作台查询 | [命令参考](cli/command-reference.md) |
| 建立 Home、编写与续办 Spec | [Spec / Home 教程](cli/tutorial-spec.md) |
| 生成 Java 工程、接入后端技能 | [Backend 教程](cli/tutorial-backend.md) |
| 生成 Vue 工程、接入前端技能与设计还原 | [Frontend 教程](cli/tutorial-frontend.md) |
| 续办目标、查看个人进度 | [日常工作](cli/daily-and-targets.md) |
| 更新模板、处理冲突、备份与恢复 | [维护与恢复](cli/tutorial-maintenance.md) |
| 按错误码定位下一步 | [错误处理](cli/error-index.md) |
| 团队培训、演示与练习 | [培训材料](培训材料.md) |

Profile 选择 spec、backend 或 frontend，安装范围选择 project 或 skills。新安装默认 project，sync 沿用原范围。写入命令默认直接执行，需要预览时加 dry-run。初始化、Home 关系、源码生成、技能加载和真实业务验证分别按实际结果记录。
