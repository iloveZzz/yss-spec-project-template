# OpenAPI 接入与客户端生成

需要从后端契约接入接口、引入 Orval、更新生成客户端或审查契约变化时读取。OpenAPI 是本技能正式支持的输入，不必先建设接口平台；没有真实契约时只能明确开展模拟演练。

## 输入与可复现快照

- 接受后端提供的 OpenAPI 文件、仓库内已确认的快照或已授权的契约地址。记录来源、环境、获取时间及版本/提交标识；不能从原型字段或页面 mock 反推并宣称生产接口契约。
- 把生成输入固定为本地 `openapi/application.json`（或项目已有路径）。远端更新先写临时文件，检查 HTTP 成功、内容确为 OpenAPI、引用可解析，再替换上次有效快照；获取或校验失败必须非零退出并停止本次生成，不能悄悄沿用旧文件报告更新成功。
- 受保护的契约通过项目已有凭证渠道获取；密钥不进入仓库、客户端环境或日志。跨域重定向和外部 `$ref` 不得扩大凭证发送范围，仅放行契约实际需要的来源。可复现快照还应包含所需引用，避免生成时隐式读取变动中的远端内容。
- 保留真实契约的路径、字段名、可空性、枚举、分页与错误结构。契约缺失或矛盾先向来源核实；必要的输入转换应独立记录，不能借生成器自行改业务协议。

## 最小接入

资产沿用来源技能的 Orval 8 ESM 示例，来源记录使用精确版本 `orval@8.46.0`、`axios@1.21.0` 与 Node 22.18 及以上。本轮仅导入示例，未重新运行生成或应用验证；接入时核对目标项目 Node、TypeScript、依赖锁与所选版本支持，不提供旧版兼容分支。见 [Orval v8](https://orval.dev/en/docs/versions/v8)。

1. 复用现有 Axios 客户端与目录。没有时，将 [Orval 配置](../assets/openapi/orval.config.ts) 放到根 `orval.config.ts`，将 [transport 示例](../assets/openapi/transport.ts) 放到 `src/api/transport.ts`，按实际快照和输出目录调整路径。两份文件是可复制示例，不是完整应用 starter。
2. 目标 `package.json` 使用 `"type": "module"`。需要安装时执行已核验版本的 `pnpm add axios@1.21.0` 与 `pnpm add -D orval@8.46.0`，更新并检查本项目锁文件；已有相容依赖时不重复安装。
3. 添加确实可用的脚本 `"generate:api": "orval --config orval.config.ts"`，运行 `pnpm run generate:api`。不要假定复制文件后脚本自动存在；也不要复制参考工程的宽泛格式化 hooks。
4. 检查生成客户端与 schemas，再运行目标项目真实的类型检查和相关测试。生成成功只说明契约可被当前配置处理，不说明真实服务符合契约。

```text
openapi/application.json           # 有来源的契约快照
orval.config.ts                    # 手写生成配置
src/api/generated/application.ts   # 生成的普通异步接口函数
src/api/generated/schemas/         # 生成 DTO 类型
src/api/transport.ts               # 手写 HTTP 实现，不放入 generated/
src/services/                     # 按需进行校验、映射与业务组合
```

本配置显式选择 `axios-functions`、`httpClient: 'axios'`、`split` 与 `Schema` 类型后缀，`indexFiles: false` 让 schema 按文件导入，避免聚合目录导入在 Node ESM 下缺扩展名。只生成普通 Promise 接口函数，不生成 React/Vue Query hooks；`useRequest` 是需要异步状态时的单一所有者。配置选项见 [Orval output](https://orval.dev/docs/reference/configuration/output/)。

## transport、业务 service 与页面的边界

- mutator 的第二形参 `options?: AxiosRequestConfig` 会让生成接口暴露请求选项。示例用 `axios.mergeConfig(config, { ...config, ...options })` 保留生成请求的 URL、method、data，同时合并 headers、查询和 `signal`。不能直接 `mergeConfig(config, options)`：Axios 仅从第二参数取 URL/method/data，会把原请求路径和请求体丢掉。只去除 Axios 响应外壳，保留真实业务响应体。见 [自定义 Axios](https://orval.dev/docs/guides/custom-axios/)。
- 已有 transport 负责 baseURL、认证、租户、超时与错误转换时，直接把它接为 mutator，不再套一层功能相同的 request wrapper。示例不附带登录协议、token 存储、统一业务包体或自动重试。
- 保留 AxiosError、HTTP 状态、响应体与取消 rejection；不能 catch 后返回空值、把 409 改为成功、重复解业务 `data`。下载若需要响应头/状态，单独明确返回类型，不能返回 `{ data, headers }` 却继续标成原 DTO。
- 生成 DTO 是传输形状，不是 Vue 状态。业务 service 在消费边界完成所需的运行时校验与 DTO → 业务模型映射，页面再维护自己的筛选和草稿；不直接修改请求缓存内的 DTO 充当编辑草稿。
- TypeScript 生成类型不会校验实际 JSON。保留项目已有 schema 校验或对关键字段、枚举和可空值进行检查；若引入生成运行时校验，需要配置、调用与测试都真实接通，不能仅因为生成了类型就声称完成。
- 生成函数签名以当次产物为准。具备 `listCustomers(params, options)` 的契约可由 service 调用 `listCustomers(params, { signal })`；这些示例名称不是目标后端的承诺。
- `AbortController.signal` 从请求所有者，经 service、生成函数末参、mutator 传到 Axios。hook 的 `cancel()` 只影响结果处理，不证明网络中止，更不证明写入回滚；写入结果未知不得盲目重试。Axios 的实际取消方式见 [AbortController](https://axios-http.com/docs/cancellation)。
- 接入 `useRequest` 时仍是 `useRequest(service, options)`；查询只保留一个触发入口，写操作 `manual: true`，`runAsync` 调用方处理 rejection。不要在生成客户端与 hook 中双重管理缓存、轮询或重试。其余状态规则见 [工程约定](engineering.md)。

## 契约变化与验证

- 更新顺序是：取得有效快照 → 审阅契约变化 → 同版本重新生成 → 检查生成差异 → 修复受影响 service/页面/测试。关注必填、可空性、枚举、返回包体和删除的 operation，而非只检查编译是否成功。
- `generated/` 不手改，transport、service、mock 与业务组件放在外部。示例 `clean: false`；不把 `clean` 指到整个 `src/api`，也不复制会扫除业务文件的清理脚本。
- 删除 operation/schema 后，在全新临时输出中生成并比较清单，仅移除确认已废弃的生成文件，避免残留类型继续被调用；不要用宽泛删除代替差异检查。
- CI 使用本地快照、锁定依赖和冻结安装。若生成产物入库，重新生成后检查已跟踪差异及未跟踪文件；若不入库，则在类型检查/构建前生成，并明确唯一来源。不要混用两种交付方式。
- 对真实用到的边界保留小测试：实际 URL/HTTP method、查询序列化、写入请求体和响应解包、非成功响应仍拒绝、`AbortSignal` 真正进入 transport。模拟服务器不能无条件接收任意路径而只检查响应；生成客户端接入页面后还需验证浏览器构建入口，不以未被页面引用的客户端编译证明可在浏览器运行。涉及认证、下载、上传等功能时再验证对应行为，不扩大成通用检查平台。
- 没有真实契约/服务时，夹具和服务必须标注 synthetic。生成、类型检查与本地模拟测试通过，可以证明工具链和请求边界，不能证明生产接口、认证、租户隔离、CORS 或业务联调成功。
