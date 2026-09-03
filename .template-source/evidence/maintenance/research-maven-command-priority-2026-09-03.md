# Maven 命令入口优先级研究：`mvnd`、`mvnw` 与 `mvn`

> 日期：2026-09-03
>
> 研究性质：模板维护的只读事实研究与建议，不修改命令策略、skill、脚手架或分发资产，不宣布模板可发布。
>
> 仓库身份：`repository_mode: template-source`（`yss-project.yaml`）。
>
> 存放位置：模板源治理区 `.template-source/evidence/maintenance/`；沿用既有 `research-<topic>-<date>.md` 惯例。

## 研究问题

是否应把 YSS 后端 Maven 工程的默认执行顺序设为：

1. `mvcd`
2. `./mvnw`
3. `mvn`

并分别明确本地开发、CI、fresh verification 与故障降级时的定位。

## 术语澄清

Apache Maven 官方工具与 `apache/maven-mvnd` 官方仓库使用的命令是 **`mvnd`（Maven Daemon）**，不是 `mvcd`。在 Apache Maven 官方站点及 Apache Maven / Maven Daemon 官方仓库中检索不到名为 `mvcd` 的 Maven 构建入口；搜索结果中的 `mvcd` 属于其他领域的软件或缩写。

因此，本报告将用户所写的 `mvcd` 视为很可能是 **`mvnd` 的笔误**。若用户确实指某个企业内 `mvcd` 包装器，则它是另一项待提供来源和合同的工具，不能套用本报告结论。

## 官方来源范围

以下均为 2026-09-03 读取的一手来源：

| 来源 | 地址 | 支持的事实 |
|---|---|---|
| Apache Maven Wrapper 官方文档 | https://maven.apache.org/tools/wrapper/index.html | Wrapper 的目的、指定 Maven 版本、下载与缓存、入口脚本、checksum、仓库镜像 |
| Apache Maven Wrapper 官方入口说明 | https://maven.apache.org/tools/mavenwrapper.html | Wrapper 用项目内配置保证版本并封装构建环境 |
| Apache Maven 安装文档 | https://maven.apache.org/install | 裸 `mvn` 依赖机器级安装与 `PATH`，用 `mvn -v` 核实实际 Maven/JDK |
| Apache Maven Daemon 官方介绍 | https://maven.apache.org/tools/mvnd.html | `mvnd` 通过常驻 JVM、进程池与复用缩短后续构建时间 |
| Apache Maven Daemon 官方仓库 | https://github.com/apache/maven-mvnd | `mvnd` 内嵌 Maven、长生命周期 daemon、默认并行构建、安装及配置行为 |
| Apache Maven Daemon 官方配置 | https://github.com/apache/maven-mvnd/blob/master/dist/src/main/distro/conf/mvnd.properties | daemon、线程、builder、JVM、用户/项目/安装级配置及优先级 |
| Apache Maven 下载页 | https://maven.apache.org/download.cgi | Maven 与 `mvnd` 分别发布；当前稳定/预览线与签名校验定位 |
| Maven Daemon 官方 releases | https://github.com/apache/maven-mvnd/releases | `mvnd` 1.x 内嵌 Maven 3.x，2.x 内嵌 Maven 4.x 的版本线定位 |

没有把博客、性能营销文章、包管理器第三方说明或 Stack Overflow 作为事实来源。官方文档没有给出“CI 一律使用哪一个”的硬排序；下文场景建议是基于官方机制所作的 YSS 工程推断，会明确标注。

## 三种入口不是同一维度的三级替代品

| 入口 | 版本来自哪里 | 核心价值 | 主要风险 |
|---|---|---|---|
| `./mvnw` / `mvnw.cmd` | 项目提交的 `.mvn/wrapper/maven-wrapper.properties` 中 `distributionUrl` | 项目级固定 Maven 分发版本；缺失时自动下载，后续复用缓存；开发机与 CI 可使用同一入口 | 首次执行可能访问网络；若未配置 `distributionSha256Sum` / `wrapperSha256Sum`，下载完整性约束较弱；脚本及 properties 必须完整提交 |
| `mvnd` | 单独安装的 `mvnd` 分发包所内嵌 Maven；1.x 与 2.x 对应不同 Maven 主版本线 | 常驻 JVM、缓存插件 classloader 与 JIT 结果，适合相同工作机上的连续本地构建；客户端启动快 | 工具版本通常不由项目 Wrapper 配置固定；后台进程保留状态；默认多核并行，可能暴露非线程安全插件或改变日志/时序；不同操作系统/架构需不同 native 包 |
| `mvn` | 开发机/镜像/Runner 的全局 Maven 安装与 `PATH` | 最朴素、兼容性基准；也可用于首次生成/修复 Wrapper | 若未由镜像或工具管理器固定版本，同一项目会随机器 Maven/JDK 漂移；需要额外安装；仅记录命令名不能证明版本 |

