# 模板治理工具链 Ruby → Node 技术事实研究

## 记录信息

- 日期：2026-08-17（Asia/Shanghai）
- 仓库身份：`repository_mode: template-source`
- 研究问题：在保持模板实例零安装、可离线执行门禁和跨仓回滚语义的前提下，Ruby 模板治理脚本是否可整体迁移到 Node，以及 YAML、XML 和 vendor bundle 应选用什么能力。
- 已确认约束：全量移除活动 Ruby 运行时依赖；最低 Node 22，Node 22 / 24 为验证矩阵；实例侧不运行 `pnpm install`；分发 `scripts/lib/*.mjs` 与自包含 `scripts/vendor/*.mjs`；内部使用 ESM；本轮保留 Python；公开脚本路径、参数、退出码与生成资产保持兼容；跨仓 `create-yss-spec` 验证属于完成标准。
- 证据性质：本文件是第三方技术事实和适配建议，不是 ADR、架构批准、实现授权或发布结论。

## 范围与本地约束

### 可发现事实

1. [ADR-0008](../../adr/0008-template-source-distribution-boundary.md) 规定 `.template-source/` 不进入实例，而 `docs/` 和共享验证资产属于实例分发面；旧受管文件通过 `remove-report` 报告，不静默删除。
2. [`create-yss-spec` 跨仓契约](../../contracts/create-yss-spec-repository-mode-contract.md) 要求空目录初始化、`attach` 和 `sync` 完成后直接执行：

   ```text
   scripts/sync-skills --check
   scripts/update-skill-lock --check
   scripts/verify-template
   ```

   任一门禁失败时必须回滚文件和 metadata。因此，实例运行时依赖临时联网安装会改变既有失败面，不符合已确认的零安装约束。
3. 当前活动面是 20 个 Ruby 程序 / `.rb` 文件，另有 Bash `scripts/verify-template` 中的 3 段内联 Ruby。除 `json`、`digest`、`pathname`、`fileutils`、`tmpdir`、`open3`、`optparse`、`set`、`time` 等标准能力外，迁移的非平凡解析 seam 是：
   - `YAML.safe_load(... aliases: false)`：仓库身份、生命周期注册表、合同和压力场景；
   - `YAML.load_stream`：OpenAPI 单一 YAML document 检查；
   - `YAML.dump`：生命周期注册表负例 fixture；
   - `REXML::Document` + `REXML::XPath.match`：仅在 `scripts/verify-yss-router-scenarios` 中执行 `//server/username` 和 `//server/password` 两类查询。
4. 被检查的 Maven `settings.xml` 使用默认 namespace `http://maven.apache.org/SETTINGS/1.0.0`。迁移不能只用无 namespace 的玩具 XML 证明兼容；必须以当前 fixture 和 namespace 变体回归。

## Node 运行时事实

### 发布线状态

Node.js Release Working Group 的计划在 2026-08-17 显示：

| 发布线 | 当前阶段 | Maintenance 开始 | EOL |
|---|---|---:|---:|
| Node 20 | End-of-Life | 2024-10-22 | 2026-04-30 |
| Node 22 | Maintenance LTS | 2025-10-21 | 2027-04-30 |
| Node 24 | Active LTS | 2026-10-20 | 2028-04-30 |
| Node 26 | Current | 2027-10-20 | 2029-04-30 |

