# Data Quality主题与前端骨架维护验证

已实现 Data Quality 全局主题默认与 `data-quality-v1` 机械骨架。参考工程只读，未提交、推送或发布。机械骨架和模板文档不使用业务behavior-tdd，以受控生成回归及真实工程验证覆盖。仓库模式为template-source，产品context reconciliation和产品阶段批准not-applicable；临时生成合同是测试fixture，不是产品批准。

| 范围 | 结果与证据 |
| --- | --- |
| 源分析 | Vue3.5.20、Ant Design Vue4.2.6、YSS UI components1.6.0；40份源码摘要，见source-analysis.md及data-quality-evidence.yaml |
| 默认设计 | 主色3371ff、正文14px、控件32px、Card内距20px；显式compact28px；高对比主按钮变体为已声明YSS适配 |
| Vue生成器 | bundled manifest摘要、文件清单、旧Git来源兼容、非法参数/摘要不符无写入、已有目录保护场景通过 |
| 真实工程命令 | 从技能受控生成/tmp/yss-dq-scaffold-verified；frozen install、lint:check、type-check、build、build:standalone均exit0；见scaffold-verification/ |
| 浏览器 | Chrome153.0.8010.37，1440x900与390x844；light/dark/default/compact；真实qiankun2.10.16挂载/更新/卸载/再挂载，documentElement主题不变，console warning/error为0；见browser-result.json及截图 |
| HTML原型回归 | native与真实AntD预构建路线，file://离线，1440/390，查询/详情/保存失败重试/权限/空/加载/冲突/重置等场景通过；见html-browser-result.json |
| 设计/技能一致性 | DESIGN.md pinned lint无警告、投影drift、root/source profile、skill lock与生成投影、skill governance通过 |
| 模板fast | 因核心工具变更自动升级release；81项命令通过，唯一顶层失败为require-committed拒绝WORKTREE来源；见template-fast-result.json，未宣称可发布 |
| 配套CLI | 设计/前端/后端三条thin CLI测试通过，最终快照verify-bundle通过；create-yss-spec全套183项通过，最终初始化/同步43项通过，见spec-cli-final-test.log |

分发复核发现3个公开.env模式文件被根Git忽略规则排除。仅为data-quality-v1的3个固定文件添加精确例外；.gitignore继续使用已有编码/解码机制。最终npm pack --dry-run也包含全部32个骨架文件（见pack-distribution.json）。CLI初始化测试已增加canonical与Codex投影的32个资产逐文件SHA256核对，防止只交付SKILL.md而骨架残缺。没有放行真实.env.local或认证文件。

工具链调整：统一Vite6.0.5、Node>=22.12、pnpm10.15；TypeScript5.9.3配parser8.70以满足旧parser及Orval/Formily兼容约束。安装依靠现有企业包缓存；企业registry曾ECONNRESET，不声称无缓存外部环境已经验证。保留Formily传递vue-frag旧peer警告、YSS包体积和第三方use-client构建警告；未掩盖日志。空骨架不覆盖业务表单、真实API、认证和生产部署。JSP缺配置，不在当前可用基线内。

复放：在仓库根调用generate_and_verify_scaffold.mjs，使用批准的schema v4合同与当前manifest摘要；测试目录使用fixture://标记。浏览器宿主源码见qiankun-host.js/browser-fixture-server.mjs，检查脚本见browser-check.mjs；这些证据脚本记录本机临时路径，跨机器须替换路径与端口并提供Chrome/Playwright/qiankun依赖。第三方库license由各依赖包提供；未复制Data Quality的凭证或业务源码。

维护后续：需要正式发布时，先单独取得Git提交与发布授权，固定源revision再重建CLI；WORKTREE快照仅为本次维护验证。