关键区别：**`mvnw` 是项目级版本与启动入口合同；`mvnd` 是机器级性能执行器；`mvn` 是机器级 Maven 安装入口。** 性能优先级不应覆盖可复现性优先级。

## 官方行为与工程含义

### 1. `mvnw` 最适合成为规范入口

Wrapper 官方文档明确表示，它让项目使用者无需预装指定 Maven；脚本会按项目 properties 中的版本下载并执行 Maven，后续复用该特定版本。官方还提供 `distributionSha256Sum` 与 `wrapperSha256Sum`，用于降低下载被篡改的供应链风险。

因此可推断：只要 Wrapper 文件被版本控制、`distributionUrl` 固定正式版且 checksum 完整，`./mvnw` 比未受控的 `mvn` 或单独安装的 `mvnd` 更适合作为：

- CI 和发布门禁入口；
- fresh verification 的可审计命令；
- Agent / 开发者文档的复制粘贴命令；
- 跨机器复现失败的第一基线。

Wrapper 固定的是 Maven 分发版本，不自动固定 JDK、OS、settings、镜像、环境变量和远程制品。工程仍需另行固定/记录 JDK 与 settings 等环境事实。

### 2. `mvnd` 的优势依赖“连续复用”

Maven Daemon 官方说明：构建发生在长生命周期后台进程中，连续请求复用 JVM、插件 classloader 和 JIT 编译结果；`mvnd` 自身内嵌 Maven，无需另装 Maven。它还默认并行构建模块；官方明确要求不支持并行的源码树传入 `-T1`。

因此可推断：`mvnd` 的最佳位置是 **开发者本地的可选加速器**，尤其适合大型多模块项目连续执行 compile/test/package 的循环。对于一次构建即销毁的临时 CI Runner，daemon 的主要复用收益可能无法兑现；使用长驻 self-hosted Runner 时虽可能获益，却同时引入 daemon 状态、并发与版本治理面，必须单独压测和验证。

`mvnd` 不能仅因“接受与 `mvn` 相同的命令选项”就被视为 Wrapper 的无差别替换：

- `mvnd` 使用其内嵌 Maven，不读取 Wrapper 的 `distributionUrl` 来选择 Maven 分发；
- stable 1.x 与 preview 2.x 所内嵌 Maven 主版本不同，误装版本线会改变构建基线；
- 默认并行度会改变串行 Maven 的执行特征；
- daemon 的长生命周期意味着排障时需考虑 `mvnd --status` / `mvnd --stop` 和项目、用户、安装级 `mvnd.properties`。

### 3. 裸 `mvn` 应是受控例外，不是普通自动降级

Maven 安装文档要求把机器安装的 Maven 放入 `PATH`，并用 `mvn -v` 确认 Maven home、Maven 版本、Java version 与 Java home。这意味着裸 `mvn` 的真实基线来自当前机器，而非项目仓库。

因此可推断：已有有效 Wrapper 时，不应在 Wrapper 下载失败或执行失败后静默改跑 `mvn`。这类自动降级可能让失败“变绿”，但实际换了 Maven 分发版本，fresh verification 证据不再等价。裸 `mvn` 只适合：

- 尚未提供 Wrapper 的既有项目，并且工程基线已明确允许；
- 初始化或修复 Wrapper 的受控维护步骤；
- 诊断性兼容对照，且输出并留存 `mvn -v`；
- CI 镜像已经精确固定 Maven/JDK，项目合同又明确不用 Wrapper。

## 推荐的优先级模型

### 规范/证据优先级（建议作为 YSS 默认规则）

1. **`./mvnw`（Windows 为 `mvnw.cmd`）**：Wrapper 文件存在、配置合法时唯一默认入口。
2. **`mvn`（受控例外）**：Wrapper 不存在且工程登记明确允许，或用于创建/修复 Wrapper；必须记录 `mvn -v`、实际命令和例外原因。
3. **阻断而不是静默降级**：Wrapper 存在但损坏、下载/校验失败时，应修复供应链、镜像或 Wrapper 配置；不能自动换 `mvn`/`mvnd` 伪装为等价验证。

`mvnd` 不进入这条“自动 fallback 链”，因为它是另一种本机性能模式。

### 本地开发性能优先级（显式 opt-in）

1. **`mvnd` 可选加速**：仅当团队锁定 `mvnd` 版本/版本线、验证其内嵌 Maven 与项目基线兼容，并证明目标插件和 reactor 支持默认并行；否则显式使用 `-T1`。
2. **`./mvnw` 权威复核**：提交前、问题复现、审查证据和任何“完成”结论仍跑项目声明的 Wrapper 命令。
3. **`mvn` 诊断/例外**：不作为本地失败后的透明 fallback。

这是一种“双轨”而非单一排序：`mvnd` 可以缩短编辑循环，但 `./mvnw` 保持真相基线。

### CI / release / fresh verification 优先级