来源：[Node.js Release Working Group](https://github.com/nodejs/Release/blob/main/README.md)、[机器可读 schedule.json](https://github.com/nodejs/Release/blob/main/schedule.json)、[Node.js Releases 页面](https://nodejs.org/en/about/previous-releases)。官方同时注明计划日期可能调整。

**推论：** `Node >=22` 避开已经 EOL 的 Node 20；Node 22 / 24 覆盖 Maintenance LTS 与 Active LTS。Node 26 在 2026-10-28 前仍为 Current，作为观察性验证而非发布阻断门禁与已确认策略一致。

### 测试和参数解析

- `node:test` 自 Node 20.0.0 起为 Stability 2（Stable），失败会把进程退出码设为 `1`，足以替代当前 `minitest` 的基础 runner 角色。来源：[Node 24 `node:test` 文档](https://nodejs.org/download/release/latest-v24.x/docs/api/test.html)。
- `util.parseArgs()` 自 Node 20.0.0 起不再 experimental；Node 22 文档列出 boolean/string、短参数、重复参数、默认值、positionals 与 tokens 等能力，覆盖当前 `OptionParser` 的普通选项面。来源：[Node 22 `util.parseArgs` 文档](https://nodejs.org/download/release/latest-v22.x/docs/api/util.html#utilparseargsconfig)。

**待验证：** Ruby `OptionParser` 的错误文案、`--help` 排版以及退出码不会由 `util.parseArgs()` 自动逐字保持，需为每个公开入口建立 argv golden tests；“API 能力存在”不等于 CLI 兼容已证明。

### Node 没有内建 YAML / XML 解析器

Node 官方把 `module.builtinModules` 定义为“Node.js 提供的所有模块名称”列表，可用于判断模块是否由第三方维护。来源：[Node 24 `module.builtinModules`](https://nodejs.org/download/release/latest-v24.x/docs/api/module.html#modulebuiltinmodules)。本机 Node 24.14.1 的可复核命令为：

```bash
node -e 'const {builtinModules}=require("node:module"); console.log(JSON.stringify({node:process.version,yamlXmlModules:builtinModules.filter(x=>/ya?ml|xml/i.test(x)),DOMParser:typeof DOMParser,XMLSerializer:typeof XMLSerializer}))'
```

结果：

```json
{"node":"v24.14.1","yamlXmlModules":[],"DOMParser":"undefined","XMLSerializer":"undefined"}
```

**事实边界：** 该结果证明当前本机 Node 24 没有名称含 YAML/XML 的内建模块，也没有全局 `DOMParser` / `XMLSerializer`；结合官方完整模块列表，可判定本迁移必须交付第三方 YAML/XML 能力。Node 22 仍需在实施验证矩阵中执行同一探针，不能只从 Node 24 外推完成性。

## YAML 候选

### 首选候选：`yaml`

一手资料事实：

- 当前稳定 npm 页面为 `yaml@2.9.0`，包自述支持 YAML 1.1 / 1.2、通过 yaml-test-suite、零外部依赖，许可证为 ISC；源码和维护入口为 `eemeli/yaml`。[npm](https://www.npmjs.com/package/yaml)、[官方仓库](https://github.com/eemeli/yaml)。
- 未带 `%YAML` directive 时默认 `version: '1.2'`，默认 schema 为 `core`。[官方 Options 文档](https://eemeli.org/yaml/#options)。
- `parseDocument()` 对多 document 输入记录 `MULTIPLE_DOCS`；`parseAllDocuments()` 返回文档数组，适合明确实现当前 `YAML.load_stream` 的单文档断言。每个 `Document` 暴露 `errors` 与 `warnings`，调用方必须显式检查。[官方 Documents 文档](https://eemeli.org/yaml/#documents)。
- `toJS()` 的 `maxAliasCount` 默认值为 `100`，用途是限制 alias 展开；`0` 禁止所有 alias，`-1` 关闭检查。[官方 Options 文档](https://eemeli.org/yaml/#options)。

对本仓的适配推论：

- 对当前 Ruby `aliases: false`，不能只接受包默认值 `100`；应在共享解析 helper 中固定 `maxAliasCount: 0`，并为 anchor/alias、循环 alias、alias expansion 建 RED fixture。
- OpenAPI 单文档检查应使用 `parseAllDocuments()`，断言数组长度为 `1`，检查每个 `doc.errors` 为空后再 `toJS({ maxAliasCount: 0 })`；不能用 `parse()` 后忽略额外 document。
- `yaml` 的 emitter 与 Ruby Psych 的 `YAML.dump` 不承诺逐字节一致。负例测试应比较预期语义或由固定 Node emitter 生成 fixture；所有受 hash 管理的既有派生产物仍需逐字节 oracle 对比。
- 零外部依赖、显式 document API 和 alias 限制使其更适合被打成单一只读 vendor bundle。

### 备选：`js-yaml`

一手资料事实：

- 当前 npm 页面为 `js-yaml@5.2.2`，支持 YAML 1.1 / 1.2、`loadAll()` 多文档输入，MIT 许可证，npm 显示 1 个依赖。[npm](https://www.npmjs.com/package/js-yaml)、[官方仓库](https://github.com/nodeca/js-yaml)。
- v5.2.0 新增 `maxAliases`，默认 `-1`，并新增默认 `10000` 的 `maxTotalMergeKeys`；v4.2.0 增加默认 `100` 的 `maxDepth`。来源：[官方 CHANGELOG](https://github.com/nodeca/js-yaml/blob/master/CHANGELOG.md)。
- 官方 untrusted-input 指南仍要求限制输入大小、捕获异常，并在物化前限制节点遍历量，因为 alias 可产生巨大或循环对象图。来源：[官方 safety.md](https://github.com/nodeca/js-yaml/blob/master/docs/safety.md)。

适配风险：`js-yaml` 已具备多文档和显式 alias 限制能力，不应以“没有安全限制”排除；但当前 `maxAliases` 默认无限，需显式配置，且相比 `yaml` 增加一层传递依赖。若选择它，必须固定 `maxAliases: 0`、输入字节上限、节点上限与完整依赖许可，而不能依赖默认配置。

### YAML 建议（不是批准）

建议选择稳定 `yaml` 2.x 的**精确版本**作为源依赖，实施时以 lockfile 和 registry integrity 固定，不跟随 `latest` / `next`。理由是：零依赖、YAML 1.2 默认、显式 Document API、多文档支持、默认 alias 上限，以及能用 `maxAliasCount: 0` 直接表达当前 `aliases: false`。`js-yaml` 保留为可行备选，不是功能不足项。

## XML 候选

### 首选候选：`fast-xml-parser`

一手资料事实：

- 2026-08-17 的 npm registry fresh 查询返回 `fast-xml-parser@5.11.0`，提供 XML validate、XML → JS、JS → XML，支持 ESM / CommonJS，许可证 MIT，维护入口为 `NaturalIntelligence/fast-xml-parser`。[npm](https://www.npmjs.com/package/fast-xml-parser)、[v5.11.0 release](https://github.com/NaturalIntelligence/fast-xml-parser/releases/tag/v5.11.0)、[官方仓库](https://github.com/NaturalIntelligence/fast-xml-parser)。
- 官方 README 和 demo 明确提供 `preserveOrder`，并提供“移除 tag / attribute namespace prefix”的解析选项；这表示它能保留节点顺序或剥离 prefix，但并不等于提供 namespace-aware XPath engine。[官方 README](https://github.com/NaturalIntelligence/fast-xml-parser)、[官方 demo](https://naturalintelligence.github.io/fast-xml-parser/)。
- 当前源码默认 `preserveOrder: false`、`removeNSPrefix: false`、`parseTagValue: true`、`trimValues: true`、`processEntities: true`、`maxNestedTags: 100`；`processEntities` 可设为关闭或带展开上限的对象。[官方 OptionsBuilder 源码](https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/src/xmlparser/OptionsBuilder.js)。
- 2026-07 的 entity expansion 公告把 `5.10.1` 列为该公告的修复版本，并给出关闭 entity processing 的缓解方式；当前 `5.11.0` 晚于该修复版本。这说明 XML 依赖必须同时核对 registry 最新稳定版和全部适用 Advisory，再精确锁定 patch，不能只锁 major/minor。[维护者公告 / GitHub Advisory](https://github.com/advisories/GHSA-8r6m-32jq-jx6q)。

对本仓的适配推论：

- 当前 REXML 只执行两类固定 XPath，目标是校验所有 `<server>` 的 `<username>` / `<password>` 文本。可以用 `fast-xml-parser` 解析后做受控结构遍历，无需引入通用 XPath engine。
- 为避免 `${env.MAVEN_REPO_USERNAME}` 一类字符串被自动转型或意外裁剪，helper 应显式关闭 scalar 自动转换并固定 whitespace 策略；具体选项名以最终锁定版本的类型定义为准。
- 当前 `settings.xml` 有默认 namespace。若用 `removeNSPrefix: true` 简化路径，必须先验证它不会把不同 namespace 的同名元素错误合并；更稳妥的最低范围是只接受 Maven Settings namespace，并用正例、错误 namespace 和混合 namespace fixture 证明行为。
- 该 seam 不需要重建 XML，`preserveOrder` 不是当前验收必要条件；若未来把 vendor parser 用于通用 XML 转换，应重新评估，不能从这个只读校验 seam 推导通用能力。
- 对本地受管 fixture 仍建议关闭 DTD/entity processing；若最终版本不能在 parser 层完整拒绝 DOCTYPE，应在 parse 前显式拒绝 `<!DOCTYPE` 并保留负例。

### 备选：`@xmldom/xmldom` + `xpath`

一手资料事实：

- `@xmldom/xmldom@0.9.10` 提供 XML `DOMParser` / `XMLSerializer` 和 namespace-aware DOM 字段、`getElementsByTagNameNS` 等能力，零依赖、MIT；官方也明确实现并非完整标准，存在已知 deviations。[npm](https://www.npmjs.com/package/%40xmldom/xmldom)、[官方仓库](https://github.com/xmldom/xmldom)。
- `xpath@0.0.34` 实现 DOM 3 XPath 1.0，官方示例包含 `useNamespaces()` 和默认 namespace 映射；MIT，npm 页面显示 3 年未发布。[npm](https://www.npmjs.com/package/xpath)。
- `@xmldom/xmldom` 0.9.10 修复了多项 2026 年遍历 / 序列化安全问题；虽然当前 seam 只解析不序列化，版本精确锁定仍不能省略。[官方 releases](https://github.com/xmldom/xmldom/releases)。

适配收益与风险：该组合最接近当前 REXML DOM + XPath 编程模型，并能显式映射 Maven 默认 namespace；代价是两个 package、一个三年未发布的 XPath engine、更大的 vendor 和更多许可 / 安全追踪面。当前仅有两个固定 XPath，不足以证明引入完整 XPath engine 的必要性。如果后续扫描发现更多动态 XPath、复杂 predicate 或 namespace 查询，应重新比较，而不是强行用手写遍历扩张范围。

### XML 建议（不是批准）

建议采用精确锁定、已修复 patch 的 `fast-xml-parser` 5.x，只为当前 XML 校验 seam 暴露一个最小 wrapper；关闭 DTD/entity、数值/布尔自动转换，显式处理 namespace，并用结构遍历替代两类 XPath。仅当 RED parity fixture 证明结构遍历无法保持 REXML 语义时，升级为 `@xmldom/xmldom` + `xpath`，并固定 namespace mapping。

## `esbuild` 与自包含 vendor

### 一手资料事实

- esbuild 能 bundle ESM 和 CommonJS；`bundle: true` 可把依赖图合并到输出。[官方仓库](https://github.com/evanw/esbuild)、[官方 API](https://esbuild.github.io/api/)。
- `metafile: true` 生成 JSON，包含每个 output 的 inputs、bytes、imports、exports 等，可用于供应链清单和输入闭包核对。[Metafile 文档](https://esbuild.github.io/api/#metafile)。
- esbuild 默认在 output / metafile 使用相对路径，因为绝对路径会破坏跨机器和操作系统的可复现性。[Abs paths 文档](https://esbuild.github.io/api/#abs-paths)。
- 官方 FAQ 说明 esbuild 虽未到 1.0，仍按 patch 向后兼容、minor 可能 breaking；真实用途应精确锁版本以获得最大安全性。[官方 FAQ](https://esbuild.github.io/faq/#production-readiness)。
- 2026-08-17 的 npm registry fresh 查询返回 `esbuild@0.28.2`，官方 release 记录该版本修复 tree-shaking、错误覆盖输入文件等问题；项目 MIT。[v0.28.2 release](https://github.com/evanw/esbuild/releases/tag/v0.28.2)、[官方 releases](https://github.com/evanw/esbuild/releases)、[LICENSE / 仓库](https://github.com/evanw/esbuild)。

### 可复现构建推论

esbuild 提供了形成可复现构建的必要能力，但“使用 esbuild”本身不是可复现证明。建议构建合同至少固定：

1. 精确的 Node、pnpm、esbuild、`yaml`、`fast-xml-parser` 版本和 lockfile integrity；
2. `platform: 'node'`、`format: 'esm'`、`target: 'node22'`、entry point、`bundle`、`minify`、`legalComments`、charset、banner/footer 等完整 options；
3. 相同工作目录布局，保持 relative paths，禁止 `absPaths` 进入 code/metafile；
4. 源文件、lockfile、license、metafile 和最终 `scripts/vendor/*.mjs` 的 SHA-256；
5. 连续两次 clean build 字节相同，并在 Node 22 / 24 和至少 macOS / Linux 构建者上比较输出 hash；
6. `scripts/vendor/THIRD_PARTY_NOTICES.md` 保留 package、版本、许可证、源码 URL 和对应 bundle hash；bundle 内发现的新 transitive input 必须 fail closed。

建议 esbuild 仅存在于 `.template-source/tooling/node/` 的维护构建面，不进入实例运行依赖。实例只消费已审查并受 hash 管理的 `.mjs` 输出。是否采用 minify、`legalComments` 的具体值以及许可证全文保留方式仍需在实施合同中裁决；本研究不构成法律审查。

## 建议组合与替代条件

| 关注点 | 建议 | 选择依据 | 改选条件 |
|---|---|---|---|
| Node | `>=22`；Node 22 / 24 阻断，Node 26 观察 | 22 / 24 均为 LTS，20 已 EOL | 官方 schedule 或目标 CLI engines 改变 |
| 测试 | `node:test` | Node 22 / 24 内建且 stable | 发现现有 minitest 能力无法用小型 helper 等价实现 |
| argv | `util.parseArgs` + 兼容 wrapper | 内建且非 experimental | golden tests 证明公开 CLI 语义无法保持 |
| YAML | fresh 核验后精确锁定 `yaml` 2.x 稳定版；当前候选 `2.9.0` | 零依赖、Document API、YAML 1.2、多文档、alias 限制 | Psych parity 无法满足或 vendor bundle 失败 |
| XML | fresh 核验后精确锁定已修复的 `fast-xml-parser` 5.x；当前候选 `5.11.0` | 当前只有两类固定 XPath，可缩成结构遍历 | 出现动态/复杂 XPath，或 namespace parity 失败 |
| XML 备选 | `@xmldom/xmldom` + `xpath` | 更接近 DOM + XPath 1.0 | 仅在最小 parser 方案被 parity 证据否决时启用 |
| vendor | fresh 核验后精确锁定 esbuild；当前候选 `0.28.2`，提交 ESM bundle + metafile/hash/notices | bundle 与依赖闭包可审计，实例零安装 | 跨平台输出不稳定或 package 无法安全 bundle |

## 实施前必须完成的验证

1. Ruby oracle 与 Node candidate 双跑：正常输入、格式错误、未知参数、缺参、alias、multi-document、循环结构、非 UTF-8、空文件、超大输入、XML 默认 namespace、错误 namespace、DOCTYPE/entity、缺失 username/password。
2. 对公开入口比较 stdout、stderr、退出码、文件权限和生成文件字节；受 hash 管理资产要求逐字节一致。
3. 用 `node:test` 覆盖 Node 22 / 24；本研究只在本机 Node 24.14.1 执行了 builtin-module 探针，没有运行 Node 22。
4. 实际生成 vendor bundle，核对 metafile 没有意外 transitive input，连续和跨平台构建 hash 一致；本研究没有安装依赖或生成 bundle。
5. 在外部 `create-yss-spec` 固定模板 commit 后执行 init、attach dry-run/apply、sync、post-sync rollback、`npm test`、`npm pack --dry-run`，证明快照包含 Node scripts/vendor 且不需要联网安装。
6. 对旧 `.rb` 文件验证 `project-instance` 仅告警 / `remove-report`，不静默删除；`template-source` 新基线拒绝活动 Ruby shebang、Ruby 调用和受管 Ruby 源码。
7. 重新查询实施日的 npm stable 版本和安全公告。本文记录的是 2026-08-17 快照，不能替代实现时的依赖 freshness 审计。

## 局限与未决项

- 未安装任何 npm 依赖，未验证 `yaml` / XML parser 的真实 parity、bundleability、bundle 体积或跨平台 hash。
- 未核对所有 Ruby 诊断文案和隐式类型转换；本文件只定位了标准库与 YAML/XML 高风险 seam。
- 未决定 vendor 是单 bundle 还是 YAML/XML 分 bundle、是否 minify、license 文本如何自动聚合、Node 版本探针如何进入公开入口。
- 未修改 ADR、合同、技能、脚本、package、lockfile、证据索引或 Git；未形成“实现完成”“可发布”结论。
