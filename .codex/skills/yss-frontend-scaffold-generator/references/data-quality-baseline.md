# Data Quality v1 骨架基线

采用 Data Quality 工程模式，随 Skill 提供可离线审阅的机械源文件。源工程 commit 为 `532509a59856fc02f3b9bcb28a062663ce887d71`；无 origin，因此不把本机路径伪装成可分发 Git 模板。文件列表及摘要由 `data-quality-v1.manifest.json` 固定，合同锁其字节摘要。

| 保留 | 通用化调整 |
| --- | --- |
| `packages/` pnpm 工作区、Vue3 / TypeScript / Vite | 单一 Vite6.0.5 工具链，Node>=22.12；TypeScript5.9.3与ESLint parser8.70配套，满足Orval/Formily的TS4/5 peer约束，重建pnpm锁 |
| Pinia、Vue Router、Ant Design Vue4.2.6、YSS UI | 空白首页 / 404，移除业务菜单、默认Admin、接口模块、Mock、任务抽屉 |
| Qiankun mount/unmount/update与路由桥 | 版本检查、同源事件地址、app级恢复标记、销毁router监听；不带未取消timer和全局styleManager |
| ConfigProvider及主题DTO | 根DESIGN派生，light32px默认；YSS/Ant/VXE变量只写当前容器，不改documentElement；不读取固定localStorage键 |
| Orval本地OpenAPI与axios seam | 输入只为冻结JSON；无网络同步、schema删改、业务包装覆盖、硬编码token/401跳转 |

Vue / Vue Router / Pinia / AntDV / YSS / Formily / Orval 等核心版本来自源 lock。TypeScript5.9.3和ESLint parser8.70是针对原TS6解析器及Orval/Formily peer冲突的兼容调整；依赖声明与锁文件重新生成并实际验证。运行 install 需要企业registry访问，认证仅通过环境配置；资产包不含 `.npmrc`、node_modules或构建产物。

源 JSP 脚本引用的 Vite 配置缺失，所以当前只提供 Qiankun 与 standalone。资源 public base 与激活 route 分别配置，避免推测主门户部署规则。跨应用 CSS 隔离仍须由宿主合同定义；容器主题清理不能等同于完整样式沙箱。

已有 Git 来源继续兼容，生成和验证遵守同一个批准 schema v4 合同、空目标目录、OpenAPI摘要和显式init_git边界。模板维护可以更新 bundled 源；目标应用生成不会自动升级已有工程。
