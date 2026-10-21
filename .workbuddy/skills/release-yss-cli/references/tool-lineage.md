# 已验证工具与历史边界

只在缺少现行工具或需要对照 1.3.x 时读取。以下引用可从 GitHub 或本地 Git 对象获取，不依赖某台机器的临时目录；先固定完整提交，再检查当前输入合同。不要把历史版本号、源码 ref、二进制摘要、case 数量或收据复制到新版本。

## 可定位的实现

| 用途 | 已核验来源与入口 |
| --- | --- |
| 生产构建、来源刷新、装配合同 | `iloveZzz/yss-cli` 的 `c398eb50336283aacad6342e26176777a4e16c46`：`tools/build-candidate.mjs`、`tools/refresh-source-lock.mjs`、`tools/artifacts.mjs`、`tools/release/README.md`、`tools/package` |
| 双平台装配与 Windows runner | 同仓工具提交 `760c16dc1110587f2737301aae11f976bf8ce734`：`.release-tools/package-windows-candidate.py`、`.release-tools/windows-installation.py`、`.release-tools/release_qualification.py`、`.github/workflows/windows-release-1.3.7.yml` |
| 被移除的原生验收入口 | 同仓 `c1ea5abdd53315e06449296e9ab0d57fb9966f10`：`tools/native-smoke/`、`tools/native-recovery/`、`tools/plugin-native-smoke.mjs`；仅作为检查当前兼容性后的工具恢复来源 |
| 发行资格与真实公开资产 | [v1.3.6 Release](https://github.com/iloveZzz/yss-cli/releases/tag/v1.3.6)、[v1.3.7 Release](https://github.com/iloveZzz/yss-cli/releases/tag/v1.3.7) 的 checksums、逐平台原生收据、release-qualification、构建及安装证据 |

历史测试入口是可执行实现参考，不能恢复到生产 main 冒充本轮业务修改。仓库不再包含测试时，在独立工具 checkout 内按当前源码/接口/门禁适配；观察真实输出后生成本轮收据。安装、旧实例恢复及模板消费者回执必须满足当前装配器全部依赖要求；历史 Release 的已通过报告只能帮助识别 schema，不可改写身份重用。

## 适配 Windows 工具

上述工具分支是 **1.3.7 专用**，不是任意版本的一键发布器。先在新的工具工作区定位并审查：workflow 的固定生产 ref、版本/归档名称、candidate 包的 CLI SHA 校验、装配器的文档清单、source-lock/schema 与资格范围。只能替换本轮输入对应的值，不能全局替换数字或禁用不匹配校验。

先用新的最终 CLI SHA 构建 Windows 候选、执行原生安装检查。资格聚合器消费：原 Mac 正式包及其 checksums/原 gate、Windows 候选包及 checksums-trial、Windows 本轮原始安装报告/日志、原 gate 的依赖证据。它会重封装两平台 manifest 并形成共同 qualification；输出目录须全新，所有输入摘要须与独立记录相符。

`release_qualification.py` 的 CLI 形状为 `INPUT_DIR WINDOWS_EVIDENCE ORIGINAL_GATE_EVIDENCE NEW_OUTPUT_DIR`；目录内容以所固定版本实现为准。不能因为参数个数相同便假设 schema 一致。适配非平凡分支或解析逻辑时执行对应正/反例自检和独立审查；提交并固定工具 SHA 后再生成最终包，生产 tag 不指向工具提交。

Windows workflow 有两条路径：候选构建原生验收；传 `published_sha256` 后下载同版本正式包并执行在线安装验收。旧 workflow 内版本和 source ref 必须一并适配、提交后才可 dispatch，不能仅传新 SHA 却仍下载 1.3.7。

## 需要继续声明的历史限制

- 1.3.6/1.3.7 的 Windows 证明是程序安装资格，没有证明完整原生/插件、中断恢复、旧业务工程迁移、全模板回归或 NTFS ACL；受管只读文件替换/删除为 `UNPORTED`。新版本应以实测能力更新，不能永久沿抄。
- 1.3.7 Mac 原子克隆限同一支持克隆的 APFS 卷；跨卷和不支持克隆拒绝，旧未知/零字节临时文件仍受保护。改变恢复代码时必须重验真实中断窗口。
- 1.3.5 执行器不能解析新 `skillsSource`；已验证的升级方式是下载、校验新包，用其中执行器显式指定工具目录。不能推断所有历史版本都具有相同限制。
- Actions artifact 或大包下载超时须保留原尝试；有界续传需核验 Content-Range、总大小和 GitHub/发布 SHA-256 后再使用，不能将半包当失败测试证据或成功产物。
