# 项目与页面目录规范

适用于本技能基线的新工程及新增页面。存量页面局部修复保留已有工作，只有明确迁移时才调整其结构；不因为加载本技能就迁移整个项目。

```text
src/
├── main.ts
├── App.vue
├── api/
│   ├── generated/             # OpenAPI 客户端及 DTO，不能手改
│   └── transport.ts           # 手写网络实现
├── components/ui/             # 跨页面基础组件
├── hooks/                     # 跨页面组合式能力
├── lib/                       # cn 等基础工具
├── services/                  # 普通异步接口、运行时校验与业务映射
├── styles/                    # 全局主题与样式
└── views/
    └── CustomerSearch/        # 也支持 <业务分组>/<页面名>
        ├── index.vue
        ├── components/
        ├── hooks/
        └── schemas/
```

页面和业务分组名称使用 PascalCase，如 `CustomerSearch`、`Customers/Detail`；三个固定子目录始终使用小写。组件文件使用 PascalCase，hook 使用 `useXxx.ts`，schema 使用 `searchSchema.ts`、`formSchema.ts`、`tableColumns.ts` 等表达实际职责的名称。

每个页面必须存在 `components`、`hooks`、`schemas` 三个真实目录；暂时没有职责时用 `.gitkeep` 保留目录，不创建无意义组件或空函数。业务分组只组织页面，共享实现上移到 `src/components`、`src/hooks` 等共享层。路由、store、布局、资源和公共类型目录按实际需要添加，不预建空平台。

## 职责和依赖方向

- `main.ts` 装配应用；`App.vue` 组合页面或已有 RouterView。页面入口统一为 `views/**/index.vue`，不把页面散落在 `src` 根或业务分组中。
- `index.vue` 组合页面区块、页面 hook 和必要的上下文；私有组件负责呈现、交互、焦点和组件局部状态。不为行数指标拆分，不把全部职责转移到一个万能 hook。
- 页面 `hooks` 管理有独立职责的状态、业务动作与副作用，保留真实请求取消及清理。新工程统一命名 `hooks`，不另建同义 `composables` 树。
- 页面 `schemas` 用普通 TypeScript 存放查询/表单字段、列、选项和前端校验规则，必须由实际代码消费；不放请求、可变状态或临时草稿。没有业务来源的校验规则不能自行添加。
- 页面 schema 不等于 Schema 渲染框架，不默认引入 Formily、Zod 或其他依赖。OpenAPI 的 `api/generated/schemas` 是传输 DTO，保持独立；业务 service 的运行时响应校验也不搬到页面 UI schema。
- 类型就近定义；页面可以引用共享层，共享组件、hook、service 不反向引用页面私有目录。多页面复用时提取到真正的共享责任层，不从另一页的内部路径借用实现。

## 校验和完成条件

本版本不分发结构检查脚本。按当前改动核对实际目录、入口、调用与类型；目标工程已有相关检查时直接复用，不新增统一门禁或假定 `build` 已包含结构校验。

目录核对涵盖基线目录、页面入口与命名、三个必需子目录及散落的页面文件。空占位目录合法，业务分组不要求三目录；页面私有组件的 `index.vue` 不作为新页面。

结构检查证明文件组织符合规范，不证明依赖方向、schema 被消费、组件职责合理或业务正确。这些通过实际调用、类型/行为测试和 review 验证。开发使用真实页面路径更新设计映射、测试和入口，不保留旧路径的兼容转发。
