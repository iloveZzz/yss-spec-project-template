# 装配与协议

## 在原型中使用

已有 Vue 原型沿用当前目录、锁文件、组件导出和样式入口，只引入本场景所需的适配。新建时选择空目录。以下路径中的 `design` 指项目根的 `.agents/skills/yss-design-ui`，`starter` 指本技能的 `assets/starter`。

| 来源 | 新原型中的位置 |
| --- | --- |
| `design/assets/prototype/` 下的 `package.json`、`pnpm-lock.yaml`、`vite.config.ts`、`SHADCN-LICENSE.txt` | 原型根目录 |
| `starter/index.html` | `index.html` |
| `starter/` 下的两个 `.vue`、三个 `.ts` 和 `style.css` | `src/` |
| `design/assets/shadcn-vue-authoring/ui/button/`、`ui/card/` | `src/components/ui/button/`、`src/components/ui/card/` |
| `design/assets/shadcn-vue-authoring/utils.ts` | `src/lib/utils.ts` |
| 项目主题变量（模板为 `.template-spec/design/tokens/variables.css`）、`design/assets/prototype-theme.css`、`design/assets/shadcn-vue-authoring/theme.css` | `src/tokens.css`、`src/prototype-theme.css`、`src/theme.css` |

按设计技能的组件清单核对来源和摘要。使用原型 package 声明的 Node 与 pnpm，在新原型目录执行以下命令；首次添加 A2UI 会更新该原型的锁文件。此后按锁文件重装。

```sh
pnpm add --save-exact @a2ui/web_core@0.16.1
pnpm exec vite build
pnpm exec vite --host 127.0.0.1
```

打开 Vite 输出的地址，操作“查看入场指引”和“返回报名摘要”。观察绑定的入场时间、记录身份、焦点，以及浏览器刷新后的初始画面。改成实际业务时，同步替换 `index.html` 标题、宿主页面标题、`scenes.ts` 和事件处理。需要增量改稿时保留现有原型约定的场景入口和可复现输入。

## 一次界面更新如何发生

1. `scenes.ts` 用 `version: "1.0"` 和官方 Basic Catalog ID 创建一个 surface。组件通过稳定 ID 引用，`root` 是内容入口。文案可直接给出，数据用 `{"@path":"/time"}` 绑定。
2. `updateComponents` 更新已有 ID 或添加节点。切换布局时改父节点的 `children`。从可见树移除一项只需断开父引用。单独修改文案或业务字段使用 `updateDataModel`；更新单个字段时明确给出 `path`。
3. `surface.ts` 调用官方 v1.0 消息 Schema、Basic Catalog 和 Core。它只接收指定 surface 的三种消息。它在临时处理器中重放从创建开始的短消息序列，整段成功后才替换 Vue 中的可见树。失败保留上次画面与动作，错误通过宿主呈现。这种处理适合本地短场景；长时流式会话需另外处理增量、轮次和生命周期。
4. `SurfaceNode.vue` 用 Card、Button 及语义布局渲染 Core 解析出的节点。基础子集包括 Card 单子节点、Column 静态子列表、Text 纯文本或路径、带文本标签的 Button 具名事件。需要表格、日期选择、弹层或其他 shadcn-vue 组件时，从[全量组件目录](shadcn-components.md)选组，并将生成的扩展传给宿主。可选的 [SCRM 组件目录](scrm-components.md) 演示如何按节点指定 catalog、将单子节点渲染到 Vue 插槽，并把用户输入写回当前数据模型。扩展其他组件时，核对协议字段和项目组件 API。起步素材仅消费原型作者控制的本地消息。
5. 点击按钮执行 Core 给出的动作。Core 解出 `surfaceId`、`sourceComponentId` 和 `context`，通过官方动作 Schema 后交给 `App.vue`。宿主核对当前业务对象和操作条件，再切换场景。需要输入、禁用或错误恢复时，为实际场景补上交互，使用目标项目的组件和主题。

## 设计与验收

以规格中已有角色、对象和任务命名场景。固定页面骨架保持方向感，变化区域保留稳定组件 ID。先做一条核心操作，再补影响该任务的拒绝或恢复分支。紧凑屏检查内容顺序、按钮可见性和弹层宽度；焦点所在控件被移除时，把焦点移到新画面的标题或合理后继控件。用实际页面比较视觉层级、状态和可访问名称。

示范场景可按以下路径复验：

| 操作 | 可观察结果 |
| --- | --- |
| 打开报名摘要 | 展示一个名额和查看指引入口 |
| 用键盘打开指引 | 摘要退出可见树，出现地点与 13:45 入场时间，按钮切换为返回 |
| 返回摘要 | 原报名记录及入口恢复，可再次打开 |
| 向候选场景加入未映射组件，再提交有效场景 | 显示错误，旧画面仍可操作，下一次有效更新清除错误 |

在原型交互说明注明模拟数据、已验证的动作和未覆盖的组件。真实模型、传输协议或后台服务仅在任务要求并实际接入时计入验证。版本字段与消息方向见 [A2UI 1.0 JSON Schemas](https://a2ui.org/specification/v1.0/schemas/)，组件字段见 [Basic Catalog](https://a2ui.org/specification/v1.0-basic-catalog-implementation-guide/)。
