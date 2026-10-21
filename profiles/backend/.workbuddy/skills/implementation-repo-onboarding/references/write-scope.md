# 实现仓库写范围核验

从只读接入进入已授权写入时读取。

写入前必须看 `inspectWorkingTreeScope` / `implementationWriteViolation`：只接受对象结果且 `.writable === true` 才可写；字符串、`null` 或 `.writable !== true` 一律不可写。即使已正确登记为 `git-submodule`，空 gitlink 或 detached HEAD 也必须 `.writable === false`，不得当普通目录写文件或脚手架。
