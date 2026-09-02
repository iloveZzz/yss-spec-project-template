---
name: yss-create-microapp
description: 在本地生成 Vue3 + TypeScript + qiankun 微前端子应用；用户说“创建微应用”、“新建微前端”、“生成 Vue3 子应用”或要求使用 YSS 模板脚手架时使用。
---

# 创建本地微应用

## 触发条件

- 用户要求创建、新建或生成 Vue3 微应用/微前端子应用。
- 用户要求从 YSS 微应用模板初始化本地项目。
- 需要配置 qiankun 激活路由、Vite 端口、API Base 和本地代理。

## 不适用场景

- 在已有微应用中新建业务页面：使用 `../yss-ui-business-page-generation/SKILL.md`。
- 只创建单个 Vue 组件或只修改配置。
- 用户要求创建 GitLab 远程仓库、推送代码或触发 CI/CD；本 skill 只生成本地骨架。

## 硬约束（禁止/必须）

- 必须收集并验证：应用英文名 `appName`、中文名 `appNameZh`、单段激活路由 `activeRule` 和最终目标父目录。
- `appName` 只能包含小写字母、数字和中划线；`activeRule` 必须是以 `/` 开头的单段路径。
- 必须向用户展示最终绝对路径 `<targetDir>/<appName>`；目标已存在时必须停止，禁止覆盖。
- 必须使用 skill 内置的 `scripts/create.mjs`，禁止复制一份临时生成脚本。
- 真正拉取模板前必须先使用相同参数追加 `--dry-run`，确认参数、缓存边界和最终路径。
- 模板缓存必须位于系统临时目录且名称以 `yss-frontend-template` 开头；脚本不得对任意用户目录执行 `reset --hard` 或 `clean -fd`。
- 可选参数默认为：`port=8081`、`apiBase=/api${activeRule}`、`proxyTarget=http://localhost:3000`。
- 没有用户明确授权时，不得安装依赖、启动服务、创建远程仓库或推送代码。

## 标准代码骨架

```bash
node .agent/skills/yss-create-microapp/scripts/create.mjs \
  --name "<appName>" \
  --name-zh "<appNameZh>" \
  --active-rule "<activeRule>" \
  --port "<port>" \
  --target-dir "<targetDir>" \
  --description "<description>" \
  --api-base "<apiBase>" \
  --proxy-target "<proxyTarget>"
```

- 直接从源 skill 目录执行时，将 `.agent/skills/yss-create-microapp` 替换为当前 skill 的真实绝对路径。
- 用户提供 OpenAPI 地址时追加 `--openapi-url "<url>"`。
- 只有在已确认的内部模板调试场景下才传入 `--template-url`、`--template-branch` 或 `--cache-dir`。

## 交付检查清单

- [ ] 必填参数、默认值与最终绝对路径已确认。
- [ ] 目标项目原先不存在，未覆盖用户文件。
- [ ] 模板缓存路径通过安全校验，已有缓存的 remote 与请求模板一致。
- [ ] 脚手架进程退出码为 0，生成目录与 `package.json` / `micro-config.json` 存在。
- [ ] 中文名、描述、激活路由、端口、API Base 和代理配置正确。
- [ ] 未擅自执行安装、启动、推送或 CI 操作。

## 失败兜底策略

- 参数不完整或不合法时，只询问会改变生成结果的必要信息，不带错误默认值继续。
- 模板缓存不是期望的 Git 仓库或 remote 不一致时，报告冲突并换用新的安全缓存路径，不清理原目录。
- 模板拉取或脚手架失败时，保留完整错误和已生成路径，不在不明状态下反复覆盖重试。
