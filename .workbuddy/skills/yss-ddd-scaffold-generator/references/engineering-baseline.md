# 工程基线

读取目标工程或用户指定的 Java、Spring Boot、Maven Parent/BOM 与组件版本，沿用实际架构。新工程先明确项目名、包名、版本与输出目录；缺失的关键版本先调查或询问，不使用猜测的 latest。

DDD 模块与依赖方向见 ARCHITECTURE.md，MVC 见对应技能的架构说明。Agent 直接使用保留资产生成所需文件，不创建批准合同、来源 Manifest、测试证据或首切片资格。

默认仅生成骨架，业务示例和构建按当前请求选择。使用现有 Maven settings，不把凭据复制进项目。
