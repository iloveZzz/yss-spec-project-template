## 推荐命令

```bash
node scripts/generate_and_verify_scaffold.mjs \
  --project-name my-service \
  --base-package com.yss.myservice \
  --group-id com.yss.datamiddle \
  --project-version 1.0.0-SNAPSHOT \
  --parent-group-id com.yss.datamiddle \
  --parent-artifact-id yss-datamiddle-parent \
  --parent-version 2.0.0-SNAPSHOT \
  --yss-components-version 2.0.0-SNAPSHOT \
  --output-dir /path/to/implementation-repo \
  --contract-id <approved-scaffold-contract-id> \
  --contract-version <current-version> \
  --approval-ref <lifecycle-approval-ref> \
  --compiler-draft-ref <compiler-draft-ref> \
  --persisted-ref <persisted-contract-ref> \
  --contract-file /path/to/persisted-scaffold-contract.json \
  --evidence-dir /path/to/evidence/scaffold
```

完成批准的 golden first slice 后运行：

```bash
node scripts/run_first_slice_verification.mjs \
  --project-root /path/to/implementation-repo/my-service \
  --slice-contract-file /path/to/approved-slice-contract.yaml \
  --contract-root /path/to/contract-repository \
  --approval-ref docs/approved-checkpoint.yaml \
  --evidence-dir /path/to/evidence/first-slice
```
