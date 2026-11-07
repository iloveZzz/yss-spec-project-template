# 使用与生成边界

先确认实际 CLI 帮助含 frontend；Node/pnpm 要求从 catalog.frontend 与生成的 package.json 读取，不维护另一份版本表。

```sh
yss version --json
yss scaffold frontend --help
yss scaffold catalog --json
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output --dry-run
yss scaffold frontend --project-name my-frontend --output-dir /absolute/output
```

父目录在预览和生成时都必须已存在；目标不能存在，即使为空。名称使用小写 kebab-case，拒绝设备名和越界路径。dry-run 完成资源和路径检查，不创建锁、缓存、控制目录或保存计划。生成不需要 Node/pnpm；非 Git 父目录不需 Git，Git 工作树仍执行只读保护检查。

工程根 `.yss/scaffold.json` 记录 frontend 输入、来源、Bundle 摘要与实际文件模式/摘要，自身不参与哈希。这不是 sync 管理源码的授权。安装技能是独立动作：

```sh
yss attach --root /absolute/output/my-frontend --profile frontend --installation skills
```

技能安装不复制 starter。已有 README/DESIGN、应用源码、package/lock 和 .gitignore 保留；旧收据不会自动迁移 ownership，本地修改/删除由 doctor 显示。遇冲突按诊断处理，不覆盖来强行通过。

需要运行时，先看父目录 package.json / pnpm-workspace.yaml 的实际范围，防止安装落入其他 workspace。使用声明的环境执行 `pnpm install --frozen-lockfile`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm dev`；验证页面与键盘焦点。只执行本次所需检查，不要求新增脚本/套件。页面用 `views/<Page>/{index.vue,components,hooks,schemas}`，通用 hooks 在 `src/hooks`。

JSON 输出使用现有 yss.output 信封。失败的 phase/stagingPath/targetPath/cleanup 表示实际阶段和残留；renameApplied=true、phase=published 表示目标已发布但后续检查失败。保留目标并说明状态，不把非事务暂存目录交给 recover，也不声称已安全回滚。

## 组件配置与后续接入

`components.json` 从实际 Frontend Bundle 静态复制，描述 new-york-v4、Tailwind 4、`src/styles/main.css` 和现有 `@/` 别名，composables 使用 `@/hooks`。baseColor 不改写 YSS tokens，也不要求安装 CLI、图标包或完整组件集合。

需要新增组件时进入应用技能，先读取项目实际配置/源码/锁、选择兼容的官方固定来源，补齐必要依赖和导出，适配已有主题与尺寸并验证类型、构建及关键交互。没有该配置的旧项目可按实际目录复制固定源码；不要为了补一个组件重新生成工程或应用 preset。仅生成源码的请求仍不执行这些开发动作。