1. **`./mvnw`**。
2. 只有经单独基准测试、版本钉扎、daemon 生命周期隔离、并行安全验证及证据合同批准后，才允许特定 CI profile 使用 `mvnd`；该 profile 不能冒充 Wrapper 基线。
3. 只有在无 Wrapper 的登记例外中使用固定镜像内的 `mvn`，并输出 `mvn -v`。

## 对用户原提案的判断

不建议采用“`mvnd` → `mvnw` → `mvn`”作为全局命令查找优先级，原因如下：

1. 它把性能执行器放在项目可复现入口之前；机器是否安装 `mvnd` 会改变实际 Maven 版本与并行行为。
2. 它把失败降级理解成可替换关系；但 Wrapper 失败可能正是 checksum、镜像或版本合同问题，静默换入口会掩盖它。
3. 它无法让 CI、开发者和 Agent 从一条命令判断自己运行了哪套 Maven。

更好的契约是：

```text
canonical_build = ./mvnw
local_fast_loop = mvnd（显式 opt-in，验证兼容性后）
system_maven = mvn（无 Wrapper 或诊断时的受控例外）
```

若必须把它写成最短排序，应写成：**默认 `mvnw` 第一；`mvnd` 是并列的本地加速 profile，而非第二 fallback；裸 `mvn` 最后且需例外记录。**

## 最低治理与验证建议

- Wrapper：提交 `mvnw`、`mvnw.cmd`、`.mvn/wrapper/maven-wrapper.properties`；固定正式版 `distributionUrl`，配置 `distributionSha256Sum`，涉及 Wrapper JAR 时配置 `wrapperSha256Sum`。
- 环境：所有正式证据记录 `./mvnw --version`（或批准例外的 `mvn -v`）、JDK、OS/arch、settings/镜像来源摘要与命令退出码。
- `mvnd`：通过团队工具链或开发容器固定确切版本和 1.x/2.x 版本线；记录 `mvnd --version`；先对代表性 reactor 做串行等价性测试，再决定是否保留默认并行。
- CI：短生命周期 runner 默认不用 daemon；长驻 runner 若启用，显式隔离 daemon storage、生命周期和并发，失败时用 canonical Wrapper 命令复现。
- fallback：Wrapper 存在时，下载、checksum、权限或执行失败一律暴露为失败；不得自动切换执行器后仍把结果记作同一验证证据。

## 尚未确认项

- YSS 实际后端工程的 Maven/JDK 版本范围、插件线程安全清单和代表性 reactor 性能数据；本轮只做上游机制研究，未对产品工程跑基准。
- 企业 Maven repository manager 是否代理 Wrapper JAR 与 Maven distribution，以及对应 checksum 管理策略。
- 用户是否确实想表达 `mvnd`；若 `mvcd` 是内部命令，需要其官方/内部权威文档后重新比较。

## 结论

**建议保留 `./mvnw` 为 YSS 后端唯一默认和证据级入口；把 `mvnd` 作为经过兼容验证的本地开发 opt-in 加速器；把裸 `mvn` 限制为无 Wrapper、Wrapper 初始化/修复或诊断的受控例外。**

用户写的 `mvcd` 在 Apache Maven 官方工具链中不存在，最可能是 `mvnd` 的笔误。若确认是 `mvnd`，也不建议把它排在 `mvnw` 之前作为全局自动优先级。

## Workflow Execution Result

```yaml
result_schema: workflow-execution-result-v1
work_unit: template-source-upstream-research
workflow_reference: /root/maven_tool_research
result: completed
skill: research
changed_files:
  - .template-source/evidence/maintenance/research-maven-command-priority-2026-09-03.md
changed_artifacts:
  - .template-source/evidence/maintenance/research-maven-command-priority-2026-09-03.md
evidence_refs:
  - https://maven.apache.org/tools/wrapper/index.html
  - https://maven.apache.org/tools/mavenwrapper.html
  - https://maven.apache.org/install
  - https://maven.apache.org/tools/mvnd.html
  - https://github.com/apache/maven-mvnd
  - https://github.com/apache/maven-mvnd/blob/master/dist/src/main/distro/conf/mvnd.properties
actual_verification:
  - command: test -s .template-source/evidence/maintenance/research-maven-command-priority-2026-09-03.md
    exit_code: 0
  - command: rg -n 'mvcd|mvnd|mvnw|canonical_build|distributionSha256Sum' .template-source/evidence/maintenance/research-maven-command-priority-2026-09-03.md
    exit_code: 0
deferred_seams:
  - 真实 YSS 后端 reactor 的 mvnd 性能、并行安全与 Wrapper 等价性需实现仓专项验证。
  - 企业 Maven 镜像、Wrapper 下载与 checksum 策略待核实。
drift: []
violation: []
new_impacts:
  - 若采纳结论，后端命令选择、工程登记模板、skills、脚手架说明、CI 与验证证据合同需统一改为双轨模型。
stale_candidates: []
blocking_signals: []
next_route: template-source-decision-and-ssot-update
```
