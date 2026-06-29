# Automation And Standards

Use this reference for GitLab quality gates, static-analysis setup, and review standards.

## Standards To Apply

The source document names two primary review standards:

- Alibaba code conventions, especially for Java code.
- Sonar Way quality rules.

When reviewing Java code, combine this skill with `$alibaba-java-code-style` when available. Treat Sonar findings as signals, then validate impact manually.

## Tooling

Recommended local/static tools:

- SonarLint plugin.
- Alibaba Java coding rule plugin.
- SonarQube or equivalent quality management platform.

Recommended CI execution:

- Run static analysis through CI, such as GitLab Runner.
- Connect GitLab CI results to SonarQube quality reports.
- Record review results and progress in GitLab MR discussions or a tracking tool.

## GitLab CI With SonarQube

Use this high-level setup when asked to design or check automation:

1. Install and configure SonarQube server.
2. Configure SonarQube access permissions and credentials.
3. Add `.gitlab-ci.yml` to the project root.
4. Add a CI job that runs build, tests, coverage preparation, and Sonar analysis.
5. Configure GitLab project settings or webhooks to connect analysis results to SonarQube.
6. Trigger CI by pushing to GitLab.
7. Review SonarQube quality report before approving merge.

Example Maven job from the source document:

```yaml
sonarqube:
  image: maven:latest
  variables:
    SONAR_USER_HOME: "${CI_PROJECT_DIR}/.sonar"
  cache:
    key: "$CI_JOB_NAME"
    paths:
      - .sonar/cache
  script:
    - mvn clean org.jacoco:jacoco-maven-plugin:prepare-agent install sonar:sonar
  allow_failure: true
```

Adjust `allow_failure` to project policy. For strict gates, required quality jobs should not be allowed to fail silently.

## Gate Checklist

Before approving merge, confirm:

- MR targets the correct branch.
- Branch protection requires MR flow.
- At least one responsible reviewer approved.
- Required CI jobs passed or failures are explicitly accepted by a responsible human.
- Static-analysis findings are triaged.
- Required reviewer discussions are resolved.
- Developer replied to all blocking/major findings.
- Fixes have been re-reviewed after the latest push.

## Manual Review Checklist

Check beyond automated tooling:

- Product/requirement intent is preserved.
- Code does not add circular dependencies, nested dependencies, or unintended transitive dependency risk.
- Magic values are removed or justified.
- Layout, UI behavior, API contracts, and product behavior align with the change request.
- Security-sensitive paths have permission checks and input validation.
- Error handling and logs help diagnose failures.
- Tests cover important normal, boundary, and failure paths.
- Legacy debt is not expanded when the change touches that area.
