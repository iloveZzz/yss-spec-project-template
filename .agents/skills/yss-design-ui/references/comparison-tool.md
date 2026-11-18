# 候选比较资源

`assets/comparison/` 是同任务、同数据候选的评审外壳，按需要组装到新的空目录，不提供生成、封存或校验 CLI。公平比较方法见 [方案比较](concept-comparison.md)。候选数量按实质取舍确定，已有方向不强制多方案。

按 [Vue 准备](shadcn-vue-prototype.md) 使用固定 package/lock、Vite 配置、组件和全局 Token。比较工具也使用 Vue + shadcn-vue 的 Select/Label/Button，不单独采用原生控件路线。

1. 在同一 Vite 原型项目中把 `Comparison.vue`、`main.ts`、`comparison.css` 放到 `src/comparison/`，把 `index.html` 复制为根 `comparison.html`；main.ts 消费准备流程创建的 `src/style.css`。复制 Button/Select/Label 的固定组件及实际依赖，保留许可。
2. 创建 `public/comparison-data.js`，设置 `window.prototypeComparison`，包含 title、variants（唯一 id、label、包内相对 entry）、cases（唯一 id、label、scenario、dataDigest）。例如 entry 为 `candidates/a.html`，不能是外部 URL、越出比较页所在目录的路径或自带场景 hash。数据脚本先于 Vue 模块加载。
3. 各候选 HTML 由同一 Vite 工具链提供入口，各自接入相同初始数据及规范化 SHA-256；按 [产品原型](product-prototype.md) 加载合同和运行器。开发时通过 `pnpm exec vite --host 127.0.0.1` 打开 `/comparison.html`。构建交付时把 comparison.html 和实际候选 HTML 都列入当前 Vite 多页构建输入，再通过 HTTP 预览逐个打开；单页默认构建不会自动包含全部候选。

保护非空目标；工具只运行包内可审阅页面，不是执行不可信代码的沙箱，也不承诺 file:// 双击运行。缺失/空的配置显示错误，不生成假成功。

外壳逐个原尺寸展示候选，切换/重置重建 iframe；`#variant=a&case=normal` 为入口。外壳校验响应 frame、请求标识、场景与数据摘要；错误或超时显示失败，迟到响应不算成功。加载等待上限为 8000 ms；超时/错误终止当次请求，切换后仅当前 frame/requestId/scenarioId/dataDigest 全匹配的 ready 有效。

初始化确认只证明候选报告了预期输入，不证明业务行为。实际操作字段、列表和结果，尤其失败保留、取消恢复和再次提交。独立打开候选检查设备尺寸，不把工具外框当产品视觉。比较结果记录观察与取舍，用户决定复用已有记录；工具选择不是批准。
