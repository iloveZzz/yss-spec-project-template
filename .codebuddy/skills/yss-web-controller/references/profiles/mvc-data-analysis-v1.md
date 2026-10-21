# mvc-data-analysis-v1

遵守 `layered-mvc-service.md`，但用例接口位于 core，公开 DTO 位于 client。server 同时依赖 core 与 client 并持有转换；core 不得为了复用 HTTP DTO 而依赖 client。
