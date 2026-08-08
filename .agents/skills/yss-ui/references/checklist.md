# yss-ui Checklist

## 使用方式

- 开发阶段：按页面类型逐项自检。
- 联调阶段：重点执行“数据链路与交互”清单。
- 提交前：至少完成“通用基线”+ 当前页面类型清单。

---

## 通用基线（所有页面必查）

- [ ] 使用 Vue 3 Composition API + `<script setup lang="ts">`
- [ ] 优先使用 `@yss-ui/components`，缺失能力再回退 `ant-design-vue`
- [ ] 未引入不存在的 Y 前缀组件
- [ ] 无 `@formily/antd*` 违规导入
- [ ] 页面容器具备统一布局（padding/margin/min-height）
- [ ] 状态展示与危险操作颜色保持一致
- [ ] 关键交互具备成功/失败反馈（`message`）
- [ ] 关键实现至少对照一个 docs demo（`../assets/demos/*`）

---

## 列表页清单（YTable）

- [ ] 列定义使用 `YTableColumn`，主字段走 `field/type`
- [ ] 启用 `:row-config="{ keyField: 'id' }"` 或业务主键
- [ ] 需要选择行时已配置 `type: 'checkbox'`
- [ ] 自定义单元格走字段插槽（如 `#status`、`#action`）
- [ ] DOM 模板（JSP/HTML）下插槽命名使用 kebab-case（如 `#toolbar-left`）
- [ ] 避免以 `bodyCell` 分支作为主渲染模式
- [ ] 分页状态包含 `current/pageSize/total`
- [ ] `@change` 中同步更新分页并触发刷新
- [ ] 加载态与空态行为正确

---

## 抽屉详情页清单

- [ ] 抽屉开关状态单一来源（`ref<boolean>`）
- [ ] 打开抽屉前正确设置当前记录
- [ ] 抽屉关闭时清理临时输入/评论等状态
- [ ] Tab 切换不引入脏数据
- [ ] 抽屉内表格优先使用 YTable（列同样遵循 `field/type`）
- [ ] 底部操作按钮具备确认机制（如 `Modal.confirm`）

---

## 步骤页清单（Create/Step）

- [ ] 步骤状态由单一 `currentStep` 管理
- [ ] 第一步表单校验通过后再进入下一步
- [ ] 步骤二列表推荐使用 YTable 承载节点信息
- [ ] 节点编辑弹层（Drawer/Modal）保存后回填源数据
- [ ] 上一步/下一步/取消/完成按钮状态与文案正确
- [ ] 完成动作后有明确反馈并返回目标页面

---

## 数据链路与联调清单（API + Mock）

- [ ] API 请求通过项目统一实例（`mutator.ts`）发起
- [ ] URL 未重复拼接 `/api` 前缀
- [ ] 列表请求参数包含 `page/pageSize` 与筛选参数
- [ ] Mock 路由与前端请求路径一致
- [ ] Mock 返回结构为 `{ code, message, data: { list, total, page, pageSize } }`
- [ ] 查询行为会重置页码到第一页
- [ ] 分页行为会沿用筛选条件重新请求
- [ ] 异常时正确提示并兜底空数据

---

## 路由与菜单清单

- [ ] 页面路由挂载在正确模块 `children` 下
- [ ] `meta.title` 与页面语义一致
- [ ] 详情/创建页使用 `menuType: MENU_TYPE.INNER_MENU`
- [ ] 路由名称（name）语义清晰且唯一

---

## 交付前核查清单

- [ ] 关键文件已补充必要类型定义
- [ ] 无调试输出（如 `console.info`）遗留
- [ ] 运行格式化命令并确认无格式问题
- [ ] 目标文件 IDE 诊断无新增错误
- [ ] 若 lint/type-check 失败，已明确标注环境原因
- [ ] 如需 AI 辅助生成代码，优先加载 `llms-full.txt` 上下文
