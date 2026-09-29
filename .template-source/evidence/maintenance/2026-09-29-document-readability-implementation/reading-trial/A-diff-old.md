# 原始前后材料

## 修改前

```yaml
id: change.A
version: v1
acceptance:
  - 重试上限为 3 次
basis:
  ref: old.yaml
  document_digest: sha256:1111111111111111111111111111111111111111111111111111111111111111
```

## 修改后

```yaml
id: change.A
version: v2
acceptance:
  - 重试上限为 5 次
basis:
  ref: new.yaml
  document_digest: sha256:2222222222222222222222222222222222222222222222222222222222222222
```
