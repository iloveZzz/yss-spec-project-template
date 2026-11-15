# 生成器维护与历史资料

当前生成接口来自实际安装 CLI 的 `scaffold catalog`、`scaffold ddd --help` 和 `scaffold mvc --help`。维护入口、宿主元数据和示例时同时核对参数、产物与文件保护。

新目标须不存在，包括空目录。核对写入授权、符号链接和 Git 子模块边界，保留现装 CLI 的输入与兼容校验。旧工程继续增量维护。失败时按真实原因处理，保留已有文件与诊断结果。

历史合同、schema 与 Manifest 仅供理解既有记录和恢复审计，读取时标明所属版本。当前 CLI 生成空骨架、POM、机械启动配置、Maven Wrapper 和来源收据。教学 reference 资产保留其资料身份。
