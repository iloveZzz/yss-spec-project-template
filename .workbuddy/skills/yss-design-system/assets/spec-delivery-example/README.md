# 附件提交校验贯通示例

一个教学功能的完整写法：[业务 Spec](spec.md) → [场景与交互说明](interaction.md) → [同一原型页面](AttachmentSubmission.vue)。全部规则和数据为教学用途，文件中新增的读取失败规则不关闭旧样例的未决项。

这里保存作者资源，需要在新的空目录组装；不是可以双击运行的 HTML，也不是生产脚手架。只在新目录安装依赖和启动服务，保护已安装技能及用户业务文件。

## 资源与来源

| 来源（相对设计技能目录） | 新目录目标 | 用途 |
|---|---|---|
| `assets/prototype/{package.json,pnpm-lock.yaml,vite.config.ts,SHADCN-LICENSE.txt}` | 根目录同名文件 | 既有固定依赖、构建配置与许可 |
| `assets/spec-delivery-example/` | `src/spec-delivery-example/` | 本例文档、业务校验、SFC、入口与七场景 |
| `assets/vue-business-patterns/{mount.ts,workspace.ts,Workspace.vue,workspace-model.js,workspace-page.ts,patterns.css,refinement.css,workspace.css,business-controls.css}` | `src/vue-business-patterns/` | 当前单页壳、场景选择/重置、草稿生命周期及样式 |
| `assets/shadcn-vue-authoring/ui/` 中下列 15 组 | `src/components/ui/` | 固定组件及组内文件闭包 |
| `assets/prototype-theme.css`、`assets/shadcn-vue-authoring/theme.css` | `src/prototype-theme.css`、`src/shadcn-theme.css` | 布局及语义映射 |
| 项目根 `.template-spec/design/tokens/variables.css` | `src/tokens.css` | 当前共享全局 Token，覆盖 Teleport |
| `assets/scenario-runtime.js` | `public/scenario-runtime.js` | 初始化、错误和 ticket 保护 |
| 下文内联内容 | `src/lib/utils.ts`、`src/style.css`、`src/main.ts`、`index.html`、`public/scenarios.js` | 工具函数及装配入口；不新增构建器 |

组件组为 button、select、checkbox、label、collapsible、badge、dropdown-menu、tooltip、sheet、alert-dialog、input、textarea、field、table、separator；既有壳也使用其中部分组件。复制组内全部文件，保留相对导入。

组件 revision 固定为 `67c9a3926dc0a854507b325c6337ff2210d16379`；复制前按 `assets/shadcn-vue-authoring/registry-manifest.json` 核对快照摘要，保留上表许可证。依赖与 Node/pnpm 约束按 `assets/prototype/` 的实际文件和 [Vue 准备方法](../../references/shadcn-vue-prototype.md) 读取，不使用 @latest 或升级 vendor。

## 在项目根组装

从具有本设计技能及共享 Token 的 Spec 项目根运行。Frontend 按需补装设计技能后也使用同样步骤；若资源缺失先报告实际路径，不能用全仓绝对路径补洞。

```sh
spec_project_root="$PWD"
spec_skill_root="$spec_project_root/.agents/skills/yss-design-system"
spec_example_root="$(mktemp -d "${TMPDIR:-/tmp}/yss-spec-example.XXXXXX")"
mkdir -p "$spec_example_root/src/components/ui" "$spec_example_root/src/lib" "$spec_example_root/src/vue-business-patterns" "$spec_example_root/public"
cp "$spec_skill_root/assets/prototype/"{package.json,pnpm-lock.yaml,vite.config.ts,SHADCN-LICENSE.txt} "$spec_example_root/"
cp -R "$spec_skill_root/assets/spec-delivery-example" "$spec_example_root/src/"
for spec_file in mount.ts workspace.ts Workspace.vue workspace-model.js workspace-page.ts patterns.css refinement.css workspace.css business-controls.css; do
  cp "$spec_skill_root/assets/vue-business-patterns/$spec_file" "$spec_example_root/src/vue-business-patterns/"
done
for spec_group in button select checkbox label collapsible badge dropdown-menu tooltip sheet alert-dialog input textarea field table separator; do
  cp -R "$spec_skill_root/assets/shadcn-vue-authoring/ui/$spec_group" "$spec_example_root/src/components/ui/"
done
cp "$spec_skill_root/assets/prototype-theme.css" "$spec_example_root/src/"
cp "$spec_skill_root/assets/shadcn-vue-authoring/theme.css" "$spec_example_root/src/shadcn-theme.css"
cp "$spec_project_root/.template-spec/design/tokens/variables.css" "$spec_example_root/src/tokens.css"
cp "$spec_skill_root/assets/scenario-runtime.js" "$spec_example_root/public/"
```

