# 原始前后材料

## 修改前

```yaml
id: change.B
version: v1
acceptance:
  - 超时上限为 10 秒
basis:
  ref: old.yaml
  document_digest: sha256:1111111111111111111111111111111111111111111111111111111111111111
```

## 修改后

```yaml
id: change.B
version: v2
acceptance:
  - 超时上限为 20 秒
basis:
  ref: new.yaml
  document_digest: sha256:2222222222222222222222222222222222222222222222222222222222222222
```
