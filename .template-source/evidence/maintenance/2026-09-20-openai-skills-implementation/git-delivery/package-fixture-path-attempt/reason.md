macOS tempfile 返回 /var 路径，而 /var 是符号链接；CLI 路径保护正确拒绝。验收 fixture 改为 resolve() 获取真实 /private/var 路径，产品代码及包内容不变。保留此次失败证据。