继续在同一 shell 创建必要入口（以下不是新增 CLI 命令或独立脚本）：

```sh
cat > "$spec_example_root/src/lib/utils.ts" <<'TS'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
TS
cat > "$spec_example_root/src/style.css" <<'CSS'
@import "tailwindcss";
@import "tw-animate-css";
@import "./tokens.css";
@import "./prototype-theme.css";
@import "./shadcn-theme.css";
CSS
cat > "$spec_example_root/src/main.ts" <<'TS'
import './style.css'
import './spec-delivery-example/entry'
TS
cat > "$spec_example_root/index.html" <<'HTML'
<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>附件提交校验</title></head>
<body><div id="app"></div><script src="./scenarios.js"></script><script src="./scenario-runtime.js"></script><script type="module" src="./src/main.ts"></script></body>
</html>
HTML
node --input-type=module - "$spec_example_root" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const root = process.argv[2]
const { scenarios } = JSON.parse(readFileSync(join(root, 'src/spec-delivery-example/scenarios.json'), 'utf8'))
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}
const data_digests = Object.fromEntries(scenarios.map(item => [item.id, createHash('sha256').update(JSON.stringify(canonical(item.initial_data))).digest('hex')]))
writeFileSync(join(root, 'public/scenarios.js'), 'window.prototypeScenarioContract=' + JSON.stringify({ scenarios, data_digests }) + ';\n')
JS
```

## 安装、构建与查看

只在新目录执行，先核对实际 pnpm 为 packageManager 指定的版本（当前 10.32.1）。不符时在隔离工具环境准备，不替换全局配置。

```sh
cd "$spec_example_root"
pnpm --version
pnpm install --frozen-lockfile
pnpm exec vite build
pnpm exec vite --host 127.0.0.1
```

打开终端给出的本机地址。首页默认 primary；七个相对入口为：

- `/#scenario=primary`
- `/#scenario=missing-attachments`
- `/#scenario=readonly`
- `/#scenario=out-of-scope`
- `/#scenario=submit-failure`
- `/#scenario=requirements-failure`
- `/#scenario=dirty-leave`

壳中的场景选择器与重置操作消费同一份合同。具体初始值、步骤、预期和不变项见 [交互说明](interaction.md#可复现场景)。此表只说明入口，实际检查单独记录。

## 检查与边界

小型纯函数检查可在新目录使用既有 esbuild 将 `src/spec-delivery-example/model.ts` 临时输出为 ESM，再用 Node assert 核对可见/可写范围、已提交拒绝、空白标题及缺项列表。它不能代替实际界面操作。

运行后实际核对七场景、失败连续重试、重置次数、未知/重复 hash、1440×900 与 390×844 的主任务及键盘行为，再记录到 interaction.md 的实际检查部分。构建成功不能证明交互通过。网络、浏览器或依赖不可用时保留未验证项。

完成检查后停止本次持有的服务，不结束用户进程。生产 API、物理模型、真实账号/上传/存储、真机、跨浏览器与离线 file:// 不由本教学成功证明。源码依赖只在新目录内解析，不读源仓绝对路径。
