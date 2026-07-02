## ADDED Requirements

### Requirement: Single Architect Review
The system SHALL support one active review at a time for a model project and SHALL allow a single authorized architect to comment, approve, or reject the review.

#### Scenario: Submit review
- **WHEN** an authorized user submits a project draft that satisfies review preconditions
- **THEN** the system creates a review record, snapshots the submitted draft context, and exposes review detail, comments, and available actions

#### Scenario: Reject and resubmit review
- **WHEN** an authorized architect rejects a review with comments and the submitter later resubmits after changes
- **THEN** the system creates a new reviewId for the resubmission and preserves the rejected review history

#### Scenario: Approve review
- **WHEN** an authorized architect approves a review that still satisfies current validation and coverage preconditions
- **THEN** the system marks the review as approved and allows publish check to proceed

### Requirement: Publish Version Snapshot
The system SHALL publish approved model projects as immutable version snapshots and SHALL support version history and draft-from-version.

#### Scenario: Publish approved draft
- **WHEN** an authorized user publishes a reviewed project draft with passing publish check and current optimistic lock version
- **THEN** the system creates an immutable version snapshot, records publish metadata, and returns the version detail

#### Scenario: Preserve immutable version
- **WHEN** users modify the project draft after publish
- **THEN** the system does not mutate any previously published version snapshot

#### Scenario: Create draft from version
- **WHEN** an authorized user creates a new draft from a published version
- **THEN** the system copies the version snapshot into a draft workspace with new draft identity and version metadata

### Requirement: Asynchronous Export Assets
The system SHALL support asynchronous export of published versions to SQL DDL draft, Markdown, and Excel assets.

#### Scenario: Start export task
- **WHEN** an authorized user starts an export task for a published version and selected export type
- **THEN** the system creates an asynchronous export task and returns task id, status, and available actions

#### Scenario: Download completed export
- **WHEN** an export task completes successfully
- **THEN** the system returns a controlled download reference and export metadata without exposing unrestricted file paths

#### Scenario: Retry failed export
- **WHEN** an authorized user retries a retryable failed export task
- **THEN** the system creates or updates a retry attempt and preserves the failed attempt audit trail

### Requirement: Audit And Safety Confirmation
The system SHALL record audit events for commands that change project, model asset, mapping, validation, review, publish, version, import, export, and permission-relevant state.

#### Scenario: Record command audit event
- **WHEN** a command changes governed model state
- **THEN** the system records actor, action, target, result, request correlation, and time in the audit model

#### Scenario: Require human confirmation for safety redlines
- **WHEN** implementation touches authorization, file upload security, SQL/DDL draft generation, database migration, or raw SQL behavior
- **THEN** the issue or change MUST include TODO-HUMAN-REVIEW or equivalent approval evidence before completion
