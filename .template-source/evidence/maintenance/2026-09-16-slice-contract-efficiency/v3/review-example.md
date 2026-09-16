# Slice slice.synthetic

权威合同：measurement.yaml · v3-pilot · sha256:f069d34bd8d2f3fe7f8389d8ea4aa769630ce08a77614e34cb204fde6f61a7ce

状态：ready-for-lifecycle-review；未核验；本视图不授予执行权限

## 要构建什么

提交完整材料并保存申请。

## 非目标

无新增审批规则。

## 验收标准

- [ ] AC-1 完整材料提交成功，缺失材料拒绝。

## 实施范围

工程：/synthetic/project-root/project

允许写入：src/main/java

## 验收

- AC-1: - [ ] AC-1 完整材料提交成功，缺失材料拒绝。

## 执行停止条件

来源或批准过期、越界、缺少证据、验证失败、drift / violation / new_impacts 时停止并回交。

<details><summary>完整工程约束与来源</summary>



```json

{
  "constraints": {
    "project_roots": [
      "/synthetic/project-root/project"
    ],
    "impacted_areas": [
      "backend",
      "api"
    ],
    "implementation_path_policy": "external-repository-native",
    "allowed_write_paths": [
      "src/main/java"
    ],
    "forbidden_patterns": [
      "不得绕过持久化约束"
    ],
    "full_reroute_triggers": [
      "scaffold-baseline-drift",
      "scaffold-architecture-decision-changed",
      "scaffold-profile-changed",
      "scaffold-module-resolution-changed",
      "api-schema-impact",
      "database-schema-impact",
      "state-machine-impact",
      "visual-baseline-version-or-digest-changed",
      "data-model-impact",
      "new-write-path",
      "new-repository",
      "aggregate-impact",
      "invariant-impact",
      "consistency-impact",
      "domain-event-impact",
      "gateway-boundary-impact",
      "persistence-mapping-impact",
      "new-required-skill",
      "not-applicable-invalidated",
      "architecture-drift",
      "contract-violation",
      "generation-became-behavior",
      "test-seam-changed",
      "verification-command-changed",
      "delivery-order-changed",
      "doubt-review-triggered"
    ],
    "required_capabilities": [
      "layer.mvc-service",
      "quality.java-code-style",
      "layer.mvc-web",
      "contract.dto-wire",
      "contract.request-validation",
      "contract.error-mapping",
      "codegen.mapstruct",
      "codegen.lombok"
    ],
    "required_skills": [
      "alibaba-java-code-style",
      "yss-application",
      "yss-dto",
      "yss-web-controller",
      "yss-validation",
      "yss-exception",
      "mapstruct",
      "lombok"
    ],
    "verification_commands": [
      "./mvnw test"
    ],
    "expected_evidence_files": [
      "results/test.log"
    ],
    "quality_baseline_ref": "baseline.json"
  },
  "extensions": {
    "frontend": {
      "status": "not-applicable"
    },
    "backend": {
      "status": "required",
      "affected_layers": [
        "application",
        "web"
      ],
      "component_impacts": [],
      "design_refs": [
        "pointer:/design"
      ]
    },
    "api": {
      "api_impact": true,
      "freeze_ref": "api.yaml",
      "contract_tests": [
        "test-seam.success",
        "test-seam.failure"
      ]
    },
    "cross_repo": {}
  },
  "sources": {
    "spec": {
      "ref": "spec.md",
      "digest": "sha256:18122d27858728b87d577ce6c3790e02618bfe9eb5d5096086676570398ef598"
    },
    "engineering_baseline": {
      "ref": "baseline.json",
      "digest": "sha256:0b55cbf1a8e5c35914b50df3ccbd2515cd767492f2687000634483988673bff4",
      "version": "v1"
    },
    "implementation_repository": {
      "ref": "registration.json",
      "digest": "sha256:ace1088a8cd6c882debce37f56fdbb61c9b11ab32b02ac160ab76521c55ec89c"
    },
    "repository_registration": {
      "ref": "registration.json",
      "digest": "sha256:ace1088a8cd6c882debce37f56fdbb61c9b11ab32b02ac160ab76521c55ec89c"
    },
    "manifest": {
      "ref": "manifest.json",
      "digest": "sha256:8c3f4898eeb33f70d60fb21829f56bcfd9f381dfb097050e004bce6b3e5d7503"
    },
    "technical_design": {
      "ref": "technical-design.json",
      "digest": "sha256:e490cb4b0d87e9801d8be03eb560b39a728dc6c2a3a419d79833910670933d56",
      "version": "v1",
      "approval_ref": "technical-approval.json"
    },
    "architecture_review": {
      "ref": "review.json",
      "digest": "sha256:3ea0e4ca32453a2c6e280d61d19da90a77c932813512c777df4986da3050bd8e"
    },
    "build_architecture_checklist": {
      "ref": "review.md",
      "digest": "sha256:ea93a72ed89ef194603aed7c940fbe90deab5dd2f5fd73229078cdf44581f258"
    },
    "backend_repository": {
      "ref": "registration.json",
      "digest": "sha256:ace1088a8cd6c882debce37f56fdbb61c9b11ab32b02ac160ab76521c55ec89c"
    },
    "maven_wrapper": {
      "ref": "project/mvnw",
      "digest": "sha256:c51c565c4ddf606df3aeedb9b2ccf167afbea8ae825c6898d9b7f60997751f41"
    },
    "openapi_freeze": {
      "ref": "api.yaml",
      "digest": "sha256:e4babca58a91aa7cb9995962728bcdfd5760ca2f8cc38da5ae71490b06d39ab9"
    },
    "ticket": {
      "ref": "tickets/synthetic.md",
      "digest": "sha256:4acecd0bda737ec5a3cc70704886209a4605b44bcb9d956ecb95a824cf6ad73f"
    },
    "context": {
      "ref": "CONTEXT.md",
      "digest": "sha256:ab61cfee98562b4ecb967d690913b0201f246e62ba7037326c912991afa74625"
    }
  }
}

```

</details>