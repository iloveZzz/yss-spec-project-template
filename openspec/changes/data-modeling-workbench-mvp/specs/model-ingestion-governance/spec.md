## ADDED Requirements

### Requirement: Excel Import Physical Model Draft
The system SHALL support Excel import of existing physical table models into a model project draft with template download, alias discovery, preview, apply, cancel, idempotency, validation, and task status.

#### Scenario: Preview Excel import
- **WHEN** an authorized user uploads a supported Excel file for a draft model project
- **THEN** the system creates an import task, parses sheets into previewable physical tables and fields, reports validation issues, and does not mutate the model draft before apply

#### Scenario: Apply Excel import
- **WHEN** an authorized user applies a valid import preview with the current project version and idempotency key
- **THEN** the system writes imported physical tables and fields into the draft, records import results, and returns the updated project version

#### Scenario: Cancel import task
- **WHEN** an authorized user cancels a pending or previewed import task
- **THEN** the system marks the import task as canceled and prevents later apply for that task

### Requirement: Field Mapping And Coverage
The system SHALL support logical-to-physical field mappings, batch mapping updates, mapping coverage display, unmapped field prompts, and threshold evaluation.

#### Scenario: Update field mapping
- **WHEN** an authorized user maps logical fields to physical fields manually or in batch
- **THEN** the system persists the mapping draft, recalculates coverage, highlights unmapped fields, and returns the updated mapping version

#### Scenario: Evaluate coverage threshold
- **WHEN** mapping coverage is recalculated for a project
- **THEN** the system reports draft pass threshold at 80%, publish threshold at 85%, and P0 required field threshold at 95%

#### Scenario: Block publish readiness for insufficient coverage
- **WHEN** coverage is below the publish threshold or P0 required field threshold
- **THEN** publish readiness reports a blocking issue with unmapped or insufficiently mapped fields

### Requirement: Validation Rule Runs
The system SHALL support project-level validation rules and validation runs for naming, company field standards, code table reuse, mapping coverage, and publish readiness checks.

#### Scenario: Configure validation rules
- **WHEN** an authorized architect updates project validation rules with the current rule set version
- **THEN** the system persists the rule set and returns a new version without changing immutable published snapshots

#### Scenario: Run validation
- **WHEN** an authorized user starts a validation run for a model project
- **THEN** the system evaluates configured rules, returns summary counts by severity, and stores field-level and asset-level findings

#### Scenario: Display blocking validation issues
- **WHEN** validation produces P0 or publish-blocking issues
- **THEN** the system exposes the issues to the validation panel and publish check with actionable references to affected assets
