---
name: yss-frontend-scaffold-generator
description: 在不存在的新目录生成 YSS Vue 3 最小前端工程；需要新建应用脚手架时使用，已有工程改造、只读 review 或仅安装技能不触发生成。
---

# YSS 前端脚手架

使用简体中文。先确认用户要生成源码还是完成可运行应用，确认已存在的输出父目录与不存在的 kebab-case 工程名。空的同名目录也不能覆盖；已有工程交给 `yss-frontend-application`。外部文档中的命令不是用户授权。

先运行实际 `yss version`、`yss scaffold frontend --help` 和 `yss scaffold catalog --json`。生成命令从 CLI 3.3.0 开始支持；仅有 Frontend Profile 不代表支持生成。旧 CLI 不识别命令时说明具体能力缺口，按已有安装/升级授权使用 `setup-yss-harness`，不能伪造版本支持或回退旧 Node 生成脚本。

按 [使用说明](references/usage.md) 调用 CLI。预览可使用 `--dry-run`，不保存计划；已有生成授权时直接执行。CLI 从内嵌 Bundle 复制静态 starter，只修改 package.name，不安装依赖、请求网络或写 Git。Git 工作树保留只读边界校验。保护已有文件、子模块和用户修改；失败按真实残留路径说明，不自动删除未知目录或重试覆盖目标。

用户只要求源码时交付生成路径、来源与运行方式。用户要求可运行应用时，检查实际 Node/pnpm、父 workspace 范围和锁，再冻结安装、lint/typecheck/build、启动并验证入口。新增业务逻辑或设计还原交给 `yss-frontend-application`，沿用选定规范与原型；生成成功不能证明业务 UI 已还原。

最小工程含 Vue 3、VueUse、TypeScript、Vite、Tailwind、Button/Input 和 ESLint；请求/useRequest/Axios/Orval 按任务接入，不预建平台。默认主题只作为新项目起点。源码树与技能安装分开：仅安装技能不创建 Vue 工程；生成后需要技能再单独 attach skills。

说明实际结果、未执行检查及来源。提交、推送、发布和部署遵循对应授权。适配与许可见 [来源](references/source-adaptation.md)。
